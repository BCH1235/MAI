// 간단한 경로 유틸이 필요한 경우 확장해서 쓰기 위한 자리(현재는 store 액션으로 처리하므로 최소화)
export function lerp(a, b, t) { return a + (b - a) * t; }

export function samplePath(path, t) {
  if (!path?.length) return { x: 0.5, y: 0.5 };
  if (t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  const n = path.length;
  const idx = t * (n - 1);
  const i = Math.floor(idx);
  const u = idx - i;
  const a = path[i], b = path[Math.min(i + 1, n - 1)];
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
}
