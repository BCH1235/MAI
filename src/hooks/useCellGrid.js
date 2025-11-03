export function useCellGrid(cols, rows) {
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // 화면 좌표(0~1)를 -> 셀 인덱스 정보로 바꾸기
  const toCell = (x01, y01) => {
    const c = Math.floor(clamp01(x01) * cols);
    const r = Math.floor(clamp01(y01) * rows);
    const col = Math.min(c, cols - 1);
    const row = Math.min(r, rows - 1);
    return { col, row, index: row * cols + col };
  };

  // 셀의 가운데점을 다시 0~1 좌표로
  const centerOf = ({ col, row }) => ({
    x: (col + 0.5) / cols,
    y: (row + 0.5) / rows,
  });

  return { toCell, centerOf };
}
