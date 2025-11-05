// src/components/beat/SampleKit.js
import * as Tone from 'tone';

// CRA(react-scripts)에서 public 폴더는 루트로 서비스됨
const BASE = (process.env.PUBLIC_URL || '') + '/samples/505/';

export const SAMPLE_PATHS = {
  kick:  `${BASE}kick.mp3`,
  snare: `${BASE}snare.mp3`,
  hatC:  `${BASE}hat-close.mp3`,
  hatO:  `${BASE}hat-open.mp3`,
  tomL:  `${BASE}tom-low.mp3`,
  tomM:  `${BASE}tom-mid.mp3`,
  tomH:  `${BASE}tom-high.mp3`,
  crash: `${BASE}crash.mp3`,
  ride:  `${BASE}ride.mp3`,
};

export async function createKit() {
  await Tone.start();
  const gain = new Tone.Gain(0.9).toDestination();

  return new Promise((resolve, reject) => {
    const players = new Tone.Players(SAMPLE_PATHS, {
      onload: () => resolve({ players, gain }),
      onerror: (name) => reject(new Error(`Sample load failed: ${name}`)),
    }).connect(gain);
  });
}
