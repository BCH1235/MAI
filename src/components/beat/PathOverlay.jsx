import React, { useEffect, useRef } from 'react';
import { useBeatPad } from '../../state/beatPadStore';

export default function PathOverlay() {
  const { state } = useBeatPad();
  const cvsRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const cvs = cvsRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');

    // 마지막으로 반영한 사이즈/스케일 기억
    let lastW = 0, lastH = 0, lastDpr = 0;

    const ensureSize = () => {
      const rect = cvs.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const needResize =
        rect.width !== lastW || rect.height !== lastH || dpr !== lastDpr;

      if (needResize) {
        lastW = rect.width;
        lastH = rect.height;
        lastDpr = dpr;

        // ★ rAF 루프에서만 캔버스 실제 픽셀 사이즈 갱신 (ResizeObserver 사용 안 함)
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (cvs.width !== w || cvs.height !== h) {
          cvs.width = w;
          cvs.height = h;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      }
    };

    const draw = () => {
      ensureSize();

      const rect = cvs.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // DRAW 모드에서만 경로 그림
      const pts = state.mode === 'DRAW' ? state.path : null;
      if (pts && pts.length) {
        ctx.save();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#2DD4BF';
        ctx.globalAlpha = 0.9;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(pts[0].x * w, pts[0].y * h);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x * w, pts[i].y * h);
        }
        ctx.stroke();

        // 마지막 점 강조
        const last = pts[pts.length - 1];
        ctx.fillStyle = '#2DD4BF';
        ctx.beginPath();
        ctx.arc(last.x * w, last.y * h, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.mode, state.path]);

  return <canvas ref={cvsRef} className="path-overlay" />;
}
