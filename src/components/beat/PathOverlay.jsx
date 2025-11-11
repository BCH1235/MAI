// src/components/beat/PathOverlay.jsx

import React, { useEffect, useRef } from 'react';
import { useBeatPad } from '../../state/beatPadStore';

export default function PathOverlay({ pathRef, isDrawing }) {
  const { state } = useBeatPad();
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let lastDpr = 1;

    const ensureSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (width !== canvas.width || height !== canvas.height || dpr !== lastDpr) {
        canvas.width = width;
        canvas.height = height;
        lastDpr = dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    const draw = () => {
      ensureSize();
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const activePath = isDrawing ? pathRef?.current : state.path;
      if (activePath && activePath.length > 1) {
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#2DD4BF';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.85;

        ctx.beginPath();
        ctx.moveTo(activePath[0].x * width, activePath[0].y * height);
        for (let i = 1; i < activePath.length; i++) {
          ctx.lineTo(activePath[i].x * width, activePath[i].y * height);
        }
        ctx.stroke();

        const lastPoint = activePath[activePath.length - 1];
        ctx.beginPath();
        ctx.arc(lastPoint.x * width, lastPoint.y * height, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#2DD4BF';
        ctx.fill();
        ctx.restore();
      }

      const puck = state.puckPosition;
      if (puck) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(puck.x * width, puck.y * height, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isDrawing, pathRef, state.path, state.puckPosition]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}
