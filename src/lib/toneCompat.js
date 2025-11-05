// src/lib/toneCompat.js
let toneModulePromise;

/** Tone.js를 동적으로 로드 (v14는 default export 없음) */
export async function getTone() {
  if (!toneModulePromise) {
    toneModulePromise = import('tone'); // <- 항상 모듈 네임스페이스 객체를 받음
  }
  return toneModulePromise;
}

/** 유저 제스처 후 오디오 시작(필요할 때만 호출) */
export async function ensureAudioStart(toneModule) {
  const Tone = toneModule || (await getTone());
  try {
    await Tone.start(); // 크롬/사파리에서 사용자 제스처 필요
  } catch (_) {}
  return Tone.context.state === 'running';
}
