// src/lib/magentaCompat.js

let _mmPromise = null;

export async function loadMagenta() {
  if (!_mmPromise) {

    _mmPromise = import('@magenta/music/es6');
  }
  return _mmPromise;
}
