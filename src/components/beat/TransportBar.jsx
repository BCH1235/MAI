// src/components/beat/TransportBar.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';

export default function TransportBar(props) {
  const {
    value,
    bpm: bpmProp,
    bars: barsProp,
    onChangeBpm,
    onChangeBars,
    onPlay,
    onStop,
    onClear,
    onExport,
    onSendToGenerate,
    busy = false,
    busyMsg = '',
  } = props;
  
  const colors = {
    accent: '#2DD4BF',
    background: '#0A0A0A',
    cardBg: '#1A1A1A',
    border: '#333333',
    text: '#FFFFFF',
    textLight: '#CCCCCC',
    shadow: 'rgba(45, 212, 191, 0.3)',
    // 변경점 1: 정지 버튼에 사용할 빨간색 추가
    danger: '#EF5350'
  };

  const initialBpm = useMemo(() => {
    if (typeof value?.bpm === 'number') return value.bpm;
    if (typeof bpmProp === 'number') return bpmProp;
    return 96;
  }, [value?.bpm, bpmProp]);

  const initialBars = useMemo(() => {
    if (typeof value?.bars === 'number') return value.bars;
    if (typeof barsProp === 'number') return barsProp;
    return 2;
  }, [value?.bars, barsProp]);

  const [bpmLocal, setBpmLocal] = useState(initialBpm);
  const [barsLocal, setBarsLocal] = useState(initialBars);

  useEffect(() => setBpmLocal(initialBpm), [initialBpm]);
  useEffect(() => setBarsLocal(initialBars), [initialBars]);

  const handleBpmChange = (e) => {
    const v = Math.max(40, Math.min(240, Number(e.target.value) || 0));
    setBpmLocal(v);
    onChangeBpm?.(v);
  };

  const handleBarsChange = (e) => {
    const raw = Number(e.target.value) || 1;
    const v = Math.max(1, Math.min(16, raw));
    setBarsLocal(v);
    onChangeBars?.(v);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 1 }}>
        <Tooltip title="재생">
          <span>
            <IconButton 
              color="primary" 
              onClick={onPlay} 
              disabled={busy} 
              size="large"
              sx={{ color: colors.accent, '&:hover': { backgroundColor: 'rgba(45, 212, 191, 0.1)' } }}
            >
              <PlayArrowIcon fontSize="large" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="정지">
          <span>
            {/* 변경점 1: 정지 버튼 색상을 빨간색으로 변경 */}
            <IconButton 
              onClick={onStop} 
              disabled={busy} 
              size="large"
              sx={{ color: colors.danger, '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.1)' } }}
            >
              <StopIcon fontSize="large" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="초기화">
          <span>
            <IconButton 
              onClick={onClear} 
              disabled={busy} 
              size="large"
              sx={{ color: colors.textLight, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            >
              <DeleteSweepIcon fontSize="large" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <TextField
          label="BPM"
          type="number"
          value={bpmLocal}
          onChange={handleBpmChange}
          inputProps={{ min: 40, max: 240 }}
          sx={{ 
            width: 120,
            '& .MuiInputBase-root': { bgcolor: '#111', color: colors.text, borderRadius: 2 },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border },
            '& .MuiInputLabel-root': { color: colors.textLight },
            '&.Mui-focused .MuiInputLabel-root': { color: colors.accent },
          }}
          disabled={busy}
        />
        <TextField
          label="마디"
          type="number"
          value={barsLocal}
          onChange={handleBarsChange}
          inputProps={{ min: 1, max: 16 }}
          sx={{ 
            width: 120,
            '& .MuiInputBase-root': { bgcolor: '#111', color: colors.text, borderRadius: 2 },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border },
            '& .MuiInputLabel-root': { color: colors.textLight },
            '&.Mui-focused .MuiInputLabel-root': { color: colors.accent },
          }}
          disabled={busy}
        />
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ ml: 'auto' }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onExport}
          disabled={busy}
          size="large"
          sx={{
            borderColor: colors.accent,
            color: colors.accent,
            '&:hover': {
              borderColor: colors.accent,
              backgroundColor: 'rgba(45, 212, 191, 0.1)'
            }
          }}
        >
          {/* 변경점 2: '(WAV)' 텍스트 제거 */}
          다운로드
        </Button>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={onSendToGenerate}
          disabled={busy}
          size="large"
          sx={{
            bgcolor: colors.accent,
            color: colors.background,
            '&:hover': {
              bgcolor: '#28bfa8'
            }
          }}
        >
          생성하기로 보내기
        </Button>
      </Stack>

      {busy ? (
        <Typography variant="body2" sx={{ ml: 2, opacity: 0.8 }}>
          {busyMsg || '처리 중...'}
        </Typography>
      ) : null}
    </Box>
  );
}