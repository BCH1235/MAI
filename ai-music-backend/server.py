import os
import uuid
import time
import threading
import subprocess
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Optional, List

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import replicate
from music21 import converter
from midi2audio import FluidSynth

# ───── env ──────────────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

REPLICATE_TOKEN = os.getenv("REPLICATE_API_TOKEN")
MODEL_SLUG = os.getenv("REPLICATE_MODEL", "meta/musicgen")
client = replicate.Client(api_token=REPLICATE_TOKEN) if REPLICATE_TOKEN else None

PAPAGO_CLIENT_ID = os.getenv("PAPAGO_CLIENT_ID")
PAPAGO_CLIENT_SECRET = os.getenv("PAPAGO_CLIENT_SECRET")

# ───── Flask app ────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
OUTPUT_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outputs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

STATIC_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
os.makedirs(STATIC_FOLDER, exist_ok=True)

fluidsynth_executable_path = r'C:\Program Files\FluidSynth\bin'
if fluidsynth_executable_path not in os.environ['PATH']:
    os.environ['PATH'] += os.pathsep + fluidsynth_executable_path

# ───── in-memory task 관리 ───────────────────────────────────────────
TASKS: Dict[str, Dict[str, Any]] = {}

def _set_task_status(task_id: str, status: str, **kwargs):
    TASKS[task_id] = {"status": status, **kwargs}

# ───── Papago 번역 API ───────────────────────────────────────────
def translate_to_english(text: str) -> str:
    """Papago API를 사용하여 한국어 텍스트를 영어로 번역하는 함수"""
    # --- [디버깅 로그] ---
    print("\n--- Papago 번역 시작 ---")
    print(f"[Papago] 원본 텍스트: '{text}'")
    
    if not all([PAPAGO_CLIENT_ID, PAPAGO_CLIENT_SECRET]):
        print("[Papago] Papago API 키가 설정되지 않아 번역을 건너뜁니다.")
        print("--- Papago 번역 종료 ---\n")
        return text
    if not text or not text.strip():
        print("[Papago] 입력 텍스트가 비어있어 번역을 건너뜁니다.")
        print("--- Papago 번역 종료 ---\n")
        return text

    try:
        import requests
        url = "https://papago.apigw.ntruss.com/nmt/v1/translation"
        headers = {
            "X-NCP-APIGW-API-KEY-ID": PAPAGO_CLIENT_ID,
            "X-NCP-APIGW-API-KEY": PAPAGO_CLIENT_SECRET,
        }
        data = {"source": "ko", "target": "en", "text": text}
        
        print("[Papago] API 서버로 번역을 요청합니다...")
        response = requests.post(url, headers=headers, data=data, timeout=5)
        
        if response.status_code != 200:
            print(f"[Papago Error] API가 오류를 반환했습니다. 상태 코드: {response.status_code}")
            print(f"[Papago Error] 응답 내용: {response.text}")
            print("--- Papago 번역 종료 ---\n")
            return text

        result = response.json()
        translated_text = result.get("message", {}).get("result", {}).get("translatedText")
        
        if translated_text:
            print(f"[Papago] ✨ 번역 성공! ✨ -> '{translated_text}'")
            print("--- Papago 번역 종료 ---\n")
            return translated_text
        
        print("[Papago] 번역된 텍스트를 찾을 수 없어 원본을 반환합니다.")
        print("--- Papago 번역 종료 ---\n")
        return text

    except ImportError:
        print("[Papago] 'requests' 라이브러리가 설치되지 않아 번역을 건너뜁니다.")
        return text
    except Exception as e:
        print(f"[Papago Error] 알 수 없는 오류: {e}")
        print("--- Papago 번역 종료 ---\n")
        return text

# ───── Replicate AI 음악 생성 ───────────────────────────────────────
def mk_result(audio_url: str, title="AI_Track",
              genres: Optional[List[str]] = None,
              moods: Optional[List[str]] = None,
              duration: int = 10, kind: str = "generated"):
    return {
        "id": str(uuid.uuid4()),
        "title": title,
        "genres": genres or [],
        "moods": moods or [],
        "duration": duration,
        "audioUrl": audio_url,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "type": kind,
    }

def _extract_audio_url(output: Any) -> Optional[str]:
    def as_url(v: Any) -> Optional[str]:
        if isinstance(v, str) and v.startswith("http"): return v
        try:
            u = getattr(v, "url", None)
            if isinstance(u, str) and u.startswith("http"): return u
        except Exception:
            pass
        return None

    u = as_url(output)
    if u: return u
    if isinstance(output, (list, tuple)):
        for item in output:
            u = as_url(item)
            if u: return u
    if isinstance(output, dict):
        for key in ("audioUrl", "audio_url", "url", "audio", "output"):
            if key in output:
                u = as_url(output[key])
                if u: return u
        files = output.get("files")
        if isinstance(files, list):
            for f in files:
                if isinstance(f, dict):
                    u = as_url(f.get("url"))
                    if u: return u
                else:
                    u = as_url(f)
                    if u: return u
        for parent in ("result", "data", "prediction"):
            if parent in output:
                u = _extract_audio_url(output[parent])
                if u: return u
    return None

def _run_replicate(input_dict: Dict[str, Any]) -> str:
    if not client:
        raise RuntimeError("No Replicate token loaded from .env")
    out = client.run(MODEL_SLUG, input=input_dict)
    url = _extract_audio_url(out)
    if not url:
        raise RuntimeError(f"Replicate returned no audio URL. raw={out}")
    return url

def worker_generate(task_id: str, prompt: str, genres, moods, duration: int,
                    tmp_path: Optional[str]):
    try:
        _set_task_status(task_id, "running")
        inputs: Dict[str, Any] = {
            "prompt": prompt or "instrumental background music",
            "duration": duration,
            "output_format": "mp3",
            "normalization_strategy": "peak",
        }
        if tmp_path:
            with open(tmp_path, "rb") as f:
                data = f.read()
            bio = BytesIO(data)
            setattr(bio, "name", os.path.basename(tmp_path))
            bio.seek(0)
            inputs["input_audio"] = bio
            inputs["continuation"] = False

        audio_url = _run_replicate(inputs)
        res = mk_result(audio_url, "AI_Generated_Track", genres, moods, duration, "generated")
        _set_task_status(task_id, "succeeded", result=res, audioUrl=res["audioUrl"])
    except Exception as e:
        print("[worker_generate] ERROR:", repr(e))
        _set_task_status(task_id, "failed", error=str(e))
    finally:
        if tmp_path:
            try: os.remove(tmp_path)
            except: pass

# ───── PDF → MusicXML → MIDI/WAV/MP3 변환 ─────────────────────────
@app.route('/api/process-score', methods=['POST'])
def process_score():
    if 'score' not in request.files:
        return jsonify({'message': '악보 파일이 없습니다.'}), 400
    
    uploaded_file = request.files['score']

    if uploaded_file.filename == '':
        return jsonify({'message': '파일이 선택되지 않았습니다.'}), 400

    if uploaded_file and uploaded_file.filename.endswith('.pdf'):
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        audiveris_dir = os.path.join(backend_dir, 'app-5.7.1')
        upload_folder = os.path.join(backend_dir, 'temp_scores')
        midi_folder = os.path.join(backend_dir, 'generated_midi')
        os.makedirs(upload_folder, exist_ok=True)
        os.makedirs(midi_folder, exist_ok=True)
        
        unique_filename = str(uuid.uuid4())
        pdf_path = os.path.join(upload_folder, f"{unique_filename}.pdf")
        uploaded_file.save(pdf_path)

        audiveris_script = os.path.join(audiveris_dir, 'bin', 'Audiveris.bat' if os.name == 'nt' else 'Audiveris')

        try:
            print(f"Audiveris 실행 시작: {pdf_path}")
            result = subprocess.run(
                [
                    audiveris_script,
                    '-batch',
                    '-export',
                    '-output', upload_folder,
                    pdf_path
                ],
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=180
            )
            print("Audiveris 실행 완료")
            
            if result.returncode != 0:
                print("----- Audiveris Stderr -----")
                print(result.stderr)
                print("----- Audiveris Stdout -----")
                print(result.stdout)
                raise subprocess.CalledProcessError(result.returncode, result.args, result.stdout, result.stderr)

            base_pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
            music_file_path = os.path.join(upload_folder, f"{base_pdf_name}.mxl")
            
            if not os.path.exists(music_file_path):
                 raise FileNotFoundError("MusicXML 파일이 변환 후 생성되지 않았습니다.")

        except subprocess.TimeoutExpired:
            return jsonify({'message': '악보 변환 작업이 너무 오래 걸려 중단되었습니다.'}), 500
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            return jsonify({'message': f'PDF를 MusicXML로 변환하는데 실패했습니다: {e}'}), 500

        try:
            score = converter.parse(music_file_path)
            
            midi_filename = f"{unique_filename}.mid"
            midi_path = os.path.join(midi_folder, midi_filename)
            
            try:
                expanded_score = score.expandRepeats()
                expanded_score.write('midi', fp=midi_path)
            except Exception:
                score.write('midi', fp=midi_path)

            wav_filename = f"{unique_filename}.wav"
            wav_path = os.path.join(midi_folder, wav_filename)
            
            fs = FluidSynth(sound_font=r'C:\soundfonts\FluidR3_GM.sf2')
            fs.midi_to_audio(midi_path, wav_path)
            
            audio_url = f"http://127.0.0.1:5000/api/audio/{wav_filename}"
            duration = int(score.duration.quarterLength) 

            result_data = {
                "id": unique_filename,
                "title": f"악보 연주 - {uploaded_file.filename}",
                "audioUrl": audio_url,
                "genres": ["Classical"],
                "moods": [],
                "duration": duration,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "type": "score-audio"
            }

            task_id = uuid.uuid4().hex
            _set_task_status(task_id, "succeeded", result=result_data, audioUrl=audio_url)
            
            return jsonify({'taskId': task_id})

        except Exception as e:
            return jsonify({'message': f'오디오 변환 중 오류가 발생했습니다: {e}'}), 500
        finally:
            if 'pdf_path' in locals() and os.path.exists(pdf_path): os.remove(pdf_path)
            if 'music_file_path' in locals() and os.path.exists(music_file_path): os.remove(music_file_path)

    return jsonify({'message': '잘못된 파일 형식입니다.'}), 400

# ───── 오디오 서빙 ────────────────────────────────────────────────
@app.route('/api/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    
    possible_paths = [
        os.path.join(backend_dir, 'generated_midi', filename),
        os.path.join(OUTPUT_FOLDER, filename),
        os.path.join(STATIC_FOLDER, filename)
    ]
    
    for audio_path in possible_paths:
        if os.path.exists(audio_path):
            return send_file(audio_path)
    
    return jsonify({'error': '파일이 존재하지 않습니다.'}), 404

# ───── AI 음악 생성 엔드포인트 ─────────────────────────────────────
@app.route("/api/music/generate", methods=["POST"])
def generate_music():
    ct = (request.content_type or "")
    is_multipart = ct.startswith("multipart/form-data")

    if is_multipart:
        data = request.form
        up = request.files.get("file")
    else:   
        data = request.get_json(force=True, silent=True) or {}
        up = None

    import json
    def as_list(v):
        if v is None: return []
        if isinstance(v, list): return v
        if isinstance(v, str):
            try: return json.loads(v)
            except: return [v] if v else []
        return []

    prompt = data.get("description") or "instrumental background music"
    genres = as_list(data.get("genres"))
    moods = as_list(data.get("moods"))
    try: duration = int(data.get("duration") or 10)
    except: duration = 10

    tmp_path = None
    if up:
        os.makedirs("tmp", exist_ok=True)
        safe = secure_filename(up.filename or f"audio_{uuid.uuid4().hex}.wav")
        tmp_path = os.path.join("tmp", f"{uuid.uuid4().hex}_{safe}")
        up.save(tmp_path)

    task_id = uuid.uuid4().hex
    _set_task_status(task_id, "queued")
    threading.Thread(target=worker_generate,
                     args=(task_id, prompt, genres, moods, duration, tmp_path),
                     daemon=True).start()
    return jsonify({"taskId": task_id})

@app.route("/api/music/task/status", methods=["GET"])
def task_status():
    task_id = request.args.get("task_id") or request.args.get("taskId")
    task = TASKS.get(task_id)
    if not task:
        return jsonify({"status": "failed", "error": "Unknown task"}), 404
    return jsonify({
        "taskId": task_id,
        "status": task.get("status"),
        "audioUrl": task.get("audioUrl"),
        "result": task.get("result"),
        "error": task.get("error"),
    })

# ───── 서버 실행 ─────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)