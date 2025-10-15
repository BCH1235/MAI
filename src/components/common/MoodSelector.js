import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Alert
} from '@mui/material';

// 분위기 옵션들
export const MOOD_OPTIONS = [
  { id: 'happy', label: '행복한' },
  { id: 'sad', label: '슬픈' },
  { id: 'energetic', label: '활기찬' },
  { id: 'calm', label: '차분한' },
  { id: 'romantic', label: '로맨틱한' },
  { id: 'peaceful', label: '평화로운' },
  { id: 'dark', label: '어두운' },
  { id: 'uplifting', label: '희망적인' },
  { id: 'melancholic', label: '우울한' },
  { id: 'playful', label: '장난스러운' },
  { id: 'intense', label: '강렬한' },
  { id: 'dreamy', label: '몽환적인' }
];

const MoodSelector = ({ 
  selectedMoods = [], 
  onMoodChange, 
  maxSelection = 3,  // 3개까지 선택 가능
  title = "분위기 선택" 
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

  const handleMoodClick = (moodId) => {
    let newMoods;
    
    if (selectedMoods.includes(moodId)) {
      newMoods = selectedMoods.filter(id => id !== moodId);
    } else {
      if (selectedMoods.length < maxSelection) {
        newMoods = [...selectedMoods, moodId];
      } else {
        return;
      }
    }
    
    onMoodChange(newMoods);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {MOOD_OPTIONS.map((mood) => (
          <Chip
            key={mood.id}
            label={mood.label}
            onClick={() => handleMoodClick(mood.id)}
            sx={{
              height: 42,
              fontSize: '0.9rem',
              fontWeight: 600,
              borderRadius: '20px',  
              bgcolor: selectedMoods.includes(mood.id) ? colors.primary : colors.cardBg,
              color: selectedMoods.includes(mood.id) ? '#FFFFFF' : colors.textLight,
              border: `2px solid ${selectedMoods.includes(mood.id) ? colors.primary : colors.border}`,
              '&:hover': {
                bgcolor: selectedMoods.includes(mood.id) ? colors.accent : colors.cardBg,
                color: '#FFFFFF',
                borderColor: selectedMoods.includes(mood.id) ? colors.accent : colors.border,
                transform: 'translateY(-2px)',
                boxShadow: `0 6px 16px ${colors.shadow}`
              },
              transition: 'all 0.3s ease-in-out',
            }}
          />
        ))}
      </Box>

      {selectedMoods.length === maxSelection && (
        <Alert 
          severity="info" 
          sx={{ 
            mt: 2,
            bgcolor: colors.primary,
            border: `1px solid ${colors.border}`,
            color: '#FFFFFF',
            '& .MuiAlert-icon': {
              color: '#FFFFFF'
            }
          }}
        >
          최대 {maxSelection}개의 분위기를 선택했습니다. 다른 분위기를 선택하려면 기존 선택을 해제해주세요.
        </Alert>
      )}
    </Box>
  );
};

export default MoodSelector; 