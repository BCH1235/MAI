// ✅ src/pages/ResultPage.js
import React, { useEffect, useState, useRef } from 'react';
import {
  Container, Box, Typography, Paper, Button, Grid, Chip, Alert, IconButton, Slider
} from '@mui/material';
import {
  CheckCircle, PlayArrow, Pause, Download, Refresh, Share, Home, LibraryMusic, VolumeUp, BookmarkBorder
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useMusicContext } from '../context/MusicContext';
import { GENRE_OPTIONS } from '../components/common/GenreSelector';
import { MOOD_OPTIONS } from '../components/common/MoodSelector';

// ✅ 오디오 웨이브폼 컴포넌트 추가
import AudioWaveform from '../components/common/AudioWaveform';

const ResultPage = () => {
  const navigate = useNavigate();
  const { state, actions } = useMusicContext();

  // 오디오 제어용
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [volume, setVolume] = useState(70);

  // 결과 데이터
  const generatedFromResult = state.result?.generatedMusic;
  const convertedFromResult = state.result?.convertedMusic;
  const generatedFromGeneration = state.generation?.generatedMusic;

  const musicData =
    generatedFromResult ||
    convertedFromResult ||
    generatedFromGeneration ||
    null;

  const audioUrl = musicData?.audioUrl || '';
  const isConversion = !!(state.result?.convertedMusic);

  // 색상 테마
  const colors = {
    background: '#0A0A0A', cardBg: '#1A1A1A', primary: '#50E3C2',
    secondary: '#40D9B8', accent: '#2DD4BF', text: '#FFFFFF',
    textLight: '#CCCCCC', border: '#333333', shadow: 'rgba(80, 227, 194, 0.3)'
  };

  // ===== 오디오 이벤트 연결 =====
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = audioUrl || '';
    const onLoadedMetadata = () => {
      setDuration(isFinite(audio.duration) ? audio.duration : 180);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  // ===== 볼륨 반영 =====
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // ===== 헬퍼 함수 =====
  const getGenreInfo = (genreId) =>
    GENRE_OPTIONS.find((g) => g.id === genreId) || { label: genreId, color: '#6366F1' };

  const getMoodInfo = (moodId) =>
    MOOD_OPTIONS.find((m) => m.id === moodId) || { label: moodId, emoji: '🎵' };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ===== 재생/일시정지 =====
  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;  
    
    if (window.AudioContext || window.webkitAudioContext) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    }

    if (!isPlaying) {
      try {
        await audio.play();
        setIsPlaying(true);
        actions.setPlaying?.(true);
      } catch {
        actions.addNotification?.({
          type: 'info',
          message: '브라우저 자동재생이 차단되면 수동으로 재생해야 합니다.'
        });
      }
    } else {
      audio.pause();
      setIsPlaying(false);
      actions.setPlaying?.(false);
    }
  };

  // ===== 타임라인 조정 =====
  const handleTimeChange = (e, newValue) => {
    setCurrentTime(newValue);
    if (audioRef.current) audioRef.current.currentTime = newValue;
    actions.updateCurrentTime?.(newValue);
  };

  // ===== 볼륨 조절 =====
  const handleVolumeChange = (e, newValue) => setVolume(newValue);

  // ===== 다운로드, 공유 등 =====
  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = (musicData.title || 'music') + '.mp3';
      document.body.appendChild(a);
      a.click();
      a.remove();
      actions.addNotification?.({ type: 'success', message: '다운로드가 시작되었습니다.' });
    } catch {
      actions.addNotification?.({ type: 'error', message: '다운로드에 실패했습니다.' });
    }
  };

  const handleShare = () =>
    actions.addNotification?.({ type: 'info', message: '공유 기능은 추후 업데이트될 예정입니다.' });

  const handleSaveToLibrary = () => {
    actions.addToLibrary?.(musicData);
    actions.addNotification?.({ type: 'success', message: '라이브러리에 추가되었습니다.' });
  };

  const handleRegenerate = () => {
    if (state.result?.generatedMusic || state.generation?.generatedMusic) navigate('/generate');
    else navigate('/convert');
  };

  const hasMusic = !!(musicData && audioUrl);

  // ======================== 렌더링 ========================
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.background }}>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {!hasMusic ? (
          <Box sx={{ textAlign: 'center' }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              표시할 음악 데이터가 없습니다.
            </Alert>
            <Button variant="contained" onClick={() => navigate('/')} startIcon={<Home />}>
              홈으로 돌아가기
            </Button>
          </Box>
        ) : (
          <>
            {/* 헤더 */}
            <Box sx={{ mb: 6, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: '4rem', color: colors.accent, mb: 2 }} />
              <Typography variant="h3" component="h1" sx={{ fontWeight: 600, color: colors.text, mb: 1 }}>
                {isConversion ? '음악 변환 완료' : '음악 생성 완료'}
              </Typography>
              <Typography variant="h6" color={colors.textLight} sx={{ opacity: 0.8 }}>
                {isConversion ? '음악이 성공적으로 변환되었습니다' : '새로운 음악이 성공적으로 생성되었습니다'}
              </Typography>
            </Box>

            <Grid container spacing={4}>
            <Grid size={{ xs: 12, lg: 9 }}>
                {/* 🎵 플레이어 카드 */}
                <Paper elevation={0} sx={{ p: 4, border: `1px solid ${colors.border}`, borderRadius: 2, mb: 3, bgcolor: colors.cardBg, color: colors.text }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h4" fontWeight={600}>
                      {musicData.title || '제목 없음'}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.8, color: colors.textLight }}>
                      {isConversion
                        ? `${musicData.originalFile}을(를) ${musicData.targetGenre} 스타일로 변환했습니다.`
                        : '음악이 성공적으로 생성되었습니다.'}
                    </Typography>
                  </Box>

                  {/* ✅ 오디오 웨이브폼 */}
                  <Box sx={{ mb: 3 }}>
                    <AudioWaveform
                      isPlaying={isPlaying}
                      progress={(currentTime / duration) * 100}
                      height={100}
                      barCount={80}
                      color={colors.accent}
                    />
                  </Box>

                  {/* 재생 컨트롤 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <IconButton
                      onClick={handlePlayPause}
                      sx={{ bgcolor: colors.accent, color: colors.background, '&:hover': { bgcolor: colors.text } }}
                      size="large"
                    >
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </IconButton>

                    {/* 진행 슬라이더 */}
                    <Box sx={{ flexGrow: 1 }}>
                      <Slider
                        value={currentTime}
                        onChange={handleTimeChange}
                        min={0}
                        max={duration}
                        sx={{
                          color: colors.accent,
                          '& .MuiSlider-track': { bgcolor: colors.accent },
                          '& .MuiSlider-thumb': {
                            bgcolor: colors.accent,
                            '&:hover': { boxShadow: `0px 0px 0px 8px ${colors.shadow}` }
                          }
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ opacity: 0.8, color: colors.textLight }}>
                          {formatTime(currentTime)}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, color: colors.textLight }}>
                          {formatTime(duration)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* 볼륨 조절 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
                      <VolumeUp sx={{ opacity: 0.8, color: colors.textLight }} />
                      <Slider
                        value={volume}
                        onChange={handleVolumeChange}
                        min={0}
                        max={100}
                        size="small"
                        sx={{
                          color: colors.accent,
                          '& .MuiSlider-track': { bgcolor: colors.accent },
                          '& .MuiSlider-thumb': { bgcolor: colors.accent }
                        }}
                      />
                    </Box>
                  </Box>

                  {/* 실제 오디오 */}
                  <audio ref={audioRef} src={audioUrl} preload="auto" style={{ display: 'none' }} />
                </Paper>

                {/* 기타 정보 카드 */}
                {/* (하단 정보 섹션은 원본 그대로 유지) */}
              </Grid>

              {/* 사이드바 (버튼 모음) */}
              <Grid size={{ xs: 12, lg: 3 }}>
                <Box sx={{ position: 'sticky', top: 24 }}>
                  <Paper elevation={0} sx={{ p: 4, border: `1px solid ${colors.border}`, borderRadius: 2, bgcolor: colors.cardBg }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Button fullWidth variant="contained" startIcon={<BookmarkBorder />} onClick={handleSaveToLibrary}
                        sx={{ bgcolor: colors.accent, color: colors.background, fontWeight: 600 }}>
                        라이브러리에 저장
                      </Button>
                      <Button fullWidth variant="outlined" startIcon={<Download />} onClick={handleDownload}
                        sx={{ color: colors.text, borderColor: colors.border, fontWeight: 600 }}>
                        다운로드
                      </Button>
                      <Button fullWidth variant="outlined" startIcon={<Share />} onClick={handleShare}
                        sx={{ color: colors.text, borderColor: colors.border, fontWeight: 600 }}>
                        공유하기
                      </Button>
                      <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={handleRegenerate}
                        sx={{ color: colors.text, borderColor: colors.border, fontWeight: 600 }}>
                        다시 {isConversion ? '변환' : '생성'}하기
                      </Button>
                      <Button fullWidth variant="outlined" startIcon={<LibraryMusic />} onClick={() => navigate('/library')}
                        sx={{ color: colors.text, borderColor: colors.border, fontWeight: 600 }}>
                        라이브러리 보기
                      </Button>
                      <Button fullWidth variant="outlined" startIcon={<Home />} onClick={() => navigate('/')}
                        sx={{ color: colors.text, borderColor: colors.border, fontWeight: 600 }}>
                        홈으로 돌아가기
                      </Button>
                    </Box>
                  </Paper>
                </Box>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default ResultPage;
