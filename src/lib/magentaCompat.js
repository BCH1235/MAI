// src/lib/magentaCompat.js
// - TensorFlow 전역(window.tf) 보장
// - Magenta UMD 번들을 CDN에서 1파일로 로드 (jsDelivr → unpkg 폴백)
// - CORS 스택 보존을 위해 crossOrigin='anonymous'

let cached = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    // 이미 같은 src가 있으면 재사용
    if ([...document.scripts].some(s => s.src === src)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

// TensorFlow 전역 보장 (모듈 → CDN 폴백)
async function ensureTFGlobal() {
  if (typeof window !== 'undefined' && window.tf) return;
  try {
    const tfmod = await import(/* webpackChunkName: "tfjs" */ '@tensorflow/tfjs');
    // eslint-disable-next-line no-undef
    window.tf = tfmod?.default ?? tfmod;
  } catch {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
  }
}

export async function loadMagenta() {
  if (cached) return cached;

  await ensureTFGlobal();

  // ✅ UMD 번들 1파일 (경로 지정 없이 패키지 루트로 요청)
  const primary = 'https://cdn.jsdelivr.net/npm/@magenta/music@1.23.1';
  const fallback = 'https://unpkg.com/@magenta/music@1.23.1';

  try {
    await loadScript(primary);
  } catch {
    await loadScript(fallback);
  }

  // UMD 전역 확인
  // eslint-disable-next-line no-undef
  const mm = window.mm;
  if (!mm || !mm.MusicVAE || !mm.sequences) {
    throw new Error('Magenta (window.mm) not initialized');
  }

  cached = { MusicVAE: mm.MusicVAE, sequences: mm.sequences };
  return cached;
}
