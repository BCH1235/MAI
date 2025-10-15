import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import MusicNote from '@mui/icons-material/MusicNote';
import { useNavigate } from 'react-router-dom';

import TransportBar from '../components/beat/TransportBar';
import BeatGrid from '../components/beat/BeatGrid';
import BlendPad from '../components/beat/BlendPad';
import { createKit } from '../components/beat/SampleKit';
import { PRESETS, clonePattern, TRACKS } from '../components/beat/presets';
import { downloadBlob } from '../utils/audioExport';
import { getTone, ensureAudioStart } from '../lib/toneCompat';
import { useMusicContext } from '../context/MusicContext';
import { saveBeatItem } from '../services/libraryWriter';

const colors = {
  background: '#0A0A0A',
  cardBg: '#1A1A1A',
  primary: '#50E3C2',
  accent: '#2DD4BF',
  text: '#FFFFFF',
  textLight: '#CCCCCC',
  border: '#333333',
};

const STEPS = 16;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const blobToDataURL = (blob) =>
  new Promise((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });

export default function MusicConversion() {
  const navigate = useNavigate();
  const { state, actions } = useMusicContext();
  const [pattern, setPattern] = useState(clonePattern(PRESETS['Four on the floor']));
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(96);
  const [bars, setBars] = useState(2);
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState('');

  const [corners, setCorners] = useState({
    A: clonePattern(PRESETS['Rock 1']),
    B: clonePattern(PRESETS['Pop Punk']),
    C: clonePattern(PRESETS['Reggaeton']),
    D: clonePattern(PRESETS['Samba Full Time']),
  });

  const kitRef = useRef(null);
  const seqRefs = useRef({});
  const [isKitReady, setIsKitReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    createKit({ volume: -6 }).then(kit => {
      if (mounted) {
        kitRef.current = kit;
        setIsKitReady(true);
      }
    });
    return () => {
      mounted = false;
      kitRef.current?.dispose();
      Object.values(seqRefs.current).forEach((s) => s?.dispose?.());
    };
  }, []);

  useEffect(() => {
    async function updateBpm() {
      const Tone = await getTone();
      if (Tone?.Transport?.bpm?.value != null) {
        Tone.Transport.bpm.value = bpm;
      }
    }
    updateBpm();
  }, [bpm]);

  const onToggle = (track, step) => {
    setPattern((p) => {
      const copy = clonePattern(p);
      copy[track][step] = !copy[track][step];
      return copy;
    });
  };

  const stopAll = async () => {
    const Tone = await getTone();
    Tone?.Transport?.stop?.();
    if (Tone?.Transport) Tone.Transport.position = 0;
    setCurrentStep(-1);
    Object.values(seqRefs.current).forEach((s) => s?.dispose?.());
    seqRefs.current = {};
  };

  const startPlay = async () => {
    if (!isKitReady) return;
    const Tone = await getTone();
    await ensureAudioStart(Tone);
    await stopAll();
    const kit = kitRef.current;
    if (!kit) return;

    TRACKS.forEach((t) => {
      const seq = new Tone.Sequence(
        (time, i) => {
          if (pattern[t] && pattern[t][i]) kit.trigger(t, time);
          Tone.Draw.schedule(() => {
            setCurrentStep(i);
          }, time);
        },
        Array.from({ length: STEPS }, (_, i) => i),
        '16n'
      );
      seq.start(0);
      seqRefs.current[t] = seq;
    });
    Tone.Transport.start('+0.03');
  };

  const renderBeatToWavBlob = async () => {
    if (!isKitReady) return null;
    setBusy(true);
    setBusyMsg('녹음 중...');
    const Tone = await getTone();
    await ensureAudioStart(Tone);
    await stopAll();
    const kit = kitRef.current;
    if (!kit) return null;
    TRACKS.forEach((t) => {
      const seq = new Tone.Sequence(
        (time, i) => {
          if (pattern[t] && pattern[t][i]) {
            kit.trigger(t, time);
          }
        },
        Array.from({ length: STEPS }, (_, i) => i),
        '16n'
      );
      seq.start(0);
      seqRefs.current[t] = seq;
    });
    if (Tone?.Transport?.bpm?.value != null) {
      Tone.Transport.bpm.value = bpm;
    }
    const recorder = new Tone.Recorder();
    Tone.Destination.connect(recorder);
    recorder.start();
    Tone.Transport.start('+0.03');
    const secondsPerBeat = 60 / bpm;
    const totalSec = Math.max(1, bars) * (secondsPerBeat * 4);
    await wait(totalSec * 1000 + 200);
    const wavBlob = await recorder.stop();
    Tone.Destination.disconnect(recorder);
    await stopAll();
    setBusy(false);
    setBusyMsg('');
    return wavBlob;
  };

  const saveBeatToLibrary = async (wavBlob, titleHint) => {
    const user = state.auth.user;
    if (!wavBlob || !user) return false;
    try {
      const title = `${titleHint || 'My Beat'}_${bpm}bpm_${Date.now()}`;
      await saveBeatItem({
        ownerId: user.uid,
        title,
        bpm,
        bars,
        pattern,
        audioBlob: wavBlob,
        presetMeta: null,
      });
      actions.addNotification({ type: 'success', message: '비트가 라이브러리에 저장되었습니다!' });
      return true;
    } catch (error) {
      console.warn('[MusicConversion] save beat error', error);
      actions.addNotification({ type: 'warning', message: '비트를 저장하지는 못했지만 파일은 준비되었어요.' });
      return false;
    }
  };

  const exportWav = async () => {
    const wavBlob = await renderBeatToWavBlob();
    if (!wavBlob) return;
    const user = state.auth.user;
    if (user) {
      await saveBeatToLibrary(wavBlob, 'Beat');
    } else {
      actions.addNotification({ type: 'info', message: '로그인하면 만든 비트를 라이브러리에 저장할 수 있어요.' });
    }
    downloadBlob(wavBlob, `my-beat-${bpm}bpm-${bars}bars.wav`);
  };

  const sendToGenerate = async () => {
    const wavBlob = await renderBeatToWavBlob();
    if (wavBlob) {
      const user = state.auth.user;
      if (user) {
        await saveBeatToLibrary(wavBlob, 'Beat');
      }
      setBusy(true);
      setBusyMsg('보내는 중...');
      const dataUrl = await blobToDataURL(wavBlob);
      setBusy(false);
      setBusyMsg('');
      sessionStorage.setItem('inlineReferenceAudio', dataUrl);
      navigate('/generate');
    }
  };

  const colorsMemo = useMemo(() => colors, []);

  const onClear = () => {
    const emptyPattern = {};
    TRACKS.forEach(track => {
      emptyPattern[track] = Array(STEPS).fill(false);
    });
    setPattern(emptyPattern);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colorsMemo.background, py: 6 }}>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          sx={{ color: colorsMemo.text, fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center' }}
        >
          <MusicNote sx={{ mr: 1, color: colorsMemo.primary }} />
          비트 만들기
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 3, md: 4 },
            alignItems: 'stretch',
            flexWrap: { xs: 'wrap', md: 'nowrap' },
          }}
        >
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 1 420px', lg: '0 1 460px' }, minWidth: 0 }}>
            <Paper
              elevation={0}
              sx={{
                bgcolor: colorsMemo.cardBg, p: 3, borderRadius: 3, border: `1px solid ${colorsMemo.border}`,
                display: 'flex', flexDirection: 'column', height: '100%',
                minWidth: 0, overflow: 'hidden',
              }}
            >
              <Typography variant="h6" sx={{ color: colorsMemo.text, fontWeight: 600, mb: 2, flexShrink: 0 }}>
                패드 블렌딩
              </Typography>
              <BlendPad
                colors={colorsMemo}
                corners={corners}
                onChangeCorners={setCorners}
                onBlend={setPattern}
              />
            </Paper>
          </Box>
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0%' }, minWidth: 0 }}>
            <Paper
              elevation={0}
              sx={{ bgcolor: colorsMemo.cardBg, p: 3, borderRadius: 3, border: `1px solid ${colorsMemo.border}` }}
            >
              <TransportBar
                bpm={bpm} bars={bars} onChangeBpm={setBpm} onChangeBars={setBars}
                onPlay={startPlay} onStop={stopAll} onClear={onClear}
                onExport={exportWav} onSendToGenerate={sendToGenerate}
                busy={busy || !isKitReady}
                busyMsg={!isKitReady ? '오디오 샘플 로딩 중...' : busyMsg}
              />
              <Box sx={{ mt: 3, overflowX: 'auto' }}>
                <BeatGrid pattern={pattern} currentStep={currentStep} onToggle={onToggle} />
              </Box>
              <Typography variant="body2" sx={{ mt: 2, color: colorsMemo.textLight }}>
                팁: 패드의 위치를 바꾸면 4개 코너 프리셋을 섞어 새 패턴이 만들어져요. 그리드에서 직접 찍어도 됩니다.
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
