export const clamp01 = (v) => Math.max(0, Math.min(1, v));

export const norm01 = (v, min = 0, max = 1) => {
  return clamp01((v - min) / (max - min));
};
