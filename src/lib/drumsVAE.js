// src/lib/drumsVAE.js

import * as mm from '@magenta/music';
import { PATTERN_STEPS, TRACKS } from '../components/beat/presets';

const CKPT = 'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_vae/drums_2bar_hikl_small';

let _vae = null;

export async function loadDrumsVAE() {
  if (_vae) return _vae;
  const vae = new mm.MusicVAE(CKPT);
  await vae.initialize();
  _vae = vae;
  return _vae;
}

const DRUM_PITCH_MAP = {
  kick: 36, snare: 38, hatClose: 42, hatOpen: 46,
  tomLow: 45, tomMid: 47, tomHigh: 50, crash: 49, ride: 51,
};
const PITCH_TO_TRACK_MAP = new Map(Object.entries(DRUM_PITCH_MAP).map(([k, v]) => [v, k]));

function patternToQuantizedNS(pattern) {
  const notes = [];
  TRACKS.forEach((trackName) => {
    if (pattern[trackName]) {
      pattern[trackName].forEach((active, step) => {
        if (active) {
          notes.push({
            pitch: DRUM_PITCH_MAP[trackName],
            quantizedStartStep: step,
            quantizedEndStep: step + 1,
          });
        }
      });
    }
  });
  return {
    notes,
    quantizationInfo: { stepsPerQuarter: 4 },
    totalQuantizedSteps: PATTERN_STEPS,
  };
}

function nsToPattern(ns) {
  const pattern = {};
  TRACKS.forEach(track => { pattern[track] = Array(PATTERN_STEPS).fill(false); });
  ns.notes.forEach(note => {
    const trackName = PITCH_TO_TRACK_MAP.get(note.pitch);
    if (trackName) {
      const step = Math.max(0, Math.min(PATTERN_STEPS - 1, Math.floor(note.quantizedStartStep)));
      pattern[trackName][step] = true;
    }
  });
  return pattern;
}

export async function encodeCorners(corners) {
  const vae = await loadDrumsVAE();
  const seqs = [corners.A, corners.B, corners.C, corners.D].map(patternToQuantizedNS);
  const z = await vae.encode(seqs);
  const zArr = await z.array();
  z.dispose();
  return zArr;
}

export async function decodeAtPosition(encodedLatents, x, y, opts = {}) {
  const vae = await loadDrumsVAE();
  const [zA, zB, zC, zD] = encodedLatents;
  const wA = (1 - x) * (1 - y);
  const wB = x * (1 - y);
  const wC = (1 - x) * y;
  const wD = x * y;

  const zDim = zA.length;
  const avg = new Array(zDim).fill(0);
  for (let i = 0; i < zDim; i++) {
    avg[i] = zA[i] * wA + zB[i] * wB + zC[i] * wC + zD[i] * wD;
  }

  const zTensor = mm.tf.tensor2d([avg], [1, zDim]);
  const decoded = await vae.decode(zTensor, opts.temperature ?? 0.5);
  zTensor.dispose();

  return nsToPattern(decoded[0]);
}
