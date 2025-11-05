// src/components/beat/SimpleBlendPad.jsx
import React, { useEffect, useRef, useState } from 'react';

export default function SimpleBlendPad({
  width = 420,
  height = 420,
  grid = 16,             // 16x16 격자선
  initial = { x: 0.5, y: 0.5 },
  onChange,              // (x01, y01) 콜백
}) {
  const canvasRef = useRef(null);
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);

  const draw = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;

    // 배경
    ctx.clearRect(0, 0, w, h);
    // 은은한 배경 그라디언트(좌상↔우하)
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#111826');  // 좌상
    grad.addColorStop(1, '#10211e');  // 우하
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 격자
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    const stepX = w / grid;
    const stepY = h / grid;
    for (let i = 0; i <= grid; i++) {
      ctx.beginPath();
      ctx.moveTo(i * stepX + 0.5, 0);
      ctx.lineTo(i * stepX + 0.5, h);
      ctx.stroke();
    }
    for (let j = 0; j <= grid; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * stepY + 0.5);
      ctx.lineTo(w, j * stepY + 0.5);
      ctx.stroke();
    }

    // 퍽
    const px = pos.x * w;
    const py = pos.y * h;
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#2DD4BF';
    ctx.fill();

    // 교차선
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  };

  useEffect(draw, [pos, width, height, grid]);

  const getXY01 = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
    return { x, y };
  };

  const start = (e) => {
    setDragging(true);
    const p = getXY01(e);
    setPos(p);
    onChange?.(p.x, p.y);
  };
  const move = (e) => {
    if (!dragging) return;
    const p = getXY01(e);
    setPos(p);
    onChange?.(p.x, p.y);
  };
  const end = () => setDragging(false);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width,
        height,
        borderRadius: 16,
        border: '1px solid #333',
        display: 'block',
        background: '#0b0b0b',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
        cursor: 'crosshair',
      }}
      onMouseDown={start}
      onMouseMove={move}
      onMouseUp={end}
      onMouseLeave={end}
    />
  );
}
