// src/components/home/TrackCard.jsx
import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';

const colors = {
  background: '#0A0A0A',
  cardBg: '#1A1A1A',
  primary: '#50E3C2',
  text: '#FFFFFF',
  textLight: '#9CA3AF',
  border: '#27272A',
};

function TrackCard({ track }) {
  // track 구조는 2단계에서 Firestore 데이터 형식에 맞춰서 확정할 거야.
  // 지금은 안전하게 "없으면 기본 문구" 정도만.
  const title = track?.title || '제목 없는 배경음';
  const ownerName = track?.ownerName || '알 수 없는 사용자';
  const genres = track?.genres || [];
  const moods = track?.moods || [];
  const durationLabel = track?.durationLabel || '';

  return (
    <Card
      sx={{
        bgcolor: colors.cardBg,
        borderRadius: 2,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* 재생 버튼 (실제 재생 로직은 나중 단계에서) */}
          <IconButton
            sx={{
              bgcolor: colors.primary,
              color: '#000',
              '&:hover': { bgcolor: '#40D9B8' },
            }}
            size="large"
          >
            <PlayArrow />
          </IconButton>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              noWrap
              sx={{ color: colors.text, fontWeight: 600 }}
            >
              {title}
            </Typography>
            <Typography
              variant="body2"
              noWrap
              sx={{ color: colors.textLight, mt: 0.5 }}
            >
              {ownerName}
            </Typography>

            {/* 장르/분위기/길이 태그 영역 */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {genres.map((g) => (
                <Chip
                  key={`genre-${g}`}
                  label={g}
                  size="small"
                  sx={{
                    bgcolor: '#111827',
                    color: colors.textLight,
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
              ))}
              {moods.map((m) => (
                <Chip
                  key={`mood-${m}`}
                  label={m}
                  size="small"
                  sx={{
                    bgcolor: '#111827',
                    color: colors.textLight,
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
              ))}
              {durationLabel && (
                <Chip
                  label={durationLabel}
                  size="small"
                  sx={{
                    bgcolor: '#0F172A',
                    color: colors.textLight,
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default TrackCard;
