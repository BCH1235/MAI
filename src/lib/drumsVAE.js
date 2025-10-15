import * as tf from '@tensorflow/tfjs';
import { loadMagenta } from './magentaCompat';
import { TRACKS } from '../components/beat/presets';

const CHECKPOINT =
  'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/drums_2bar_lokl_small';

let vae = null;
let ready = false;

const DRUM_PITCH_MAP = {
  'kick': 36, 
  'snare': 38, 
  'hatClose': 42, 
  'hatOpen': 46,
  'tomLow': 45, 
  'tomMid': 48, 
  'tomHigh': 50,
  'crash': 49, 
  'ride': 51
};
const PITCH_DRUM_MAP = Object.fromEntries(Object.entries(DRUM_PITCH_MAP).map(a => [a[1], a[0]]));

export async function loadDrumsVAE(checkpointUrl = CHECKPOINT) {
  if (vae && ready) return vae;
  const { MusicVAE } = await loadMagenta();
  vae = new MusicVAE(checkpointUrl);
  await vae.initialize();
  ready = true;
  return vae;
}

export async function patternToNoteSequence(pattern, bars = 2, stepsPerBar = 16, qpm = 120) {
  const { sequences } = await loadMagenta();
  const total = bars * stepsPerBar;
  const seq = sequences.createQuantizedNoteSequence(4);
  seq.tempos = [{ qpm }];

  for (const trackName of TRACKS) {
    const pitch = DRUM_PITCH_MAP[trackName];
    if (pattern && pattern[trackName]) {
      const arr = pattern[trackName];
      for (let b = 0; b < bars; b++) {
        for (let i = 0; i < stepsPerBar; i++) {
          if (arr[i]) {
            const step = b * stepsPerBar + i;
            seq.notes.push({
              pitch,
              quantizedStartStep: step,
              quantizedEndStep: step + 1,
              isDrum: true,
              velocity: 100,
            });
          }
        }
      }
    }
  }
  seq.totalQuantizedSteps = total;
  return seq;
}

export function noteSequenceToPattern(seq, stepsOut = 16) {
  const pat = {};
  TRACKS.forEach(t => pat[t] = Array(stepsOut).fill(false));
  for (const n of seq.notes || []) {
    if (!n.isDrum) continue;
    const trackName = PITCH_DRUM_MAP[n.pitch];
    if (!trackName) continue;
    const step = (n.quantizedStartStep || 0) % stepsOut;
    pat[trackName][step] = true;
  }
  return pat;
}

export async function encodeCorners(corners, qpm = 120) {
  const model = await loadDrumsVAE();
  const seqs = await Promise.all(
    ['A','B','C','D'].map((k) => patternToNoteSequence(corners[k], 2, 16, qpm))
  );
  const zs = await model.encode(seqs);
  const arr = await zs.array();
  zs.dispose();
  return {
    A: new Float32Array(arr[0]),
    B: new Float32Array(arr[1]),
    C: new Float32Array(arr[2]),
    D: new Float32Array(arr[3]),
  };
}

export async function decodeAtPosition(encodedCorners, x, y, temperature = 1.2) { // 온도를 살짝 높여서 변화를 더 잘보이게 할 수 있습니다.
  const wA = (1 - x) * (1 - y),
        wB = x * (1 - y),
        wC = (1 - x) * y,
        wD = x * y;

  const zdim = encodedCorners.A.length;
  const z = new Float32Array(zdim);
  for (let i = 0; i < zdim; i++) {
    z[i] =
      wA * encodedCorners.A[i] +
      wB * encodedCorners.B[i] +
      wC * encodedCorners.C[i] +
      wD * encodedCorners.D[i];
  }

  const model = await loadDrumsVAE();
  const zTensor = tf.tensor2d([Array.from(z)]);
  const outSeqs = await model.decode(zTensor, temperature);
  zTensor.dispose();
  const seq = outSeqs[0];
  return noteSequenceToPattern(seq, 16);
}