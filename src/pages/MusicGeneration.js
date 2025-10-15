// src/pages/MusicGeneration.js
import React, { useState, useMemo, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, TextField, Button, Grid, LinearProgress
} from '@mui/material';
import { MusicNote, PlayArrow, AutoAwesome, Refresh, UploadFile, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import GenreCardSelector from '../components/common/GenreCardSelector';
import MoodSelector from '../components/common/MoodSelector';
import { useMusicContext } from '../context/MusicContext';

import { generateAndWait } from '../services/musicApi';
import { saveGeneratedTrack } from '../services/libraryWriter';

const MusicGeneration = () => {
  const navigate = useNavigate();
  const { state, actions } = useMusicContext();

  const colors = {
    background: '#0A0A0A',
    cardBg: '#1A1A1A',
    primary: '#50E3C2',
    secondary: '#40D9B8',
    accent: '#2DD4BF',
    text: '#FFFFFF',
    textLight: '#CCCCCC',
    border: '#333333',
    shadow: 'rgba(80, 227, 194, 0.3)'
  };

  const {
    selectedGenres,
    selectedMoods,
    description,
    duration,
    isGenerating
  } = state.generation;

  const isFormValid = selectedGenres.length > 0 || selectedMoods.length > 0;

  const handleGenreChange = (genres) => actions.setSelectedGenres(genres);
  const handleMoodChange = (moods) => actions.setSelectedMoods(moods);
  const handleDescriptionChange = (e) => actions.setDescription(e.target.value);

  // ⬇️ 오디오 첨부 상태
  const [file, setFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState('');
  const fileInfo = useMemo(
    () => (file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : '첨부 없음'),
    [file]
  );

  const handleFilePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('audio/')) {
      alert('오디오 파일만 첨부하세요 (wav, mp3 등)');
      e.target.value = '';
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setAudioPreview(url);
  };

  const removeFile = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setFile(null);
    setAudioPreview('');
  };

  // ✅ Beat Maker에서 'Generate로 보내기'를 눌렀을 때 자동 첨부
  useEffect(() => {
    const dataUrl = sessionStorage.getItem('inlineReferenceAudio');
    if (!dataUrl) return;

    (async () => {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileFromBeat = new File([blob], 'beat.wav', { type: 'audio/wav' });

      setFile(fileFromBeat);
      const url = URL.createObjectURL(fileFromBeat);
      setAudioPreview(url);

      sessionStorage.removeItem('inlineReferenceAudio'); // 1회성
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 프롬프트 조합
  const buildPrompt = () => {
    const g = selectedGenres.join(', ');
    const m = selectedMoods.join(', ');
    return [description, g && `genres: ${g}`, m && `mood: ${m}`]
      .filter(Boolean)
      .join(', ');
  };

  // 생성
  const handleGenerateMusic = async () => {
    if (!isFormValid) {
      actions.addNotification({ type: 'error', message: '장르 또는 분위기를 최소 하나 이상 선택해주세요.' });
      return;
    }
    try {
      actions.startGeneration();
      const prompt = buildPrompt();
      const dur = Number(duration || 30);

      const final = await generateAndWait(
        { description: prompt, genres: selectedGenres, moods: selectedMoods, duration: dur },
        (s) => actions.updateGenerationProgress(s.status && s.status !== 'succeeded' ? 50 : 0),
        file // ✅ 첨부 파일 전달
      );

      const generatedMusic = {
        id: Date.now(),
        title: `AI_Generated_${Date.now()}`,
        genres: selectedGenres,
        moods: selectedMoods,
        description: prompt,
        duration: dur,
        audioUrl: final.result.audioUrl,
        createdAt: new Date().toISOString()
      };

      actions.completeGeneration(generatedMusic);

      const currentUser = state.auth.user;
      if (currentUser) {
        try {
          await saveGeneratedTrack({
            ownerId: currentUser.uid,
            title: generatedMusic.title,
            genres: selectedGenres,
            moods: selectedMoods,
            description: prompt,
            durationSec: dur,
            prompt,
            sourceUrl: final.result.audioUrl,
          });
          actions.addNotification({ type: 'success', message: '음악이 생성되어 라이브러리에 저장되었습니다!' });
        } catch (writeError) {
          console.warn(writeError);
          actions.addNotification({ type: 'warning', message: '생성은 완료했지만 라이브러리에 저장하지 못했습니다.' });
        }
      } else {
        actions.addNotification({ type: 'success', message: '음악이 성공적으로 생성되었습니다! 로그인하면 라이브러리에 저장돼요.' });
      }
      navigate('/result');
    } catch (error) {
      console.error(error);
      actions.setError(error.message || '음악 생성 중 오류가 발생했습니다.');
      actions.addNotification({ type: 'error', message: '음악 생성에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      actions.updateGenerationProgress?.(0);
      actions.setGenerating?.(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.background, py: 6 }}>
      <Container maxWidth="lg">
        {/* 변경점 1: '(Generate)' 텍스트 제거 */}
        <Typography variant="h4" sx={{ color: colors.text, fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center' }}>
          <MusicNote sx={{ mr: 1, color: colors.primary }} />
          생성하기
        </Typography>

        <Grid container spacing={4}>
          {/* 메인 카드 */}
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ bgcolor: colors.cardBg, p: 4, borderRadius: 3, border: `1px solid ${colors.border}` }}>
              {/* 프롬프트 */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, color: colors.text, fontWeight: 600 }}>
                  <AutoAwesome sx={{ mr: 1, color: colors.primary }} />
                  프롬프트
                </Typography>
                <TextField
                  fullWidth multiline minRows={2}
                  placeholder="예: dreamy lofi hiphop with warm piano"
                  value={description} onChange={handleDescriptionChange}
                  sx={{
                    '& .MuiInputBase-root': { bgcolor: '#111', color: colors.text, borderRadius: 2 },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border }
                  }}
                />
              </Box>

              {/* 오디오 첨부 */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, color: colors.text, fontWeight: 600 }}>
                  <UploadFile sx={{ mr: 1, color: colors.primary }} />
                  오디오 첨부 (선택)
                </Typography>

                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 2, mb: 2,
                  p: 2, borderRadius: 2, border: `1px dashed ${colors.border}`, bgcolor: '#111'
                }}>
                  <Button variant="outlined" component="label" sx={{ color: colors.text, borderColor: colors.border }}>
                    파일 선택
                    <input type="file" hidden accept="audio/*" onChange={handleFilePick} />
                  </Button>
                  <Typography sx={{ color: colors.textLight, flex: 1 }}>{fileInfo}</Typography>
                  {file && (
                    <Button onClick={removeFile} size="small" startIcon={<Delete />} sx={{ color: colors.text }}>
                      제거
                    </Button>
                  )}
                </Box>

                {audioPreview && (
                  <audio controls src={audioPreview} style={{ width: '100%' }} />
                )}
              </Box>

              {/* 장르 / 분위기 */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>장르 선택</Typography>
                <GenreCardSelector selectedGenres={selectedGenres} onGenreChange={handleGenreChange} maxSelection={1} />
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>분위기 선택</Typography>
                <MoodSelector selectedMoods={selectedMoods} onMoodChange={handleMoodChange} maxSelection={3} />
              </Box>

              {/* 길이 입력 */}
              <Box sx={{ mb: 4 }}>
                {/* 변경점 2: 레이블 및 입력 범위 수정 */}
                <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>길이 (10초 ~ 30초)</Typography>
                <TextField
                  type="number" value={duration} onChange={(e)=>actions.setDuration(Number(e.target.value || 0))}
                  sx={{ width: 160, '& .MuiInputBase-root': { bgcolor: '#111', color: colors.text, borderRadius: 2 } }}
                  inputProps={{ min: 10, max: 30 }}
                />
              </Box>

              {/* 생성 버튼 */}
              <Button
                fullWidth variant="contained" size="large"
                onClick={handleGenerateMusic} disabled={!isFormValid || isGenerating}
                sx={{
                  py: 2, borderRadius: 2, fontWeight: 600, fontSize: '1.1rem',
                  bgcolor: colors.accent, color: '#000', boxShadow: `0 4px 14px ${colors.shadow}`,
                  '&:hover': { bgcolor: colors.accent, boxShadow: `0 6px 20px ${colors.shadow}` },
                  '&:disabled': { bgcolor: colors.border, color: colors.textLight, boxShadow: 'none' }
                }}
              >
                {isGenerating ? (<><Refresh sx={{ mr: 1, animation: 'spin 1s linear infinite', color: '#000' }} />생성 중...</>) :
                 (<><PlayArrow sx={{ mr: 1, color: '#000' }} />생성하기</>)}
              </Button>

              {/* 변경점 3: 로딩 바 색상 변경 */}
              {isGenerating && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress sx={{
                    backgroundColor: colors.border,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: colors.accent
                    }
                  }} />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default MusicGeneration;
