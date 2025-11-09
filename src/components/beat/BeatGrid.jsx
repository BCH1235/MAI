// src/components/beat/BeatGrid.jsx
import React from 'react';
import { Box } from '@mui/material';
import { PATTERN_STEPS, TRACKS } from './presets';

function labelOf(key) {
  switch (key) {
    case 'kick': return 'Kick';
    case 'snare': return 'Snare';
    case 'hatC': return 'Hat (C)';
    case 'hatO': return 'Hat (O)';
    case 'tomL': return 'Tom (L)';
    case 'tomM': return 'Tom (M)';
    case 'tomH': return 'Tom (H)';
    case 'crash': return 'Crash';
    case 'ride': return 'Ride';
    default: return key;
  }
}

/**
 * props:
 *  - pattern, currentStep, onToggle (필수)
 *  - fullWidth?: boolean           // 컨테이너 가로 100%
 *  - minCell?: number              // 각 스텝의 최소 너비(px)
 *  - gap?: number                  // 스텝 사이 간격(px)
 *  - labelWidth?: number           // 좌측 라벨 영역 폭(px)
 */
export default function BeatGrid({
  pattern,
  currentStep,
  onToggle,
  fullWidth = true,
  minCell = 36,
  gap = 6,
  labelWidth = 90,
  cellHeight = 28,
}) {
  const cellH = cellHeight;
  const gapPx = Number.isFinite(gap) ? gap : 6;
  const gridMinWidth = labelWidth + PATTERN_STEPS * (minCell + gapPx);

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'grid',
          minWidth: `${gridMinWidth}px`,
          gridTemplateColumns: `${labelWidth}px repeat(${PATTERN_STEPS}, minmax(${minCell}px, 1fr))`,
          gap: { xs: '4px', md: `${gap}px` },
          alignItems: 'center',
          flex: 1,
          overflowX: 'auto',
          pb: 1,
        }}
      >
        {/* 헤더(1~16) */}
        <Box />
        {Array.from({ length: PATTERN_STEPS }).map((_, i) => (
          <Box key={`h${i}`} sx={{ textAlign: 'center', fontSize: { xs: 11, md: 12 }, color: '#9aa7b3' }}>
            {i + 1}
          </Box>
        ))}

        {/* 트랙 9줄 */}
        {TRACKS.map((trackName) => {
          const steps = Array.from({ length: PATTERN_STEPS }, (_, idx) => pattern[trackName]?.[idx] ?? false);
          return (
            <React.Fragment key={trackName}>
              <Box sx={{ color: '#ddd', fontWeight: 600, display: 'flex', alignItems: 'center', height: cellH }}>
                {labelOf(trackName)}
              </Box>

              {steps.map((on, step) => {
                const isNow = step === currentStep;
                return (
                  <Box
                    key={`${trackName}-${step}`}
                    onClick={() => onToggle(trackName, step)}
                    sx={{
                      cursor: 'pointer',
                      height: cellH,
                      borderRadius: 1,
                      border: '1px solid #333',
                      bgcolor: on ? (isNow ? '#2DD4BF' : '#1e8f7e') : (isNow ? '#333' : '#111'),
                      boxShadow: on ? '0 0 8px rgba(45,212,191,0.35)' : 'none',
                      transition: 'background-color .12s, box-shadow .12s',
                    }}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
}
