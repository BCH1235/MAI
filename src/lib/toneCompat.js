// src/lib/toneCompat.js
// Tone.js v14.x 전체 호환 래퍼 (ESM/UMD/전역 모두 대응, ESLint no-undef 안전)

// 1) 사이드 이펙트로만 로드 (내보내기 기대하지 않음)
import "tone";

// 2) 전역에서 Tone 네임스페이스 확보 (globalThis 대신 window/global 폴백)
const _root =
  (typeof window !== "undefined" && window) ||
  (typeof global !== "undefined" && global) ||
  {};
const Tone = _root.Tone;

// 기존 코드 호환: getTone / Tone export
export const getTone = () => Tone;
export { Tone };

// 오디오 시작 (사용자 제스처 이후 호출)
export async function ensureAudioStart() {
  try {
    if (Tone && typeof Tone.start === "function") {
      await Tone.start();                  // v14 표준
    } else if (Tone && Tone.context && typeof Tone.context.resume === "function") {
      await Tone.context.resume();         // 폴백
    }
  } catch (_) {
    // 여러 번 호출돼도 무해
  }

  try {
    const ctx = (Tone && typeof Tone.getContext === "function")
      ? Tone.getContext()
      : (Tone ? Tone.context : null);
    return (ctx && ctx.state) || "running";
  } catch {
    return "running";
  }
}

export function createGain(gain = 1, toDest = false) {
  if (!Tone || typeof Tone.Gain !== "function") {
    throw new Error("Tone.Gain unavailable (Tone not loaded)");
  }
  const node = new Tone.Gain(gain);
  if (toDest && typeof node.toDestination === "function") node.toDestination();
  return node;
}

export function createPlayer(urlOrBuffer, opts = {}) {
  if (!Tone || typeof Tone.Player !== "function") {
    throw new Error("Tone.Player unavailable (Tone not loaded)");
  }
  return new Tone.Player({ url: urlOrBuffer, ...opts });
}

export function now() {
  if (Tone && typeof Tone.now === "function") return Tone.now();
  const ctx = (Tone && typeof Tone.getContext === "function")
    ? Tone.getContext()
    : (Tone ? Tone.context : null);
  return (ctx && ctx.currentTime) || 0;
}

// ⚠ default export 없음(혼동 방지)
