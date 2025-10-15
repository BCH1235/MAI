// src/components/beat/BeatGrid.jsx

import React from 'react';
// 사용하지 않는 Typography를 import 목록에서 제거했습니다.
import { Box } from '@mui/material';
import { TRACKS } from './presets';

function labelOf(key) {
  switch (key) {
    case 'kick': return 'Kick';
    case 'snare': return 'Snare';
    case 'hatClose': return 'Hat (C)';
    case 'hatOpen': return 'Hat (O)';
    case 'tomLow': return 'Tom (L)';
    case 'tomMid': return 'Tom (M)';
    case 'tomHigh': return 'Tom (H)';
    case 'crash': return 'Crash';
    case 'ride': return 'Ride';
    default: return key;
  }
}

export default function BeatGrid({ pattern, currentStep, onToggle }) {
  // 사용하지 않는 mainTracks와 subTracks 변수를 제거했습니다.

  return (
    // 전체를 감싸는 Box에서 flex 레이아웃을 제거하여 단순화했습니다.
    <Box>
      {/* 16칸짜리 메인 시퀀서 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '80px repeat(16, 1fr)', gap: '4px' /* 칸 사이 간격을 살짝 줍니다 */ }}>
        {/* 헤더 */}
        <Box />
        {Array.from({ length: 16 }).map((_, i) => (
          <Box key={`h${i}`} sx={{ textAlign: 'center', fontSize: 12, color: '#aaa' }}>{i + 1}</Box>
        ))}
        
        {/* 9줄을 모두 렌더링하는 로직은 그대로 유지합니다. */}
        {TRACKS.map((trackName) => (
          <React.Fragment key={trackName}>
            <Box sx={{ color: '#ddd', fontWeight: 600, display: 'flex', alignItems: 'center', height: 28 }}>
              {labelOf(trackName)}
            </Box>
            {(pattern[trackName] || []).map((on, step) => {
              const isNow = step === currentStep;
              return (
                <Box
                  key={`${trackName}-${step}`}
                  onClick={() => onToggle(trackName, step)}
                  sx={{
                    cursor: 'pointer',
                    height: 28,
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
        ))}
      </Box>
    </Box>
  );
}