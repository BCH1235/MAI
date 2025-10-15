import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid
} from '@mui/material';

// 장르 옵션들 (실제 이미지 파일 경로 포함)
export const GENRE_CARD_OPTIONS = [
  { 
    id: 'classic', 
    label: '클래식', 
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    image: '/images/genres/classic.jpg', // 실제 이미지 경로
    fallbackIcon: '🎼'
  },
  { 
    id: 'edm', 
    label: 'EDM', 
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    image: '/images/genres/edm.jpg',
    fallbackIcon: '🎛️'
  },
  { 
    id: 'citypop', 
    label: 'City pop', 
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    image: '/images/genres/citypop.jpg',
    fallbackIcon: '🌃'
  },
  { 
    id: 'jazz', 
    label: '재즈', 
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    image: '/images/genres/jazz.jpg',
    fallbackIcon: '🎷'
  },
  { 
    id: 'lofi', 
    label: 'Lo-Fi', 
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    image: '/images/genres/lofi.jpg',
    fallbackIcon: '🎧'
  }
];
  
// 이미지 컴포넌트 (이미지 로드 실패 시 fallback)
const GenreImage = ({ genre }) => {
  const [imageError, setImageError] = useState(false);
  
  if (imageError) {
    // 이미지 로드 실패 시 그라디언트와 아이콘 표시
    return (
      <Box
        sx={{
          height: 140, // 더 큰 높이
          background: genre.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Typography
          sx={{
            fontSize: '3rem', // 더 큰 아이콘
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}
        >
          {genre.fallbackIcon}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box
      sx={{
        height: 140, // 더 큰 높이
        position: 'relative',
        overflow: 'hidden',
        background: genre.gradient
      }}
    >
      <img
        src={genre.image}
        alt={genre.label}
        onError={() => setImageError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
    </Box>
  );
};

const GenreCardSelector = ({  
selectedGenres = [], 
onGenreChange, 
maxSelection = 1
}) => {
  const colors = {
    cardBg: '#1A1A1A',
    text: '#FFFFFF',
    border: '#333333',
    accent: '#FFD700'
  };

  const handleGenreClick = (genreId) => {
    let newGenres;
    
    if (selectedGenres.includes(genreId)) {
      newGenres = selectedGenres.filter(id => id !== genreId);
    } else {
      if (maxSelection === 1) {
        newGenres = [genreId];
      } else {
        if (selectedGenres.length < maxSelection) {
          newGenres = [...selectedGenres, genreId];
        } else {
          return;
        }
      }
    }
    
    onGenreChange(newGenres);
  };

  return (
    <Grid container spacing={3}> {/* spacing 증가 */}
      {GENRE_CARD_OPTIONS.map((genre) => (
        <Grid item xs={12} sm={6} md={6} key={genre.id}> {/* 더 넓은 그리드 크기 */}
          <Card
            onClick={() => handleGenreClick(genre.id)}
            sx={{
              cursor: 'pointer',
              borderRadius: 4, // 더 둥근 모서리
              overflow: 'hidden',
              border: selectedGenres.includes(genre.id) 
                ? `3px solid ${colors.accent}` 
                : 'none', // 선택 안된 카드는 테두리 없음
              outline: 'none', // 아웃라인도 제거
              boxShadow: selectedGenres.includes(genre.id) ? undefined : 'none', // 선택 안된 카드는 그림자도 제거
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: `0 12px 35px rgba(255, 215, 0, 0.4)`
              },
              position: 'relative',
              height: '100%' // 카드 전체 높이 사용
            }}
          >
            {/* 배경 이미지 */}
            <Box sx={{ position: 'relative' }}>
              <GenreImage genre={genre} />
              
              {/* 선택된 경우 오버레이 */}
              {selectedGenres.includes(genre.id) && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: 'rgba(255, 215, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Box
                    sx={{
                      width: 32, // 더 큰 체크마크
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: colors.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000000',
                      fontWeight: 'bold',
                      fontSize: '1.2rem'
                    }}
                  >
                    ✓
                  </Box>
                </Box>
              )}
            </Box>
            
            {/* 장르 이름 */}
            <CardContent 
              sx={{ 
                p: 2.5, // 더 큰 패딩
                bgcolor: colors.cardBg,
                '&:last-child': { pb: 2.5 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 80, // 더 큰 텍스트 영역
                border: 'none', // 테두리 제거
                borderTop: 'none' // 상단 테두리도 제거
              }}
            >
              <Typography
                variant="h6" // 더 큰 텍스트
                sx={{
                  color: colors.text,
                  fontWeight: 600,
                  textAlign: 'center',
                  fontSize: '1.1rem'
                }}
              >
                {genre.label}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default GenreCardSelector;