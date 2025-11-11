// src/components/beat/BlendPadCanvas.jsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBeatPad } from '../../state/beatPadStore';
import { samplePathByDistance } from '../../hooks/usePathMode';

export default function BlendPadCanvas({ onBlend, disabled = false, pathRef: externalPathRef, onDrawingChange }) {
  const canvasRef = useRef(null);
  const internalPathRef = useRef([]);
  const pathRef = externalPathRef || internalPathRef;
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
      onDrawingChange?.(true);
      canvas.setPointerCapture?.(event.pointerId);
      const coords = getXY01(event);

      if (state.drawMode === 'PATH') {
        pathRef.current = [coords];
      } else {
        onBlend?.(coords.x, coords.y);
      }
      event.preventDefault();
    };

    const handlePointerMove = (event) => {
      if (!dragging) return;
      const coords = getXY01(event);
      if (state.drawMode === 'PATH') {
        pathRef.current.push(coords);
      } else {
        onBlend?.(coords.x, coords.y);
      }
    };

    const finalizePath = () => {
      const rawPath = pathRef.current || [];
      if (rawPath.length < 2) {
        dispatch({ type: 'RESET_PATH' });
        return;
      }

      let totalLength = 0;
      for (let i = 1; i < rawPath.length; i++) {
        const p1 = rawPath[i - 1];
        const p2 = rawPath[i];
        totalLength += Math.hypot(p2.x - p1.x, p2.y - p1.y);
      }

      const numPoints = Math.max(100, Math.floor(totalLength * 300));
      const smoothPath = [];
      for (let i = 0; i < numPoints; i++) {
        const t = numPoints === 1 ? 0 : i / (numPoints - 1);
        smoothPath.push(samplePathByDistance(rawPath, t));
      }

      dispatch({ type: 'SET_PATH', payload: smoothPath });
      pathRef.current = smoothPath;
    };

    const handlePointerEnd = (event) => {
      if (!dragging) return;
      setDragging(false);
      onDrawingChange?.(false);
      canvas.releasePointerCapture?.(event.pointerId);
      if (state.drawMode === 'PATH') {
        finalizePath();
      }
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
  }, [dispatch, dragging, getXY01, onBlend, state.drawMode, disabled, pathRef, onDrawingChange]);

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
