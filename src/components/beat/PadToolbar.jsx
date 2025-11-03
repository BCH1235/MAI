import React from "react";
import { Button, ButtonGroup, Stack, Typography } from "@mui/material";
import { useBeatPad } from "../../state/beatPadStore";
import { encodeCorners, decodeAtPosition } from "../../lib/drumsVAE";

export default function PadToolbar({ corners, onApplyPattern }) {
  const { state, dispatch } = useBeatPad();

  const setMode = (mode) => dispatch({ type: "SET_MODE", mode });

  // 랜덤 좌표 하나 디코드해서 패턴 적용
  const randomPick = async () => {
    let enc = state.cornerEncodings;
    if (!enc && corners) {
      enc = await encodeCorners(corners);
      dispatch({ type: "SET_CORNERS", encodings: enc });
    }
    if (!enc) return;
    const x = Math.random(), y = Math.random();
    const pat = await decodeAtPosition(enc, x, y, 1.1);
    if (pat && onApplyPattern) onApplyPattern(pat);
  };

  // ⬇️ 촤라락 전환: 현재 그려둔 path를 따라 연속 디코드
  const chwararak = async () => {
    if (!state.path?.length) return; // 경로가 없으면 무시
    let enc = state.cornerEncodings;
    if (!enc && corners) {
      enc = await encodeCorners(corners);
      dispatch({ type: "SET_CORNERS", encodings: enc });
    }
    if (!enc) return;

    // 경로를 30~60점 정도로 균일 재샘플링
    const pts = resamplePath(state.path, 40);
    dispatch({ type: "START_INTERPOLATE" });

    for (let i = 0; i < pts.length; i++) {
      const { x, y } = pts[i];
      // 온도 살짝 높여 변화감
      const pat = await decodeAtPosition(enc, x, y, 1.15);
      if (pat && onApplyPattern) onApplyPattern(pat);
      // 너무 빠르지 않게 프레임 간 간격
      await delay(70); // 70ms → 필요 시 50~120 사이로 조절
    }
    dispatch({ type: "END_INTERPOLATE" });
  };

  // 유틸들(로컬)
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const resamplePath = (path, target = 40) => {
    if (path.length <= 2) return path;
    // 누적 길이 계산
    const segLen = [];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i-1].x;
      const dy = path[i].y - path[i-1].y;
      const d = Math.hypot(dx, dy);
      segLen.push(d);
      total += d;
    }
    const out = [];
    for (let k = 0; k < target; k++) {
      const t = (k / Math.max(1, target - 1)) * total;
      // t에 해당하는 구간 찾기
      let acc = 0, idx = 0;
      while (idx < segLen.length && acc + segLen[idx] < t) {
        acc += segLen[idx++];
      }
      if (idx >= segLen.length) { out.push(path[path.length - 1]); break; }
      const u = (t - acc) / Math.max(1e-6, segLen[idx]);
      const a = path[idx], b = path[idx + 1];
      out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
    }
    return out;
  };

  return (
    <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
      <ButtonGroup size="small" variant="outlined">
        <Button onClick={() => setMode("CELL")} disabled={state.mode === "CELL"}>셀 모드</Button>
        <Button onClick={() => setMode("DRAW")} disabled={state.mode === "DRAW"}>그리기 모드</Button>
      </ButtonGroup>

      <Button size="small" variant="outlined" onClick={randomPick}>랜덤</Button>
      <Button size="small" variant="outlined" onClick={chwararak} disabled={!state.path?.length}>
        촤라락 전환
      </Button>

      <Typography variant="caption" sx={{ opacity: 0.7, ml: 1 }}>
        모드: {state.mode} / 경로점: {state.path?.length ?? 0}
      </Typography>
    </Stack>
  );
}
