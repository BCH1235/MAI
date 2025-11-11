// src/hooks/usePathMode.js

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * 경로(점들의 배열)와 진행률(t, 0~1)을 받아 보간된 좌표를 반환합니다.
 * @param {Array<{x: number, y: number}>} path - 좌표 점들의 배열
 * @param {number} t - 전체 경로에서의 진행률 (0.0 ~ 1.0)
 * @returns {{x: number, y: number}} 보간된 좌표
 */
export function samplePath(path, t) {
  if (!path || path.length === 0) return { x: 0.5, y: 0.5 };
  if (t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  if (path.length === 1) return path[0];

  const totalLength = path.length - 1;
  const currentIndex = t * totalLength;
  const i = Math.floor(currentIndex);
  const u = currentIndex - i; // 현재 세그먼트 내에서의 진행률

  const p1 = path[i];
  const p2 = path[Math.min(i + 1, path.length - 1)];

  return {
    x: lerp(p1.x, p2.x, u),
    y: lerp(p1.y, p2.y, u),
  };
}
