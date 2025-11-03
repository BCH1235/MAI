import React, { useEffect, useRef } from "react";
import { useBeatPad } from "../../state/beatPadStore";

export default function PathOverlay() {
  const ref = useRef(null);
  const { state } = useBeatPad();

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const ro = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = cvs;
      if (cvs.width !== w || cvs.height !== h) {
        cvs.width = w || 1;
        cvs.height = h || 1;
      }
      draw();
    });
    ro.observe(cvs);
    return () => ro.disconnect();
    // eslint-disable-next-line
  }, []);

  useEffect(() => { draw(); /* path 바뀌면 다시 그림 */ }, [state.path, state.mode, state.interpolating]);

  const draw = () => {
    const cvs = ref.current; if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);

    if (!state.path?.length) return;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(80, 227, 194, 0.9)";
    ctx.fillStyle = "rgba(80, 227, 194, 0.25)";

    // 라인
    ctx.beginPath();
    for (let i = 0; i < state.path.length; i++) {
      const p = state.path[i];
      const x = p.x * w, y = p.y * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 포인트(조그만 점)
    for (let i = 0; i < state.path.length; i += 4) {
      const p = state.path[i];
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  return <canvas ref={ref} className="path-overlay" />;
}
