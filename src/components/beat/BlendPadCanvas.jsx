import React, { useRef, useState } from "react";
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

  const getXY01 = (e) => {
    const r = ref.current.getBoundingClientRect();
    const p = "touches" in e ? e.touches[0] : e;
    const x = (p.clientX - r.left) / r.width;
    const y = (p.clientY - r.top) / r.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

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

  // 셀 모드: 스냅된 셀마다 즉시 디코드
  const applyAtEventCellMode = async (e) => {
    const { x, y } = getXY01(e);
    const cell = toCell(x, y);
    dispatch({ type: "SELECT_CELL", cell });

    if (cell.index === lastIndexRef.current) return;
    lastIndexRef.current = cell.index;

    const pattern = await ensureDecoded(cell);
    if (pattern && onDecodedPattern) onDecodedPattern(pattern);
  };

  // 그리기 모드: 경로 수집(중복/초근접 점은 무시)
  const pushPathPoint = (x, y) => {
    const prev = lastPathPointRef.current;
    const dx = x - prev.x, dy = y - prev.y;
    if (prev.x < 0 || Math.hypot(dx, dy) > 0.01) { // 1% 이상 이동 시만 샘플
      dispatch({ type: "APPEND_PATH_POINT", point: { x, y } });
      lastPathPointRef.current = { x, y };
    }
  };

  const onDown = (e) => {
    setDragging(true);
    lastIndexRef.current = -1;
    lastPathPointRef.current = { x: -1, y: -1 };

    if (state.mode === "CELL") {
      applyAtEventCellMode(e);
    } else {
      const { x, y } = getXY01(e);
      // 새 경로 시작: 기존 경로 지우고 첫 점 push
      dispatch({ type: "RESET_PATH" });
      dispatch({ type: "APPEND_PATH_POINT", point: { x, y } });
      lastPathPointRef.current = { x, y };
      
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
  };

  const onMove = (e) => {
    if (!dragging) return;
    if (state.mode === "CELL") {
      applyAtEventCellMode(e);
    } else {
      const { x, y } = getXY01(e);
      pushPathPoint(x, y);
    }
  };

  const onUp = () => {
    setDragging(false);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onUp);
  };

  return (
    <canvas
      ref={ref}
      className="blendpad-canvas"
      onMouseDown={onDown}
      onTouchStart={onDown}
    />
  );
}
