// src/components/beat/presets.js

export const TRACKS = [
  'kick', 'snare', 'hatClose', 'hatOpen', 
  'tomLow', 'tomMid', 'tomHigh', 'crash', 'ride'
];

function fromBitmask(bitmaskArray) {
  const pattern = {};
  TRACKS.forEach(track => {
    pattern[track] = Array(16).fill(false); // 16칸으로 변경
  });

  // 16스텝만 사용합니다.
  for (let i = 0; i < 16; i++) {
    const mask = bitmaskArray[i] || 0;
    if ((mask & 1) > 0) pattern.kick[i] = true;
    if ((mask & 2) > 0) pattern.snare[i] = true;
    if ((mask & 4) > 0) pattern.hatClose[i] = true;
    if ((mask & 8) > 0) pattern.hatOpen[i] = true;
    if ((mask & 16) > 0) pattern.tomLow[i] = true;
    if ((mask & 32) > 0) pattern.tomMid[i] = true;
    if ((mask & 64) > 0) pattern.tomHigh[i] = true;
    if ((mask & 128) > 0) pattern.crash[i] = true;
    if ((mask & 256) > 0) pattern.ride[i] = true;
  }
  return pattern;
}

const B = (arr) => (arr.length === 16 ? arr : Array(16).fill(false).map((_, i) => !!arr[i]));

export const PRESETS = {
  // 32칸 데이터 중 앞 16칸만 사용됩니다.
  "Rock 1": fromBitmask([1, 0, 1, 0, 2, 0, 0, 0, 1, 0, 1, 0, 2, 0, 0, 0]),
  "Rock 2": fromBitmask([385, 0, 1, 0, 256, 0, 1, 1, 386, 0, 0, 1, 256, 0, 1, 0]),
  "Reggaeton": fromBitmask([257, 0, 0, 258, 1, 0, 258, 0, 1, 256, 256, 2, 1, 0, 258, 0]),
  "Breakbeat": fromBitmask([5, 0, 5, 0, 6, 0, 4, 2, 5, 2, 5, 0, 6, 0, 4, 0]),
  "Basic Backbeat": fromBitmask([5, 0, 4, 0, 7, 0, 4, 0, 5, 0, 4, 0, 7, 0, 4, 0]),
  "Boots & Cats": fromBitmask([1, 0, 4, 0, 2, 0, 4, 0, 1, 0, 4, 0, 2, 0, 4, 0]),
  "Pop Punk": fromBitmask([5, 4, 10, 5, 4, 5, 10, 4, 5, 4, 10, 5, 4, 5, 10, 4]),
  "Half Time": fromBitmask([5, 0, 4, 0, 4, 0, 5, 0, 6, 0, 4, 0, 4, 0, 5, 0]),
  "Bossa Half Time": fromBitmask([ 7, 0, 256, 0, 4, 0, 263, 0, 5, 0, 0, 0, 262, 0, 5, 0]),
  "Samba Full Time": fromBitmask([7, 256, 4, 263, 5, 0, 262, 5, 261, 0, 262, 5, 5, 258, 4, 261]),
  "Four on the floor": {
    kick: B([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]),
    snare: B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    hatClose: B([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]),
    hatOpen: B([]), tomLow: B([]), tomMid: B([]), tomHigh: B([]), crash: B([]), ride: B([])
  },
  "Busy Hats": {
    kick: B([1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0]),
    snare: B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    hatClose: B([1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1]),
    hatOpen: B([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]),
    tomLow: B([]), tomMid: B([]), tomHigh: B([]), crash: B([]), ride: B([])
  },
  "Minimal": {
    kick: B([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]),
    snare: B([]),
    hatClose: B([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]),
    hatOpen: B([]), tomLow: B([]), tomMid: B([]), tomHigh: B([]), crash: B([]), ride: B([])
  },
};

export const clonePattern = (p) => {
  const newPattern = {};
  TRACKS.forEach(track => {
    newPattern[track] = p && p[track] ? [...p[track]] : B([]);
  });
  return newPattern;
};