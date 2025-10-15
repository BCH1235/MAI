import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Alert
} from '@mui/material';

// 장르 옵션들
export const GENRE_OPTIONS = [
  { id: 'classic', label: '클래식' },
  { id: 'edm', label: 'EDM' },
  { id: 'citypop', label: 'City pop' },
  { id: 'jazz', label: '재즈' },
  { id: 'lofi', label: 'Lo-Fi' }
];

const GenreSelector = ({ 
  selectedGenres = [], 
  onGenreChange, 
  maxSelection = 1,  // 하나만 선택 가능
  title = "장르 선택" 
}) => {
  // 검은색 배경에 에메랄드 테마  
  const colors = {
    background: '#0A0A0A',         // 검은색 배경
    cardBg: '#1A1A1A',            // 어두운 카드 배경
    primary: '#50E3C2',           // 에메랄드 (Emerald)
    secondary: '#40D9B8',         // 연한 에메랄드
    accent: '#2DD4BF',            // 터콰이즈 (Teal)
    text: '#FFFFFF',              // 흰색 텍스트
    textLight: '#CCCCCC',         // 연한 회색 텍스트
    border: '#333333',            // 어두운 테두리
    shadow: 'rgba(80, 227, 194, 0.3)' // 에메랄드 그림자
  };

  const handleGenreClick = (genreId) => {
    // 장르는 하나만 선택 가능
    const newGenres = selectedGenres.includes(genreId) ? [] : [genreId];
    onGenreChange(newGenres);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {GENRE_OPTIONS.map((genre) => (
          <Chip
            key={genre.id}
            label={genre.label}
            onClick={() => handleGenreClick(genre.id)}
            sx={{
              height: 42,
              fontSize: '0.9rem',
              fontWeight: 600,
              borderRadius: '12px',
              color: selectedGenres.includes(genre.id) ? colors.background : colors.text,
              bgcolor: selectedGenres.includes(genre.id) ? colors.primary : 'transparent',
              borderColor: selectedGenres.includes(genre.id) ? colors.primary : colors.border,
              '&:hover': {
                bgcolor: selectedGenres.includes(genre.id) ? colors.secondary : colors.cardBg,
                borderColor: colors.primary
              },
              transition: 'all 0.3s ease-in-out',
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default GenreSelector; 