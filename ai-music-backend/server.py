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

# ───── Flask app ────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
OUTPUT_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outputs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# ───── in-memory task 관리 ───────────────────────────────────────────
TASKS: Dict[str, Dict[str, Any]] = {}

def _set_task_status(task_id: str, status: str, **kwargs):
    TASKS[task_id] = {"status": status, **kwargs}

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
AUDIVERIS_JAR_PATH = r"C:\Program Files\Audiveris\app"
JAVA_EXECUTABLE = "java"
SOUNDFONT_PATH = r"C:\Program Files\FluidSynth\soundfonts\FluidR3_GM.sf2"

@app.route('/api/process-score', methods=['POST'])
def process_score():
    uploaded_file = request.files.get('file')
    output_format = request.form.get('format', 'midi')

    if not uploaded_file:
        return jsonify({'error': '파일이 업로드되지 않았습니다.'}), 400

    unique_filename = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_FOLDER, f"{unique_filename}.pdf")
    uploaded_file.save(input_path)

    # 1️⃣ Audiveris 실행
    try:
        jar_files = [os.path.join(AUDIVERIS_JAR_PATH, f) for f in os.listdir(AUDIVERIS_JAR_PATH) if f.endswith('.jar')]
        classpath = ";".join(jar_files)
        subprocess.run([
            JAVA_EXECUTABLE,
            "-cp", classpath,
            "-Djava.awt.headless=true",
            "-Xmx2g",
            "-Duser.language=en",
            "-Duser.country=US",
            "org.audiveris.omr.Main",
            "-batch",
            "-export",
            "-output", OUTPUT_FOLDER,
            input_path
        ], check=True)
    except subprocess.CalledProcessError as e:
        return jsonify({'error': f'Audiveris 변환 실패: {str(e)}'}), 500

    # 2️⃣ MusicXML → MIDI
    try:
        musicxml_path = os.path.join(OUTPUT_FOLDER, f"{unique_filename}.musicxml")
        score = converter.parse(musicxml_path)
        midi_path = os.path.join(OUTPUT_FOLDER, f"{unique_filename}.mid")
        score.write('midi', fp=midi_path)
    except Exception as e:
        return jsonify({'error': f'MusicXML → MIDI 변환 실패: {str(e)}'}), 500

    # 3️⃣ MIDI → WAV/MP3
    output_file = midi_path
    if output_format in ['wav', 'mp3']:
        wav_path = os.path.join(OUTPUT_FOLDER, f"{unique_filename}.wav")
        try:
            fs = FluidSynth(SOUNDFONT_PATH)
            fs.midi_to_audio(midi_path, wav_path)
            if output_format == 'mp3':
                mp3_path = os.path.join(OUTPUT_FOLDER, f"{unique_filename}.mp3")
                subprocess.run(["ffmpeg", "-y", "-i", wav_path, mp3_path],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                output_file = mp3_path
            else:
                output_file = wav_path
        except Exception as e:
            return jsonify({'error': f'{output_format.upper()} 변환 실패: {str(e)}'}), 500

    return jsonify({'success': True, 'file': os.path.basename(output_file)})

# ───── 오디오 서빙 ────────────────────────────────────────────────
@app.route('/api/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    audio_path = os.path.join(OUTPUT_FOLDER, filename)
    if not os.path.exists(audio_path):
        return jsonify({'error': '파일이 존재하지 않습니다.'}), 404
    return send_file(audio_path)

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
