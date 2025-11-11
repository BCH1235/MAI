// src/components/beat/BlendPadCanvas.jsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBeatPad } from '../../state/beatPadStore';

export default function BlendPadCanvas({ onBlend, disabled = false }) {
  const canvasRef = useRef(null);
  const { state, dispatch } = useBeatPad();
  const [dragging, setDragging] = useState(false);

  const getXY01 = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0.5, y: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const point = event.touches?.[0] ?? event;
    const x = (point.clientX - rect.left) / rect.width;
    const y = (point.clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;

    const handlePointerDown = (event) => {
      if (event.button === 2) return;
      setDragging(true);
      canvas.setPointerCapture?.(event.pointerId);
      const coords = getXY01(event);

      if (state.drawMode === 'PATH') {
        dispatch({ type: 'RESET_PATH' });
        dispatch({ type: 'APPEND_PATH_POINT', payload: coords });
      } else {
        onBlend?.(coords.x, coords.y);
      }
      event.preventDefault();
    };

    const handlePointerMove = (event) => {
      if (!dragging) return;
      const coords = getXY01(event);
      if (state.drawMode === 'PATH') {
        dispatch({ type: 'APPEND_PATH_POINT', payload: coords });
      } else {
        onBlend?.(coords.x, coords.y);
      }
    };

    const handlePointerEnd = (event) => {
      if (!dragging) return;
      setDragging(false);
      canvas.releasePointerCapture?.(event.pointerId);
    };

    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [dispatch, dragging, getXY01, onBlend, state.drawMode, disabled]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        cursor: disabled ? 'not-allowed' : state.drawMode === 'PATH' ? 'crosshair' : 'pointer',
        touchAction: 'none',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    />
  );
}
