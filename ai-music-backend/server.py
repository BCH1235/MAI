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
        url = "https://papago.apigw.ntruss.com/nmt/v1/translation"
        headers = {
            "X-NCP-APIGW-API-KEY-ID": PAPAGO_CLIENT_ID,
            "X-NCP-APIGW-API-KEY": PAPAGO_CLIENT_SECRET,
        }
        data = {"source": "ko", "target": "en", "text": text}
        
        # --- [디버깅 로그] ---
        print("[Papago] API 서버로 번역을 요청합니다...")
        response = requests.post(url, headers=headers, data=data, timeout=5)
        
        if response.status_code != 200:
            # --- [디버깅 로그] ---
            print(f"[Papago Error] API가 오류를 반환했습니다. 상태 코드: {response.status_code}")
            print(f"[Papago Error] 응답 내용: {response.text}")
            print("--- Papago 번역 종료 ---\n")
            return text # 오류 시 원본 텍스트 반환

        result = response.json()
        translated_text = result.get("message", {}).get("result", {}).get("translatedText")
        
        if translated_text:
            # --- [디버깅 로그] ---
            print(f"[Papago] ✨ 번역 성공! ✨ -> '{translated_text}'")
            print("--- Papago 번역 종료 ---\n")
            return translated_text
        
        # --- [디버깅 로그] ---
        print("[Papago] 번역된 텍스트를 찾을 수 없어 원본을 반환합니다.")
        print("--- Papago 번역 종료 ---\n")
        return text

    except requests.exceptions.RequestException as e:
        print(f"[Papago Error] API 요청 실패: {e}")
        print("--- Papago 번역 종료 ---\n")
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
        # --- 1. 경로 설정 ---
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        upload_folder = os.path.join(backend_dir, 'temp_scores')
        midi_folder = os.path.join(backend_dir, 'generated_midi')
        os.makedirs(upload_folder, exist_ok=True)
        os.makedirs(midi_folder, exist_ok=True)
        
        unique_filename = str(uuid.uuid4())
        pdf_path = os.path.join(upload_folder, f"{unique_filename}.pdf")
        uploaded_file.save(pdf_path)

        # --- 2. Audiveris 실행 경로 설정 ---
        audiveris_jar_path = r"C:\Program Files\Audiveris\app"
        java_executable = r"C:\Program Files\Audiveris\runtime\bin\java"

        try:
            # --- 3. Audiveris 실행 (PDF -> MusicXML) ---
            print(f"Audiveris 실행 시작: {pdf_path}")
            print(f"Audiveris jar 경로: {audiveris_jar_path}")
            
            jar_files = []
            for file_name in os.listdir(audiveris_jar_path):
                if file_name.endswith('.jar'):
                    jar_files.append(os.path.join(audiveris_jar_path, file_name))
            
            classpath = ';'.join(jar_files)
            print(f"클래스패스에 {len(jar_files)}개 JAR 파일 추가")
            
            result = subprocess.run(
                [
                    java_executable,
                    '-cp', classpath,
                    '-Djava.awt.headless=true',
                    '-Xmx2g',
                    '-Duser.language=en',
                    '-Duser.country=US',
                    'org.audiveris.omr.Main',
                    '-batch',
                    '-export',
                    '-output', upload_folder,
                    pdf_path
                ],
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=1800
            )

            print("Audiveris 실행 완료")

            if result.returncode != 0:
                print("----- Audiveris Stderr -----")
                print(result.stderr)
                print("----- Audiveris Stdout -----")
                print(result.stdout)
                
                if "UnsupportedClassVersionError" in result.stderr or "Preview features" in result.stderr:
                    raise subprocess.CalledProcessError(result.returncode, result.args, result.stdout, result.stderr)
                elif "No installed OCR languages" in result.stdout:
                    print("OCR 언어 패키지가 없지만 악보 인식은 계속 진행합니다.")
                else:
                    raise subprocess.CalledProcessError(result.returncode, result.args, result.stdout, result.stderr)

            # --- 4. 변환된 MusicXML 파일 찾기 ---
            print(f"출력 폴더 내용 확인: {os.listdir(upload_folder)}")
            
            base_pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
            possible_extensions = ['.mxl', '.xml', '.musicxml']
            music_file_path = None
            
            for ext in possible_extensions:
                potential_path = os.path.join(upload_folder, f"{base_pdf_name}{ext}")
                if os.path.exists(potential_path):
                    music_file_path = potential_path
                    print(f"변환된 파일 발견: {music_file_path}")
                    break
            
            if not music_file_path:
                for file_item in os.listdir(upload_folder):
                    if any(file_item.endswith(ext) for ext in possible_extensions):
                        music_file_path = os.path.join(upload_folder, file_item)
                        print(f"폴더 검색으로 발견된 파일: {music_file_path}")
                        break
            
            if not music_file_path or not os.path.exists(music_file_path):
                raise FileNotFoundError("MusicXML 파일이 변환 후 생성되지 않았습니다.")

        except subprocess.TimeoutExpired:
            print("!!! Audiveris 실행 시간 초과 !!!")
            return jsonify({'message': '악보 변환 작업이 너무 오래 걸려 중단되었습니다.'}), 500
        except subprocess.CalledProcessError as e:
            return jsonify({'message': 'PDF를 MusicXML로 변환하는데 실패했습니다.'}), 500
        except FileNotFoundError as e:
            print(f"파일을 찾을 수 없습니다: {e}")
            return jsonify({'message': '변환된 MusicXML 파일을 찾을 수 없습니다.'}), 500

        # --- 5. MusicXML -> WAV 변환 (반복 기호 오류 처리) ---
        try:
            print(f"Music21로 파일 파싱 시작: {music_file_path}")
            score = converter.parse(music_file_path)
            
            # MIDI 파일 생성
            midi_filename = f"{unique_filename}.mid"
            midi_path = os.path.join(midi_folder, midi_filename)
            
            print(f"MIDI 파일 생성 중: {midi_path}")
            
            # 반복 기호 처리 시도
            try:
                # 1차 시도: 반복 기호 확장
                expanded_score = score.expandRepeats()
                expanded_score.write('midi', fp=midi_path)
                print(f"MIDI 파일 생성 완료 (반복 확장): {midi_path}")
            except Exception as repeat_error:
                print(f"반복 확장 실패: {repeat_error}")
                try:
                    # 2차 시도: 반복 기호 무시하고 생성
                    print("반복 기호를 제거하고 다시 시도합니다...")
                    
                    # 모든 반복 기호 제거
                    for part in score.parts:
                        for measure in part.getElementsByClass('Measure'):
                            # 반복 기호 제거
                            for repeat in measure.getElementsByClass('Repeat'):
                                measure.remove(repeat)
                            for barline in measure.getElementsByClass('Barline'):
                                if barline.type in ['regular', 'final']:
                                    continue
                                measure.remove(barline)
                    
                    score.write('midi', fp=midi_path)
                    print(f"MIDI 파일 생성 완료 (반복 제거): {midi_path}")
                except Exception as fallback_error:
                    print(f"반복 제거 후에도 실패: {fallback_error}")
                    # 3차 시도: flatten으로 단순화
                    try:
                        print("악보를 단순화하여 다시 시도합니다...")
                        flat_score = score.flatten()
                        flat_score.write('midi', fp=midi_path)
                        print(f"MIDI 파일 생성 완료 (단순화): {midi_path}")
                    except Exception as final_error:
                        print(f"모든 변환 시도 실패: {final_error}")
                        raise Exception(f"MIDI 변환 실패: {final_error}")
            
            # WAV 파일로 변환
            wav_filename = f"{unique_filename}.wav"
            wav_path = os.path.join(midi_folder, wav_filename)
            
            try:
                print(f"WAV 파일 변환 중: {wav_path}")
                fs = FluidSynth(sound_font=r'C:\soundfonts\FluidR3_GM.sf2')
                fs.midi_to_audio(midi_path, wav_path)
                print(f"WAV 파일 생성 완료: {wav_path}")
                
                audio_url = f"http://127.0.0.1:5000/api/audio/{wav_filename}"
                audio_path = wav_path
            except Exception as e:
                print(f"FluidSynth 변환 실패: {e}")
                import traceback
                traceback.print_exc()
                print("MIDI 파일을 그대로 사용합니다")
                audio_url = f"http://127.0.0.1:5000/api/audio/{midi_filename}"
                audio_path = midi_path
            
            # 곡 길이 계산
            try:
                if score.metronomeMarkBoundaries():
                    tempo = score.metronomeMarkBoundaries()[0][-1].number
                    duration = int(score.duration.quarterLength / tempo * 60)
                else:
                    duration = 180
            except:
                duration = 180

            # 결과 데이터 생성
            result_data = {
                "id": unique_filename,
                "title": f"악보 연주 - {uploaded_file.filename}",
                "audioUrl": audio_url,
                "audioPath": audio_path,
                "genres": ["Classical"],
                "moods": [],
                "duration": duration,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "type": "score-audio"
            }

            print(f"오디오 파일 준비 완료: {result_data}")
            
            # Task ID 생성 및 저장
            task_id = uuid.uuid4().hex
            _set_task_status(task_id, "succeeded", result=result_data, audioUrl=audio_url)
            print(f"Task ID 생성: {task_id}")

        except Exception as e:
            print(f"오디오 변환 오류: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'message': f'오디오 변환 중 오류가 발생했습니다: {str(e)}'}), 500

        finally:
            # 임시 파일 정리
            try:
                os.remove(pdf_path)
                if music_file_path and os.path.exists(music_file_path):
                    os.remove(music_file_path)
                for file_item in os.listdir(upload_folder):
                    if file_item.endswith(('.log', '.omr')):
                        try:
                            os.remove(os.path.join(upload_folder, file_item))
                        except:
                            pass
            except Exception as cleanup_error:
                print(f"파일 정리 중 오류: {cleanup_error}")
        
        # taskId 반환 (다른 API와 동일한 형식)
        return jsonify({
            'taskId': task_id
        })

    return jsonify({'message': '잘못된 파일 형식입니다.'}), 400

# ───── 오디오 서빙 ────────────────────────────────────────────────
@app.route('/api/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    # 여러 폴더에서 파일 찾기
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    
    possible_paths = [
        os.path.join(backend_dir, 'generated_midi', filename),  # 악보 변환 파일
        os.path.join(OUTPUT_FOLDER, filename),                   # AI 생성 파일
        os.path.join(STATIC_FOLDER, filename)                    # 기타 파일
    ]
    
    for audio_path in possible_paths:
        if os.path.exists(audio_path):
            print(f"파일 제공: {audio_path}")
            return send_file(audio_path)
    
    print(f"파일을 찾을 수 없음: {filename}")
    print(f"검색한 경로들:")
    for path in possible_paths:
        print(f"  - {path} (존재: {os.path.exists(path)})")
    
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