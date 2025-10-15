import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Box, Typography, FormControl, Select, MenuItem, Stack } from '@mui/material';
import { PRESETS, clonePattern, TRACKS } from './presets';
import { loadDrumsVAE, encodeCorners, decodeAtPosition } from '../../lib/drumsVAE';

const weights = (x, y) => ({
  A: (1 - x) * (1 - y),
  B: x * (1 - y),
  C: (1 - x) * y,
  D: x * y,
});

function blendPatterns(corners, x, y, thresh = 0.5) {
  const w = weights(x, y);
  const out = {};
  TRACKS.forEach((trackName) => {
    out[trackName] = Array.from({ length: 16 }, (_, i) => {
      const valA = corners.A?.[trackName]?.[i] ? 1 : 0;
      const valB = corners.B?.[trackName]?.[i] ? 1 : 0;
      const valC = corners.C?.[trackName]?.[i] ? 1 : 0;
      const valD = corners.D?.[trackName]?.[i] ? 1 : 0;
      const v = w.A * valA + w.B * valB + w.C * valC + w.D * valD;
      return v >= thresh;
    });
  });
  return out;
}

function useDebouncedCallback(fn, delay = 120) {
  const tRef = useRef(null);
  return (...args) => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => fn(...args), delay);
  };
}

export default function BlendPad({ colors, corners, onChangeCorners, onBlend }) {
  const padRef = useRef(null);
  const [pos, setPos] = useState({ x: 0.2, y: 0.3 });
  const [dragging, setDragging] = useState(false);
  const [sel, setSel] = useState({
    A: 'Rock 1',
    B: 'Pop Punk',
    C: 'Reggaeton',
    D: 'Samba Full Time',
  });
  const presetNames = useMemo(() => Object.keys(PRESETS), []);

  const [modelReady, setModelReady] = useState(false);
  const [encoded, setEncoded] = useState(null);
  const [decoding, setDecoding] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadDrumsVAE();
        if (mounted) setModelReady(true);
      } catch (e) {
        console.warn('[BlendPad] VAE 로딩 실패, 단순 블렌딩으로 전환합니다.', e);
        if (mounted) {
          setModelReady(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!modelReady) return;
    let cancelled = false;
    (async () => {
      try {
        const enc = await encodeCorners(corners);
        if (!cancelled) setEncoded(enc);
      } catch (e) {
        console.warn('[BlendPad] 인코딩 실패, 단순 블렌딩으로 전환합니다.', e);
        if (!cancelled) {
          setEncoded(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [corners, modelReady]);

  const getXY = useCallback(
    (clientX, clientY) => {
      const el = padRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      return { x, y };
    },
    [padRef]
  );

  const debouncedDecode = useDebouncedCallback(async (p) => {
    if (!modelReady || !encoded) return;
    setDecoding(true);
    try {
      const pat = await decodeAtPosition(encoded, p.x, p.y, 0.85);
      onBlend(pat);
    } catch (e) {
      onBlend(blendPatterns(corners, p.x, p.y));
    } finally {
      setDecoding(false);
    }
  }, 120);

  const handleInteraction = useCallback(
    (e) => {
      const p = getXY(e.clientX, e.clientY);
      if (!p) return;
      setPos(p);
      if (modelReady && encoded) {
        debouncedDecode(p);
      } else {
        onBlend(blendPatterns(corners, p.x, p.y));
      }
    },
    [modelReady, encoded, corners, onBlend, debouncedDecode, getXY]
  );

  const startDrag = (e) => {
    setDragging(true);
    handleInteraction(e);
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging) return;
      handleInteraction(e);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, handleInteraction]);

  const handlePreset = (key, name) => {
    if (!name) return;
    const next = { ...corners, [key]: clonePattern(PRESETS[name]) };
    onChangeCorners(next);
    setSel((s) => ({ ...s, [key]: name }));
    const p = pos;
    onBlend(blendPatterns(next, p.x, p.y));
  };

  return (
    <Stack
      spacing={2}
      sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
    >
      <Box
        ref={padRef}
        onMouseDown={startDrag}
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          flex: '0 0 auto',
          borderRadius: 2,
          border: `1px solid ${colors.border}`,
          background:
            'linear-gradient(to bottom right, #a7b0fb, #e481f8, #a5f9d1, #ccf799)',
          overflow: 'hidden',
          userSelect: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        title="드래그해서 블렌딩"
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
          }}
        />
        <CornerLabel pos="topLeft" label="A" colors={colors} />
        <CornerLabel pos="topRight" label="B" colors={colors} />
        <CornerLabel pos="bottomLeft" label="C" colors={colors} />
        <CornerLabel pos="bottomRight" label="D" colors={colors} />
        <Box
          sx={{
            position: 'absolute',
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '2px solid white',
            background: 'transparent',
            left: `calc(${pos.x * 100}% - 12px)`,
            top: `calc(${pos.y * 100}% - 12px)`,
            boxShadow: dragging
              ? `0 0 25px rgba(255,255,255,0.8)`
              : `0 0 15px rgba(0,0,0,0.5)`,
            transition: 'box-shadow 0.2s ease-in-out',
            pointerEvents: 'none',
          }}
        />
        {decoding && (
          <Box
            sx={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              fontSize: 12,
              color: colors.text,
              bgcolor: 'rgba(0,0,0,.4)',
              border: `1px solid ${colors.border}`,
              borderRadius: 1,
              px: 1,
              py: 0.25,
            }}
          >
            AI 계산 중...
          </Box>
        )}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
          mt: 'auto',
          minWidth: 0,
          '& .MuiFormControl-root': { minWidth: 0 },
          '& .MuiFilledInput-root': { minWidth: 0, overflow: 'hidden' },
          '& .MuiSelect-select': {
            display: 'block',
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            pr: 4,
          },
        }}
      >
        {['A', 'B', 'C', 'D'].map((k) => (
          <FormControl
            key={k}
            fullWidth
            variant="filled"
            size="small"
            sx={{ bgcolor: '#222', borderRadius: 1, minWidth: 0 }}
          >
            <Typography sx={{ color: colors.textLight, fontSize: 12, mb: 0.5, mx: 1, mt: 1 }}>
              Corner {k}
            </Typography>
            <Select
              value={sel[k] || ''}
              onChange={(e) => handlePreset(k, e.target.value)}
              renderValue={(value) => (
                <Typography
                  component="span"
                  sx={{
                    display: 'block',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: colors.text,
                  }}
                >
                  {value || 'Preset 선택'}
                </Typography>
              )}
              displayEmpty
              fullWidth
              sx={{ color: colors.text, minWidth: 0 }}
              MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: colors.text } } }}
            >
              {presetNames.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
      </Box>
    </Stack>
  );
}

function CornerLabel({ pos, label, colors }) {
  const style = {
    position: 'absolute',
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    px: 1,
    py: 0.25,
    borderRadius: 1,
    bgcolor: 'rgba(0,0,0,.35)',
    border: `1px solid rgba(255,255,255,0.2)`,
  };
  const map = {
    topLeft: { left: 12, top: 10 },
    topRight: { right: 12, top: 10 },
    bottomLeft: { left: 12, bottom: 10 },
    bottomRight: { right: 12, bottom: 10 },
  };
  return <Box sx={{ ...style, ...map[pos] }}>{label}</Box>;
}
