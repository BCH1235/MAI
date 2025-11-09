// src/pages/MusicConversion.js
import React, { useEffect, useRef, useState } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import MusicNote from '@mui/icons-material/MusicNote';

import TransportBar from '../components/beat/TransportBar';
import BeatGrid from '../components/beat/BeatGrid';
import BlendPad from '../components/beat/BlendPad';
import { createKit, SAMPLE_PATHS } from '../components/beat/SampleKit';
import { PRESETS, PATTERN_STEPS, clonePattern } from '../components/beat/presets';
import { getTone, ensureAudioStart } from '../lib/toneCompat';
import { audioBufferToWav } from '../lib/audioUtils';

const colors = {
  background: '#0A0A0A',
  cardBg: '#1A1A1A',
  primary: '#50E3C2',
  accent: '#2DD4BF',
  text: '#FFFFFF',
  textLight: '#CCCCCC',
  border: '#333333',
  shadow: 'rgba(80,227,194,0.35)',
};

const STEPS = PATTERN_STEPS;

export default function MusicConversion() {
  const [bpm, setBpm] = useState(96);
  const [measures, setMeasures] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // 초기 패턴
  const [pattern, setPattern] = useState(clonePattern(PRESETS['Rock 1']));
  const [corners, setCorners] = useState({
    A: PRESETS['Rock 1'],
    B: PRESETS['Pop Punk'],
    C: PRESETS['Reggaeton'],
    D: PRESETS['Samba Full Time'],
  });

  // 오디오 리소스
  const kitRef = useRef(null);         // { players, gain }
  const transportIdRef = useRef(null); // scheduleRepeat id
  const ToneRef = useRef(null);

  // Tone.js + 샘플 로딩
  useEffect(() => {
    (async () => {
      const Tone = await getTone();
      ToneRef.current = Tone;
      await ensureAudioStart(Tone);     // 사용자 제스처 뒤 시작 보장
      kitRef.current = await createKit(); // /public/samples/505/*.mp3 사용
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Tone.Transport.bpm.value = bpm;
    })();

    return () => {
      try {
        if (ToneRef.current) {
          ToneRef.current.Transport.stop();
          ToneRef.current.Transport.cancel();
        }
        if (kitRef.current) {
          kitRef.current.players?.dispose?.();
          kitRef.current.gain?.dispose?.();
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 패드 블렌드 → 그리드 교체
  const handleBlend = (newPattern) => setPattern(newPattern);

  // 셀 토글
  const handleToggle = (rowName, stepIdx) => {
    setPattern(prev => {
      const next = { ...prev, [rowName]: [...prev[rowName]] };
      next[rowName][stepIdx] = !next[rowName][stepIdx];
      return next;
    });
  };

  // ▶ 재생
  const handlePlay = async () => {
    const Tone = ToneRef.current;
    const kit = kitRef.current;
    if (!Tone || !kit) return;

    await ensureAudioStart(Tone);
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;

    // 내부 키 → Players 키 매핑(일부 축약키 보정)
    const keyMap = {
      // 동일
      kick: 'kick',
      snare: 'snare',
      crash: 'crash',
      ride: 'ride',
      // 축약/표기 차이 보정
      'Hat (C)': 'hatC',
      'Hat (O)': 'hatO',
      'Tom (L)': 'tomL',
      'Tom (M)': 'tomM',
      'Tom (H)': 'tomH',
      hatC: 'hatC',
      hatO: 'hatO',
      tomL: 'tomL',
      tomM: 'tomM',
      tomH: 'tomH',
      hatClose: 'hatC',
      hatOpen: 'hatO',
      tomLow: 'tomL',
      tomMid: 'tomM',
      tomHigh: 'tomH',
      Kick: 'kick',
      Snare: 'snare',
      Crash: 'crash',
      Ride: 'ride',
    };

    // 한 스텝 = 16분음표
    transportIdRef.current = Tone.Transport.scheduleRepeat((time) => {
      const step = (Tone.Transport.ticks % (Tone.Time('16n').toTicks() * STEPS)) / Tone.Time('16n').toTicks();

      Object.entries(pattern).forEach(([row, steps]) => {
        if (steps[Math.floor(step)]) {
          const k = keyMap[row] || row;
          try {
            kit.players.player(k).start(time);
          } catch {}
        }
      });

      // 진행 표시(오디오 스레드 밖)
      const next = (Math.floor(step) + 1) % STEPS;
      Tone.Draw.schedule(() => setCurrentStep(next), time);
    }, '16n');

    Tone.Transport.start('+0.03');
  };

  // ⏹ 정지
  const handleStop = () => {
    const Tone = ToneRef.current;
    if (!Tone) return;
    Tone.Transport.stop();
    Tone.Transport.cancel();
    setCurrentStep(0);
  };

  // 🧹 클리어
  const handleClear = () => {
    setPattern(prev => {
      const cleared = {};
      Object.keys(prev).forEach(k => (cleared[k] = Array(STEPS).fill(false)));
      return cleared;
    });
    setCurrentStep(0);
  };
  // Export the current pattern to a WAV file
  const handleExport = async () => {
    const Tone = ToneRef.current;
    if (!Tone) return;

    setIsExporting(true);
    try {
      const activeMeasures = Math.max(measures, 1);
      const exportDuration =
        Tone.Time(`${activeMeasures}m`).toSeconds() + Tone.Time('16n').toSeconds();

      const audioBuffer = await Tone.Offline(async ({ transport }) => {
        transport.bpm.value = bpm;

        const gain = new Tone.Gain(0.9).toDestination();
        const players = await new Promise((resolve, reject) => {
          const inst = new Tone.Players(SAMPLE_PATHS, {
            onload: () => resolve(inst),
            onerror: (name) => reject(new Error(`Sample load failed: ${name}`)),
          }).connect(gain);
        });

        const keyMap = {
          kick: 'kick',
          snare: 'snare',
          crash: 'crash',
          ride: 'ride',
          'Hat (C)': 'hatC',
          'Hat (O)': 'hatO',
          'Tom (L)': 'tomL',
          'Tom (M)': 'tomM',
          'Tom (H)': 'tomH',
          hatC: 'hatC',
          hatO: 'hatO',
          tomL: 'tomL',
          tomM: 'tomM',
          tomH: 'tomH',
          hatClose: 'hatC',
          hatOpen: 'hatO',
          tomLow: 'tomL',
          tomMid: 'tomM',
          tomHigh: 'tomH',
          Kick: 'kick',
          Snare: 'snare',
          Crash: 'crash',
          Ride: 'ride',
        };

        const stepSeconds = Tone.Time('16n').toSeconds();
        Object.entries(pattern).forEach(([row, steps]) => {
          const voice = keyMap[row] || row;
          let player;
          try {
            player = players.player(voice);
          } catch {
            player = null;
          }
          if (!player) return;

          const rowSteps = Array.isArray(steps) ? steps : Array(STEPS).fill(false);
          for (let measureIdx = 0; measureIdx < activeMeasures; measureIdx += 1) {
            rowSteps.forEach((active, stepIdx) => {
              if (!active) return;
              const time = (measureIdx * STEPS + stepIdx) * stepSeconds;
              transport.schedule((scheduledTime) => {
                try {
                  player.start(scheduledTime);
                } catch (err) {
                  console.warn(`[MusicConversion] Failed to start sample ${voice}`, err);
                }
              }, time);
            });
          }
        });

        transport.start(0);
      }, exportDuration);

      const wavBuffer = audioBufferToWav(audioBuffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beat-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[MusicConversion] Export failed', err);
      alert('Export failed. Please try again in a moment.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.background, pt: 4 }}>
      {/* 폭 확장: lg → xl, 좌우 여백 살짝 */}
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 5, xl: 6 } }}>
        <Typography variant="h4" sx={{ color: colors.text, fontWeight: 800, mb: 2 }}>
          <MusicNote sx={{ mr: 1, verticalAlign: 'middle', color: colors.accent }} />
          비트 만들기
        </Typography>

        {/* 재생바 */}
        <Box sx={{ mb: 2 }}>
          <TransportBar
            bpm={bpm}
            bars={measures}
            onChangeBpm={setBpm}
            onChangeBars={setMeasures}
            onPlay={handlePlay}
            onStop={handleStop}
            onClear={handleClear}
            onExport={handleExport}
            busy={isExporting}
            busyMsg="Rendering..."
          />
        </Box>

        {/* ??? ???? ?? ?????? ?? */}
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, md: 3 },
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(340px, 480px) minmax(0, 2.4fr)',
              lg: 'minmax(360px, 520px) minmax(0, 3fr)',
              xl: 'minmax(380px, 560px) minmax(0, 3.4fr)',
            },
            alignItems: 'stretch',
            width: '100%',
            maxWidth: 'min(1400px, 100%)',
            mx: 'auto',
          }}
        >
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              bgcolor: colors.cardBg,
              border: `1px solid ${colors.border}`,
              height: '100%',
              minWidth: 0,
            }}
          >
            <BlendPad
              colors={colors}
              corners={corners}
              onChangeCorners={setCorners}
              onBlend={handleBlend}
            />
          </Paper>

          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              bgcolor: colors.cardBg,
              border: `1px solid ${colors.border}`,
              height: '100%',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
              <BeatGrid
                pattern={pattern}
                currentStep={currentStep}
                onToggle={handleToggle}
                fullWidth
                minCell={48}
                gap={10}
                labelWidth={110}
                cellHeight={34}
              />
            </Box>
          </Paper>
        </Box>

      </Container>
    </Box>
  );
}
