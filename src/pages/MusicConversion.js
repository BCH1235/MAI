// src/pages/MusicConversion.js

import React, { useRef, useState } from 'react';
import { Box, Button, ButtonGroup, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import MusicNote from '@mui/icons-material/MusicNote';

import { BeatPadProvider } from '../state/beatPadStore';
import { useBeatMakerEngine } from '../hooks/useBeatMakerEngine';
import TransportBar from '../components/beat/TransportBar';
import BeatGrid from '../components/beat/BeatGrid';
import BlendPad from '../components/beat/BlendPad';
import { clonePattern } from '../components/beat/presets';
import PadToolbar from '../components/beat/PadToolbar';
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
      <Container maxWidth="xl">
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

        <Grid container spacing={3} sx={{ mb: 1 }}>
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

        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Paper
              sx={{
                p: { xs: 2, md: 3 },
                bgcolor: colors.cardBg,
                border: `1px solid ${colors.border}`,
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Typography variant="h6" sx={{ color: colors.text, mb: 2 }}>
                패드 블렌딩
              </Typography>

              {state.mode === "INTERPOLATE" ? (
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Button
                    onClick={() => actions.setDrawMode(state.drawMode === "PATH" ? "DRAG" : "PATH")}
                    variant={state.drawMode === "PATH" ? "contained" : "outlined"}
                    sx={
                      state.drawMode === "PATH"
                        ? buttonStyles.contained
                        : buttonStyles.outlined
                    }
                  >
                    그리기 모드
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => actions.setMode("EDIT")}
                    sx={buttonStyles.contained}
                  >
                    코너 편집하기
                  </Button>
                </Stack>
              ) : (
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Button
                      variant="contained"
                      onClick={actions.handleDoneEditing}
                      disabled={state.isInterpolating}
                      sx={buttonStyles.contained}
                    >
                      {state.isInterpolating ? "계산 중..." : "완료"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => actions.setMode("INTERPOLATE")}
                      sx={buttonStyles.outlined}
                    >
                      취소
                    </Button>
                  </Stack>
                  <Typography sx={{ color: colors.text, mb: 1 }}>
                    편집할 코너 선택:
                  </Typography>
                  <ButtonGroup size="small">
                    {["A", "B", "C", "D"].map((corner) => (
                      <Button
                        key={corner}
                        variant={state.selectedCorner === corner ? "contained" : "outlined"}
                        onClick={() => actions.selectCorner(corner)}
                        sx={
                          state.selectedCorner === corner
                            ? buttonStyles.contained
                            : buttonStyles.outlined
                        }
                      >
                        코너 {corner}
                      </Button>
                    ))}
                  </ButtonGroup>
                </Box>
              )}

              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  flexGrow: 1,
                  minHeight: 320,
                  borderRadius: 2,
                  border: `1px solid ${colors.border}`,
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
                  backgroundSize: "10% 100%, 100% 10%",
                  backgroundColor: "#050505",
                  overflow: "hidden",
                }}
              >
                <BlendPadCanvas
                  onBlend={state.mode === "INTERPOLATE" ? actions.handleBlend : undefined}
                  disabled={state.mode !== "INTERPOLATE"}
                  pathRef={drawingPathRef}
                  onDrawingChange={setIsDrawing}
                />
                <PathOverlay pathRef={drawingPathRef} isDrawing={isDrawing} />
              </Box>
            </Paper>
          </Grid>

          {/* 오른쪽: 드럼 시퀀서 */}
          <Grid item xs={12} md={7}>
            <Paper
              sx={{
                p: { xs: 2, md: 3 },
                bgcolor: colors.cardBg,
                border: `1px solid ${colors.border}`,
                height: '100%',
              }}
            >
              <BeatGrid pattern={displayedPattern} currentStep={state.currentStep} onToggle={handleToggle} />
            </Paper>
          </Grid>
        </Grid>
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
