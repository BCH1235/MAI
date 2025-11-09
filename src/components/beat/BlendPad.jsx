// src/components/beat/BlendPad.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, FormControl, Select, MenuItem, Stack } from '@mui/material';
import { PATTERN_STEPS, PRESETS, TRACKS } from './presets';
import { loadDrumsVAE, encodeCorners, decodeAtPosition } from '../../lib/drumsVAE';

const weights = (x, y) => ({
  A: (1 - x) * (1 - y),
  B: x * (1 - y),
  C: (1 - x) * y,
  D: x * y,
});

// 단순 가중합 블렌딩(모델 실패 시 대비)
function blendPatterns(corners, x, y, thresh = 0.5) {
  const w = weights(x, y);
  const out = {};
  TRACKS.forEach((track) => {
    out[track] = Array.from({ length: PATTERN_STEPS }, (_, i) => {
      const v =
        (corners.A?.[track]?.[i] ? 1 : 0) * w.A +
        (corners.B?.[track]?.[i] ? 1 : 0) * w.B +
        (corners.C?.[track]?.[i] ? 1 : 0) * w.C +
        (corners.D?.[track]?.[i] ? 1 : 0) * w.D;
      return v >= thresh;
    });
  });
  return out;
}

export default function BlendPad({ colors, corners, onChangeCorners, onBlend }) {
  const padRef = useRef(null);
  const [pos, setPos] = useState({ x: 0.25, y: 0.25 });
  const [sel, setSel] = useState({
    A: 'Rock 1',
    B: 'Pop Punk',
    C: 'Reggaeton',
    D: 'Samba Full Time',
  });

  const presetNames = useMemo(() => Object.keys(PRESETS), []);

  const [modelReady, setModelReady] = useState(false);
  const encodedRef = useRef(null);
  const decBusyRef = useRef(false);

  // VAE 준비
  useEffect(() => {
    (async () => {
      try {
        await loadDrumsVAE();
        setModelReady(true);
      } catch (e) {
        console.warn('[BlendPad] VAE 로딩 실패 → 단순 블렌딩으로 동작합니다.', e);
        setModelReady(false);
      }
    })();
  }, []);

  // 코너 프리셋 셀렉터 → corners 변경
  useEffect(() => {
    const next = {
      A: PRESETS[sel.A],
      B: PRESETS[sel.B],
      C: PRESETS[sel.C],
      D: PRESETS[sel.D],
    };
    onChangeCorners?.(next);
  }, [sel, onChangeCorners]);

  // corners 바뀌면 잠복공간 인코딩
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!modelReady || !corners) return;
      try {
        const enc = await encodeCorners(corners);
        if (!cancelled) encodedRef.current = enc;
      } catch (e) {
        console.warn('[BlendPad] encodeCorners 실패', e);
        encodedRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modelReady, corners]);

  // 드래그/클릭 핸들러
  const to01 = (e) => {
    const r = padRef.current.getBoundingClientRect();
    const px = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const py = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    const x = Math.max(0, Math.min(1, (px - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (py - r.top) / r.height));
    return { x, y };
  };

  const triggerDecode = async (xy) => {
    // 동시 호출 방지
    if (decBusyRef.current) return;
    decBusyRef.current = true;

    try {
      let newPattern;
      if (modelReady && encodedRef.current) {
        newPattern = await decodeAtPosition(encodedRef.current, xy.x, xy.y, { temperature: 0.5 });
      } else {
        newPattern = blendPatterns(corners, xy.x, xy.y);
      }
      onBlend?.(newPattern);
    } catch (e) {
      console.warn('[BlendPad] decode 실패 → 단순 블렌딩', e);
      onBlend?.(blendPatterns(corners, xy.x, xy.y));
    } finally {
      decBusyRef.current = false;
    }
  };

  const onPointer = (e) => {
    const xy = to01(e);
    setPos(xy);
    triggerDecode(xy);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ color: colors.text, mb: 1 }}>
        패드 블렌딩
      </Typography>


      {/* Corner preset selectors arranged in a 2x2 grid */}
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          mb: 1,
          gridTemplateColumns: {
            xs: 'repeat(auto-fit, minmax(140px, 1fr))',
            sm: 'repeat(2, minmax(0, 1fr))',
          },
        }}
      >
        {(['A', 'B', 'C', 'D']).map((k) => (
          <FormControl key={k} size="small" sx={{ minWidth: 0 }}>
            <Select
              value={sel[k]}
              onChange={(e) => setSel((prev) => ({ ...prev, [k]: e.target.value }))}
              sx={{
                color: colors.text,
                bgcolor: colors.cardBg,
                border: `1px solid ${colors.border}`
              }}
            >
              {presetNames.map((name) => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
      </Box>

      {/* 패드 영역 */}
      <Box
        ref={padRef}
        onMouseDown={onPointer}
        onMouseMove={(e) => e.buttons === 1 && onPointer(e)}
        onTouchStart={onPointer}
        onTouchMove={onPointer}
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 2,
          border: `1px solid ${colors.border}`,
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '10% 100%, 100% 10%',
          backgroundColor: colors.cardBg,
          cursor: 'crosshair',
          mb: 1.5,
        }}
      >
        {/* 포인터 */}
        <Box
          sx={{
            position: 'absolute',
            left: `calc(${pos.x * 100}% - 8px)`,
            top: `calc(${pos.y * 100}% - 8px)`,
            width: 16,
            height: 16,
            borderRadius: 999,
            backgroundColor: colors.accent,
            boxShadow: `0 0 10px ${colors.shadow}`,
            pointerEvents: 'none',
          }}
        />
        {/* 코너 라벨 */}
        <CornerLabel label={`A: ${sel.A}`} pos={{ left: 8, top: 8 }} />
        <CornerLabel label={`B: ${sel.B}`} pos={{ right: 8, top: 8 }} />
        <CornerLabel label={`C: ${sel.C}`} pos={{ left: 8, bottom: 8 }} />
        <CornerLabel label={`D: ${sel.D}`} pos={{ right: 8, bottom: 8 }} />
      </Box>
    </Box>
  );
}

function CornerLabel({ label, pos }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        fontSize: 12,
        color: '#9aa7b3',
        opacity: 0.9,
        ...pos,
      }}
    >
      {label}
    </Box>
  );
}
