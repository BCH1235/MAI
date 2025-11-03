import React, { useEffect, useRef } from "react";
import { useBeatPad } from "../../state/beatPadStore";
import { cellCache } from "../../lib/beatblender/cellCache";
import { drawMiniPattern } from "../../lib/beatblender/previewRender";
import { useCellGrid } from "../../hooks/useCellGrid";
import { encodeCorners, decodeAtPosition } from "../../lib/drumsVAE";

export default function BlendPadGhostLayer({ corners }) {
  const ref = useRef(null);
  const { state, dispatch } = useBeatPad();
  const { centerOf } = useCellGrid(state.grid.cols, state.grid.rows);

  // 캔버스 해상도 동기화
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = canvas;
      if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
        canvas.width = clientWidth || 1;
        canvas.height = clientHeight || 1;
        drawAll();
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line
  }, []);

  const drawAll = () => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const { cols, rows } = state.grid;
    const cw = width / cols;
    const rh = height / rows;

    ctx.clearRect(0, 0, width, height);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const pattern = cellCache.get(state.cellCacheVersion, idx);
        if (!pattern) continue;
        drawMiniPattern(ctx, c * cw, r * rh, cw, rh, pattern, { alpha: 0.22, tracks: 9 });
      }
    }
  };

  // 인코딩 보장
  const ensureEncodings = async () => {
    if (state.cornerEncodings) return state.cornerEncodings;
    if (!corners) return null;
    const enc = await encodeCorners(corners);
    dispatch({ type: "SET_CORNERS", encodings: enc });
    return enc;
  };

  // 셀 캐시 천천히 채우기
  useEffect(() => {
    let cancelled = false;
    const { cols, rows } = state.grid;

    const work = async (i = 0) => {
      if (cancelled) return;
      const enc = await ensureEncodings();
      if (!enc) return;

      const total = cols * rows;
      const batch = 15;
      for (let k = 0; k < batch && i < total; k++, i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const idx = r * cols + c;
        if (!cellCache.get(state.cellCacheVersion, idx)) {
          const { x, y } = centerOf({ col: c, row: r });
          const pattern = await decodeAtPosition(enc, x, y, 1.1);
          if (pattern) cellCache.set(state.cellCacheVersion, idx, pattern);
        }
      }
      drawAll();
      if (i < total) requestAnimationFrame(() => work(i));
    };

    work();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [state.grid, state.cellCacheVersion, corners]);

  return <canvas ref={ref} className="blendpad-ghost" />;
}
  