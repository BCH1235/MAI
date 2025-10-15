// Copyright 2018 Google LLC
// Licensed under the Apache License, Version 2.0

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const lerpArray = (a, b, t) => {
  const n = Math.min(a.length, b.length);
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = lerp(a[i], b[i], t);
  return out;
};
const times = (n, fn) => Array.from({ length: n }, (_, i) => fn(i, n));

export const generate4PointGradient = (tl, tr, bl, br, columns, rows) => {
  return times(columns, (x, columns) => {
    const cp = columns === 1 ? 0 : x / (columns - 1);
    const topColor = lerpArray(tl, tr, cp);
    const bottomColor = lerpArray(bl, br, cp);
    return times(rows, (y, rows) => {
      const rp = rows === 1 ? 0 : y / (rows - 1);
      return lerpArray(topColor, bottomColor, rp);
    });
  });
};

export const generate4PointGradientAt = (
  tl, tr, bl, br, percentX, percentY, result = []
) => {
  const px = clamp01(percentX ?? 0);
  const py = clamp01(percentY ?? 0);
  const top = lerpArray(tl, tr, px);
  const bot = lerpArray(bl, br, px);
  const out = lerpArray(top, bot, py);
  result.length = 0;
  for (let i = 0; i < out.length; i++) result[i] = out[i];
  return result;
};

export const toCSSString = (arr) => {
  const [r = 0, g = 0, b = 0, a = 1] = arr;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
};
