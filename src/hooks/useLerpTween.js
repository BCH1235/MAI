import { useRef } from "react";

export default function useLerpTween() {
  const rafRef = useRef(null);

  const start = ({ duration = 600, onUpdate, onEnd }) => {
    stop();
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      onUpdate?.(t);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else onEnd?.();
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const stop = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  return { start, stop };
}
