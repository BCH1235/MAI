// src/services/musicApi.js

const IN_PROGRESS = new Set(['queued', 'running', 'processing', 'starting', 'pending']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 기본값은 5000포트. .env에 REACT_APP_API_BASE_URL 있으면 그걸 사용합니다. :contentReference[oaicite:5]{index=5}
const API_BASE = (process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000/api').replace(/\/$/, '');

function pickStatus(j) {
  const candidates = [ j?.status, j?.state, j?.task_status, j?.taskStatus, j?.prediction?.status, j?.data?.status ];
  const raw = candidates.find((v) => v != null) ?? '';
  return String(raw).toLowerCase();
}

function pickAudioUrl(j) {
  const candidates = [
    j?.audioUrl, j?.audio_url, j?.url,
    j?.result?.audioUrl, j?.result?.audio_url, j?.result?.url, j?.result?.audio,
    j?.data?.audioUrl, j?.data?.audio_url, j?.data?.url, j?.data?.audio,
    j?.prediction?.output,
    j?.output,
    j?.files
  ];
  let out = candidates.find((v) => v != null);
  if (Array.isArray(out)) out = out[0];
  if (out && typeof out === 'object') {
    if (typeof out.url === 'string') out = out.url;
    else if (typeof out.audio === 'string') out = out.audio;
    else if (Array.isArray(out.output)) out = out.output[0];
  }
  if (typeof out === 'string') return out;
  return undefined;
}

/**
 * 파일이 있으면 multipart/form-data, 없으면 JSON으로 호출
 * payload: { description, genres, moods, duration }
 * file: File | null
 */
export async function generateAndWait(payload, onStatus, file = null) {
  let genRes;
  if (file) {
    const fd = new FormData();
    fd.append('description', payload.description || '');
    fd.append('genres', JSON.stringify(payload.genres || []));
    fd.append('moods', JSON.stringify(payload.moods || []));
    fd.append('duration', String(payload.duration || 10));
    fd.append('file', file);
    genRes = await fetch(`${API_BASE}/music/generate`, { method: 'POST', body: fd });
  } else {
    genRes = await fetch(`${API_BASE}/music/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  if (!genRes.ok) throw new Error(`Generate failed: ${genRes.status} ${await genRes.text()}`);
  const genJson = await genRes.json();

  const taskId = genJson.task_id || genJson.taskId || genJson.id;
  if (!taskId) throw new Error('No task id from server');

  // 상태 폴링 (기존 구현과 동일 — /api/music/task/status?task_id=...) :contentReference[oaicite:6]{index=6}
  while (true) {
    await sleep(1500);
    const stRes = await fetch(`${API_BASE}/music/task/status?task_id=${encodeURIComponent(taskId)}`);
    const stJson = await stRes.json();
    onStatus?.(stJson);

    const st = pickStatus(stJson);
    if (!st || IN_PROGRESS.has(st)) continue;

    if (!['succeeded', 'completed', 'success'].includes(st)) {
      const errMsg = stJson?.error || stJson?.message || stJson?.result?.error || stJson?.prediction?.error || `Generation failed (${st || 'unknown'})`;
      throw new Error(errMsg);
    }

    const audioUrl = pickAudioUrl(stJson);
    if (!audioUrl) throw new Error('Replicate returned no audio URL.');
    return { status: 'succeeded', result: { audioUrl } };
  }
}
