// src/components/beat/BlendPadCanvas.jsx
import React, { useEffect, useRef, useState } from "react";
import { useBeatPad } from "../../state/beatPadStore";
import { useCellGrid } from "../../hooks/useCellGrid";
import { cellCache } from "../../lib/beatblender/cellCache";
import { encodeCorners, decodeAtPosition } from "../../lib/drumsVAE";

export default function BlendPadCanvas({ corners, onDecodedPattern }) {
  const ref = useRef(null);
  const { state, dispatch } = useBeatPad();
  const { toCell, centerOf } = useCellGrid(state.grid.cols, state.grid.rows);

  const [dragging, setDragging] = useState(false);
  const lastIndexRef = useRef(-1);
  const lastPathPointRef = useRef({ x: -1, y: -1 });

  // ────────────────────────────────────────────────────────────
  // 좌표 보정: 0~1 정규화 좌표로 변환
  // ────────────────────────────────────────────────────────────
  const getXY01 = (e) => {
    const el = ref.current;
    if (!el) return { x: 0.5, y: 0.5 };
    const r = el.getBoundingClientRect();
    const px = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const py = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
    const x = (px - r.left) / r.width;
    const y = (py - r.top) / r.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  // ────────────────────────────────────────────────────────────
  // VAE 인코딩/디코딩 보조
  // ────────────────────────────────────────────────────────────
  const ensureEncodings = async () => {
    if (state.cornerEncodings) return state.cornerEncodings;
    if (!corners) return null;
    const enc = await encodeCorners(corners);
    dispatch({ type: "SET_CORNERS", encodings: enc });
    return enc;
  };

  const ensureDecoded = async (cell) => {
    const idx = cell.index;
    let pattern = cellCache.get(state.cellCacheVersion, idx);
    if (pattern) return pattern;

    const enc = await ensureEncodings();
    if (!enc) return null;

    const { x, y } = centerOf(cell);
    pattern = await decodeAtPosition(enc, x, y, 1.1);
    if (pattern) cellCache.set(state.cellCacheVersion, idx, pattern);
    return pattern;
  };

  // ────────────────────────────────────────────────────────────
  // CELL 모드: 셀 스냅 후 즉시 디코드
  // ────────────────────────────────────────────────────────────
  const applyAtEventCellMode = async (e) => {
    const { x, y } = getXY01(e);
    const cell = toCell(x, y);
    dispatch({ type: "SELECT_CELL", cell });

    // 같은 셀 반복 디코드 방지
    if (cell.index === lastIndexRef.current) return;
    lastIndexRef.current = cell.index;

    const pattern = await ensureDecoded(cell);
    if (pattern && onDecodedPattern) onDecodedPattern(pattern);
  };

  // ────────────────────────────────────────────────────────────
  // DRAW 모드: 경로 점 누적(너무 촘촘하면 스킵)
  // ────────────────────────────────────────────────────────────
  const pushPathPoint = (x, y) => {
    const prev = lastPathPointRef.current;
    const dx = x - prev.x, dy = y - prev.y;
    // 1% 이상 이동했을 때만 샘플링
    if (prev.x < 0 || Math.hypot(dx, dy) > 0.01) {
      dispatch({ type: "APPEND_PATH_POINT", point: { x, y } });
      lastPathPointRef.current = { x, y };
    }
  };

  // ────────────────────────────────────────────────────────────
  // Pointer 이벤트: 마우스/터치 통합
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPointerDown = (e) => {
      // 우클릭 컨텍스트 메뉴 방지
      if (e.button === 2) return;
      setDragging(true);
      lastIndexRef.current = -1;
      lastPathPointRef.current = { x: -1, y: -1 };
      el.setPointerCapture?.(e.pointerId);

      if (state.mode === "CELL") {
        applyAtEventCellMode(e);
      } else {
        const { x, y } = getXY01(e);
        dispatch({ type: "RESET_PATH" });
        dispatch({ type: "APPEND_PATH_POINT", point: { x, y } });
        lastPathPointRef.current = { x, y };
      }

      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      if (state.mode === "CELL") {
        // 왼쪽 버튼을 누르고 있는 동안만
        if ((e.buttons & 1) === 0 && e.pointerType !== "touch") return;
        applyAtEventCellMode(e);
      } else {
        const { x, y } = getXY01(e);
        pushPathPoint(x, y);
      }
    };

    const endDrag = (e) => {
      setDragging(false);
      el.releasePointerCapture?.(e.pointerId);
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointerleave", endDrag);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("pointerleave", endDrag);
    };
    // state.mode만 의존 (corners/encodings은 내부 ensure 함수에서 처리)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode, dragging]);

  return (
    <canvas
      ref={ref}
      className="blendpad-canvas"
      onContextMenu={(e) => e.preventDefault()}
      role="application"
      tabIndex={0}
      aria-label="Beat blend pad"
    />
  );
}
