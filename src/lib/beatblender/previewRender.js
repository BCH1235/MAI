// 셀 안에 흐릿한 미니 드럼 패턴을 그리는 도화지 유틸.
// 지금은 그냥 존재만 하게 심플 버전.

export function drawMiniPattern(ctx, x, y, w, h, pattern, opts = {}) {
  if (!pattern) return;
  const steps = 16;
  const tracks = opts.tracks ?? 9;
  const alpha = opts.alpha ?? 0.25;

  const cw = w / steps;
  const ch = h / tracks;

  ctx.save();
  ctx.globalAlpha = alpha;

  // pattern[track][step]이 1이면 박스 찍는다는 가정
  for (let tr = 0; tr < tracks; tr++) {
    for (let s = 0; s < steps; s++) {
      const on =
        pattern?.[tr]?.[s] === 1 ||
        pattern?.[tr]?.[s] === true;
      if (!on) continue;
      ctx.fillRect(
        x + s * cw + 1,
        y + tr * ch + 1,
        Math.max(1, cw - 2),
        Math.max(1, ch - 2)
      );
    }
  }

  ctx.restore();
}
