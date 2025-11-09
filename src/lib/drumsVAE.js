// src/lib/drumsVAE.js
import * as mm from '@magenta/music';
import { PATTERN_STEPS, TRACKS } from '../components/beat/presets';

// Magenta 공식 드럼 VAE 체크포인트(2bar, 경량)
const CKPT =
  'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/drums_2bar_small';

let _vae = null;

/** VAE 인스턴스 로딩 */
export async function loadDrumsVAE() {
  if (_vae) return _vae;
  const vae = new mm.MusicVAE(CKPT);
  await vae.initialize();
  _vae = vae;
  return _vae;
}

/** PATTERN_STEPS 길이 드럼 패턴 → Quantized NoteSequence */
function patternToQuantizedNS(pattern, stepsPerQuarter = 4 /* 16분음표 */) {
  // 간단한 드럼 음고 매핑
  const DRUM_PITCH = {
    Kick: 36,
    Snare: 38,
    'Hat (C)': 42,
    'Hat (O)': 46,
    'Tom (L)': 45,
    'Tom (M)': 47,
    'Tom (H)': 50,
    Crash: 49,
    Ride: 51,
  };

  const notes = [];
  for (const track of TRACKS) {
    const arr = pattern[track] || [];
    const pitch = DRUM_PITCH[track] ?? 36; // fallback: kick
    for (let i = 0; i < PATTERN_STEPS; i++) {
      if (arr[i]) {
        notes.push({
          pitch,
          isDrum: true,
          quantizedStartStep: i,
          quantizedEndStep: i + 1,
        });
      }
    }
  }

  return {
    notes,
    quantizationInfo: { stepsPerQuarter },
    totalQuantizedSteps: PATTERN_STEPS,
    tempos: [{ qpm: 120 }], // qpm은 크게 중요하지 않음(고정됨)
  };
}

/** NoteSequence(드럼) → PATTERN_STEPS 길이 패턴 */
function nsToPattern(ns) {
  const out = {};
  for (const t of TRACKS) out[t] = Array(PATTERN_STEPS).fill(false);

  const PITCH_TO_TRACK = new Map([
    [36, 'Kick'],
    [38, 'Snare'],
    [42, 'Hat (C)'],
    [46, 'Hat (O)'],
    [45, 'Tom (L)'],
    [47, 'Tom (M)'],
    [50, 'Tom (H)'],
    [49, 'Crash'],
    [51, 'Ride'],
  ]);

  (ns.notes || []).forEach((n) => {
    if (!n.isDrum) return;
    const tr = PITCH_TO_TRACK.get(n.pitch);
    if (!tr) return;
    const step = Math.max(0, Math.min(PATTERN_STEPS - 1, n.quantizedStartStep | 0));
    out[tr][step] = true;
  });

  return out;
}

/** 4개의 코너 패턴을 인코딩해 잠복공간 z 벡터 4개 반환 */
export async function encodeCorners(corners) {
  const vae = await loadDrumsVAE();
  const seqs = ['A', 'B', 'C', 'D'].map((k) =>
    patternToQuantizedNS(corners[k])
  );
  // z: tf.Tensor2D shape [4, zDim]
  const z = await vae.encode(seqs);
  const zArr = await z.array(); // number[][], 길이=4
  z.dispose();
  return zArr; // [{...}x zDim] * 4
}

/** (x,y)에 해당하는 보간 패턴 디코딩 */
export async function decodeAtPosition(encodedLatents, x, y, opts = {}) {
  const vae = await loadDrumsVAE();
  const wA = (1 - x) * (1 - y);
  const wB = x * (1 - y);
  const wC = (1 - x) * y;
  const wD = x * y;

  // encodedLatents: number[][]  (4 x zDim)
  const zDim = encodedLatents[0].length;
  const avg = new Array(zDim).fill(0);
  for (let i = 0; i < zDim; i++) {
    avg[i] =
      encodedLatents[0][i] * wA +
      encodedLatents[1][i] * wB +
      encodedLatents[2][i] * wC +
      encodedLatents[3][i] * wD;
  }

  // tf 로 tensor를 만들어 decode
  const tf = mm.tf;
  const zTensor = tf.tensor2d([avg], [1, zDim]);
  const decoded = await vae.decode(zTensor, opts.temperature ?? 0.5);
  zTensor.dispose();

  const seq = decoded[0];
  return nsToPattern(seq);
}
