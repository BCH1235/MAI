import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

const AudioWaveform = ({ 
  isPlaying = false, 
  progress = 0, 
  height = 80, 
  barCount = 50,
  color = '#8B5CF6'
}) => {
  const [bars, setBars] = useState([]);

  // 검은색 배경에 에메랄드 테마
  const colors = {
    primary: '#50E3C2',           // 에메랄드 (Emerald)
    secondary: '#40D9B8',         // 연한 에메랄드
    accent: '#2DD4BF',            // 터콰이즈 (Teal)
  };

  useEffect(() => {
    // 랜덤한 높이의 바들을 생성
    const newBars = Array.from({ length: barCount }, () => Math.random() * 0.8 + 0.2);
    setBars(newBars);
  }, [barCount]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 0.8 + 0.2));
    }, 150);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const progressBarIndex = Math.floor((progress / 100) * bars.length);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        height: height,
        padding: '10px',
        bgcolor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      {bars.map((barHeight, index) => (
        <Box
          key={index}
                      sx={{
              width: '3px',
              bgcolor: isPlaying && index <= progressBarIndex ? colors.primary : colors.secondary,
              borderRadius: '2px',
              transition: 'all 0.1s ease',
              height: `${barHeight * height * 0.8}px`,
              opacity: isPlaying && index <= progressBarIndex ? 1 : 0.6
            }}
          onClick={() => {
            // 클릭 시 해당 위치로 이동하는 로직 추가 가능
          }}
        />
      ))}
    </Box>
  );
};

export default AudioWaveform; 