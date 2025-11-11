// src/components/beat/BlendPad.jsx
import React, { useMemo } from 'react';
import { Box, Typography, FormControl, Select, MenuItem } from '@mui/material';
import { PRESETS } from './presets';

// corners prop은 { A: 'Rock 1', ... } 형태의 프리셋 이름 매핑입니다.
export default function BlendPad({ colors, corners, onChangeCorners, children, showTitle = true }) {
  const presetNames = useMemo(() => Object.keys(PRESETS), []);

  return (
    <Box sx={{ color: colors.text }}>
      {showTitle && (
        <Typography variant="h6" sx={{ color: colors.text, mb: 1 }}>
          패드 블렌딩
        </Typography>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 1,
          mb: 2,
          gridTemplateColumns: {
            xs: 'repeat(auto-fit, minmax(140px, 1fr))',
            sm: 'repeat(2, minmax(0, 1fr))',
          },
        }}
      >
        {['A', 'B', 'C', 'D'].map((k) => (
          <FormControl key={k} size="small" sx={{ minWidth: 0 }}>
            <Select
              value={corners?.[k] ?? 'Rock 1'}
              onChange={(e) => onChangeCorners?.(k, e.target.value)}
              sx={{
                color: colors.text,
                bgcolor: colors.cardBg,
                border: `1px solid ${colors.border}`,
              }}
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

      {children}
    </Box>
  );
}
