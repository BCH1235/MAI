// src/hooks/usePathMode.js

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * 경로와 진행률(t)을 받아, 실제 거리를 기준으로 보간된 좌표를 반환합니다.
 * @param {Array<{x: number, y: number}>} path - 좌표 점들의 배열
 * @param {number} t - 전체 경로에서의 진행률 (0.0 ~ 1.0)
 * @returns {{x: number, y: number}} 보간된 좌표
 */
export function samplePathByDistance(path, t) {
  if (!path || path.length === 0) return { x: 0.5, y: 0.5 };
  if (t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  if (path.length === 1) return path[0];

  const cumulativeLengths = [0];
  let totalLength = 0;
  for (let i = 1; i < path.length; i++) {
    const p1 = path[i - 1];
    const p2 = path[i];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    totalLength += Math.hypot(dx, dy);
    cumulativeLengths.push(totalLength);
  }

  if (totalLength === 0) return path[0];

  const targetLength = t * totalLength;

  let segmentIndex = 0;
  while (
    segmentIndex < cumulativeLengths.length - 1 &&
    cumulativeLengths[segmentIndex + 1] < targetLength
  ) {
    segmentIndex++;
  }

  const lengthBeforeSegment = cumulativeLengths[segmentIndex];
  const segmentLength = cumulativeLengths[segmentIndex + 1] - lengthBeforeSegment;
  const segmentProgress =
    segmentLength === 0 ? 0 : (targetLength - lengthBeforeSegment) / segmentLength;

  const p1 = path[segmentIndex];
  const p2 = path[segmentIndex + 1];

  return {
    x: lerp(p1.x, p2.x, segmentProgress),
    y: lerp(p1.y, p2.y, segmentProgress),
  };
}
