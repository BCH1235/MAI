// src/pages/MusicConversion.js

import React, { useRef, useState } from 'react';
import { Box, Button, ButtonGroup, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import MusicNote from '@mui/icons-material/MusicNote';

import { BeatPadProvider } from '../state/beatPadStore';
import { useBeatMakerEngine } from '../hooks/useBeatMakerEngine';
import TransportBar from '../components/beat/TransportBar';
import BeatGrid from '../components/beat/BeatGrid';
import { clonePattern } from '../components/beat/presets';
import PathOverlay from '../components/beat/PathOverlay';
import BlendPadCanvas from '../components/beat/BlendPadCanvas';

const colors = {
  background: '#0A0A0A',
  cardBg: '#1A1A1A',
  primary: '#50E3C2',
  accent: '#2DD4BF',
  text: '#FFFFFF',
  textLight: '#CCCCCC',
  border: '#333333',
  shadow: 'rgba(80, 227, 194, 0.35)',
};

function BeatMaker() {
  const { state, actions } = useBeatMakerEngine();

  const handleToggle = (track, step) => {
    if (state.mode === 'EDIT') {
      actions.updateEditingPattern(track, step);
      return;
    }
    const newPattern = clonePattern(state.pattern);
    newPattern[track][step] = !newPattern[track][step];
    actions.setPattern(newPattern);
  };

  const displayedPattern =
    state.mode === 'EDIT' && state.selectedCorner
      ? state.cornerPatterns[state.selectedCorner]
      : state.pattern;

  const buttonStyles = {
    contained: {
      bgcolor: '#2DD4BF',
      color: '#0A0A0A',
      fontWeight: 600,
      '&:hover': {
        bgcolor: '#28bfa8',
      },
    },
    outlined: {
      borderColor: '#2DD4BF',
      color: '#2DD4BF',
      fontWeight: 600,
      '&:hover': {
        borderColor: '#2DD4BF',
        backgroundColor: 'rgba(45, 212, 191, 0.1)',
      },
    },
  };

  const drawingPathRef = useRef([]);
  const [isDrawing, setIsDrawing] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.background, pt: 4, pb: 4 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 4 } }}>
        <Typography
          variant="h4"
          sx={{
            color: colors.text,
            fontWeight: 800,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MusicNote sx={{ mr: 1, color: colors.accent }} />
          비트 만들기
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}` }}>
              <TransportBar
                bpm={state.bpm}
                onChangeBpm={actions.setBpm}
                onPlay={() => actions.setIsPlaying(true)}
                onStop={() => actions.setIsPlaying(false)}
                onClear={actions.clearPattern}
                onExport={actions.handleExport}
              />
            </Paper>
          </Grid>
        </Grid>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} alignItems="stretch">
          <Paper
            sx={{
              p: { xs: 1.5, md: 2 },
              bgcolor: colors.cardBg,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              flex: { lg: '0 0 440px' },
              width: '100%',
              minHeight: { lg: 560 },
              height: '100%',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" sx={{ color: colors.text }}>
                패드 블렌딩
              </Typography>
              {state.mode === "INTERPOLATE" ? (
                <Stack direction="row" spacing={1}>
                  <Button
                    onClick={() => actions.setDrawMode(state.drawMode === "PATH" ? "DRAG" : "PATH")}
                    variant={state.drawMode === "PATH" ? "contained" : "outlined"}
                    sx={state.drawMode === "PATH" ? buttonStyles.contained : buttonStyles.outlined}
                  >
                    그리기 모드
                  </Button>
                  <Button variant="contained" onClick={() => actions.setMode("EDIT")} sx={buttonStyles.contained}>
                    코너 편집하기
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    onClick={actions.handleDoneEditing}
                    disabled={state.isInterpolating}
                    sx={buttonStyles.contained}
                  >
                    {state.isInterpolating ? "계산 중..." : "완료"}
                  </Button>
                  <Button variant="outlined" onClick={() => actions.setMode("INTERPOLATE")} sx={buttonStyles.outlined}>
                    취소
                  </Button>
                </Stack>
              )}
            </Stack>

            {state.mode === "EDIT" && (
              <ButtonGroup size="small" sx={{ mb: 2 }}>
                {["A", "B", "C", "D"].map((corner) => (
                  <Button
                    key={corner}
                    variant={state.selectedCorner === corner ? "contained" : "outlined"}
                    onClick={() => actions.selectCorner(corner)}
                    sx={state.selectedCorner === corner ? buttonStyles.contained : buttonStyles.outlined}
                  >
                    코너 {corner}
                  </Button>
                ))}
              </ButtonGroup>
            )}
              <Box
                sx={{
                  position: 'relative',
                  flex: 1,
                  minHeight: { xs: 360, md: 460 },
                  borderRadius: 2,
                  border: `1px solid ${colors.border}`,
                  backgroundImage:
                    'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
                  backgroundSize: '10% 100%, 100% 10%',
                  backgroundColor: '#050505',
                  overflow: 'hidden',
                }}
              >
                <BlendPadCanvas
                  onBlend={state.mode === 'INTERPOLATE' ? actions.handleBlend : undefined}
                  disabled={state.mode !== 'INTERPOLATE'}
                  pathRef={drawingPathRef}
                  onDrawingChange={setIsDrawing}
                />
                <PathOverlay pathRef={drawingPathRef} isDrawing={isDrawing} />
              </Box>
            </Paper>

            {/* 오른쪽: 드럼 시퀀서 */}
            <Paper
              sx={{
                p: { xs: 1.5, md: 2 },
                bgcolor: '#111111',
                border: `1px solid ${colors.border}`,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: { lg: 560 },
                height: '100%',
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ color: colors.text }}>
                  비트 패턴
                </Typography>
                <Typography sx={{ color: colors.textLight }}>BPM {state.bpm}</Typography>
              </Stack>
              <Box sx={{ flexGrow: 1 }}>
                <BeatGrid
                  pattern={displayedPattern}
                  currentStep={state.currentStep}
                  onToggle={handleToggle}
                  cellHeight={42}
                  minCell={42}
                  labelWidth={48}
                  gap={4}
                />
              </Box>
            </Paper>
          </Stack>
       </Container>
     </Box>
  );
}

// 페이지 export 부분은 변경 없습니다.
export default function MusicConversionPage() {
  return (
    <BeatPadProvider>
      <BeatMaker />
    </BeatPadProvider>
  );
}
