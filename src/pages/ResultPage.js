import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Container, Box, Typography, Paper, Button, Grid, Chip, Alert, IconButton, Slider,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  TextField
} from '@mui/material';
import {
  CheckCircle, PlayArrow, Pause, Download, Refresh, Share, Home, LibraryMusic, VolumeUp, BookmarkBorder,
  ContentCopy, Twitter, Facebook
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useMusicContext } from '../context/MusicContext';
import { GENRE_OPTIONS } from '../components/common/GenreSelector';
import { MOOD_OPTIONS } from '../components/common/MoodSelector';
import AudioWaveform from '../components/common/AudioWaveform';
import { addMusicToLibrary, updateLibraryMusic } from '../services/libraryApi';
import { 
  uploadMusicToStorage, 
  isFirebaseStorageUrl, 
  isLocalServerUrl 
} from '../services/storageApi';
import { loadScoreResultFromCache } from '../utils/resultCache';

const ResultPage = () => {
  const navigate = useNavigate();
  const { state, actions } = useMusicContext();

  // 디버깅: 현재 상태 확인
  console.log('=== ResultPage 디버깅 ===');
  console.log('전체 state:', state);
  console.log('state.result:', state.result);
  console.log('state.auth.user:', state.auth.user);

  // 오디오 제어용
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [volume, setVolume] = useState(70);
  const [isSaving, setIsSaving] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [publicUrl, setPublicUrl] = useState(null); // 변환된 공용 URL 저장
  const [isUploading, setIsUploading] = useState(false); // 업로드 중 상태
  const [uploadError, setUploadError] = useState(null); // 업로드 실패 에러
  const [titleInput, setTitleInput] = useState('');
  const user = state.auth.user; // 사용자 정보

  const cachedResult = useMemo(() => loadScoreResultFromCache(), []);
  const cachedMusicData = cachedResult?.convertedMusic || cachedResult?.generatedMusic || null;

  // 결과 데이터 (result > generation > cache)
  const generatedFromResult = state.result?.generatedMusic;
  const convertedFromResult = state.result?.convertedMusic;
  const generatedFromGeneration = state.generation?.generatedMusic;

  // localStorage 확인 추가
  const musicData =
    generatedFromResult ||
    convertedFromResult ||
    generatedFromGeneration ||
    cachedMusicData;

  console.log('최종 musicData:', musicData);

  const audioUrl = musicData?.audioUrl || '';
  const isConversion = !!(state.result?.convertedMusic || musicData?.type === 'score-generated' || musicData?.type === 'score-audio');
  const resolvedTitle = titleInput?.trim() || musicData?.title || '제목 없는 배경음악';

  // 색상 테마
  const colors = {
    background: '#0A0A0A', cardBg: '#1A1A1A', primary: '#50E3C2',
    secondary: '#40D9B8', accent: '#2DD4BF', text: '#FFFFFF',
    textLight: '#CCCCCC', border: '#333333', shadow: 'rgba(80, 227, 194, 0.3)'
  };

  // 오디오 이벤트 연결
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

  // 볼륨 반영
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    setTitleInput(musicData?.title || '');
  }, [musicData?.title]);

  const getGenreInfo = (genreId) =>
    GENRE_OPTIONS.find((g) => g.id === genreId) || { label: genreId, color: '#6366F1' };

  const getMoodInfo = (moodId) =>
    MOOD_OPTIONS.find((m) => m.id === moodId) || { label: moodId, emoji: '🎵' };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

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

  const getPublicUrl = async () => {
    // 1. 이미 변환된 URL이 state에 있으면 즉시 반환
    if (publicUrl) {
      return publicUrl;
    }

    // 2. musicData나 audioUrl이 없으면 에러
    if (!musicData || !musicData.audioUrl) {
      throw new Error('공유할 오디오 데이터가 없습니다.');
    }

    const localUrl = musicData.audioUrl;

    // 3. 이미 Firebase Storage URL이면 (예: 라이브러리에서 재생)
    if (isFirebaseStorageUrl(localUrl)) {
      setPublicUrl(localUrl); // state에 저장
      return localUrl;
    }

    // 4. 로컬 URL(127.0.0.1)이 아니면 (예: Replicate URL)
    if (!isLocalServerUrl(localUrl) && !localUrl.startsWith('/')) {
      // Replicate 같은 외부 URL도 그대로 사용
      setPublicUrl(localUrl);
      return localUrl;
    }

    // 5. 로컬 URL이므로 Firebase Storage에 업로드
    if (!user) {
      throw new Error('파일 업로드를 위해 로그인이 필요합니다.');
    }

    console.log('로컬 URL을 Firebase Storage로 업로드 시작...', localUrl);
    setUploadError(null);
    setIsUploading(true); // 업로드 시작 상태

    try {
      const fileName = resolvedTitle?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'music';
      const fileType = musicData.type === 'beat' ? 'beats' : 'tracks';

      // storageApi.js의 함수 사용
      const newPublicUrl = await uploadMusicToStorage(
        user.uid,
        localUrl,
        `${fileName}.wav`, // 파일명 (server.py는 wav를 생성함)
        fileType
      );

      setPublicUrl(newPublicUrl); // state에 저장
      return newPublicUrl;

    } catch (error) {
      console.error('Firebase Storage 업로드 실패:', error);
      setUploadError(error.message);
      throw new Error('파일을 Storage에 업로드하지 못했습니다.');
    } finally {
      setIsUploading(false); // 업로드 종료 상태
    }
  };

  const handleTimeChange = (e, newValue) => {
    setCurrentTime(newValue);
    if (audioRef.current) audioRef.current.currentTime = newValue;
    actions.updateCurrentTime?.(newValue);
  };

  const handleVolumeChange = (e, newValue) => setVolume(newValue);

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = audioUrl;
      const extension = audioUrl.endsWith('.wav') ? 'wav' : 'mp3';
      a.download = `${resolvedTitle || 'music'}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      actions.addNotification?.({ type: 'success', message: '다운로드가 시작되었습니다.' });
    } catch {
      actions.addNotification?.({ type: 'error', message: '다운로드에 실패했습니다.' });
    }
  };

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
  };

  const handleShareOption = async (option) => {
    let fileUrl;
    try {
      // 1. 공용 URL 가져오기 시도
      fileUrl = await getPublicUrl();
    } catch (error) {
      // 2. 실패 시 알림 (예: 로그인이 안 되어 업로드 불가)
      actions.addNotification?.({ 
        type: 'error', 
        message: `공유 링크 생성 실패: ${error.message}`
      });
      return; // 함수 종료
    }
    const shareText = `"${resolvedTitle}" - AI로 생성한 음악`;
    const fileName = `${resolvedTitle}.${audioUrl.endsWith('.wav') ? 'wav' : 'mp3'}`;
    
    switch (option) {
      case 'facebook':
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fileUrl)}`;
        window.open(facebookUrl, '_blank', 'width=800,height=600');
        actions.addNotification?.({ 
          type: 'success', 
          message: 'Facebook 공유 창이 열렸습니다!' 
        });
        break;
        
      case 'twitter':
        // X (트위터) - 파일 URL과 함께 공유
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + '\n' + fileUrl)}`;
        window.open(twitterUrl, '_blank', 'width=800,height=600');
        actions.addNotification?.({ 
          type: 'success', 
          message: 'X(트위터)로 공유 창이 열렸습니다! 파일 링크가 포함되어 있습니다.' 
        });
        break;
        
      case 'copy':
        // 파일 링크 복사
        try {
          await navigator.clipboard.writeText(fileUrl);
          actions.addNotification?.({ 
            type: 'success', 
            message: '파일 링크가 클립보드에 복사되었습니다!' 
          });
        } catch (error) {
          // 복사 실패 시 수동으로 선택하도록 유도
          const textArea = document.createElement('textarea');
          textArea.value = fileUrl;
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            actions.addNotification?.({ type: 'success', message: '파일 링크가 복사되었습니다!' });
          } catch (err) {
            actions.addNotification?.({ type: 'error', message: '링크 복사에 실패했습니다.' });
          }
          document.body.removeChild(textArea);
        }
        break;

      case 'download':
        // 파일 다운로드
        try {
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          actions.addNotification?.({ 
            type: 'success', 
            message: '파일 다운로드가 시작되었습니다!' 
          });
        } catch (error) {
          actions.addNotification?.({ 
            type: 'error', 
            message: '다운로드에 실패했습니다.' 
          });
        }
        break;
        
      default:
        break;
    }
    
    handleCloseShareDialog();
  };

  const handleSaveToLibrary = async () => {
    if (!user) {
      actions.addNotification?.({ type: 'error', message: '로그인이 필요합니다.' });
      return;
    }
    if (!musicData) {
      actions.addNotification?.({ type: 'error', message: '저장할 음악 데이터가 없습니다.' });
      return;
    }

    setIsSaving(true);

    try {
      const finalAudioUrl = await getPublicUrl();
      const finalTitle = resolvedTitle || musicData.title || '제목 없는 배경음악';
      const collectionType = musicData.collectionType === 'beat' || musicData.type === 'beat' ? 'beat' : 'track';
      const entryType = musicData.type || (isConversion ? 'converted' : 'generated');

      const dataToSave = {
        ...musicData,
        title: finalTitle,
        audioUrl: finalAudioUrl,
        sourceUrl: musicData.audioUrl !== finalAudioUrl ? musicData.audioUrl : musicData.sourceUrl || null,
        collectionType,
        type: entryType,
      };

      const sanitized = { ...dataToSave };
      delete sanitized.id;
      delete sanitized.firestoreId;

      const existingDocId = musicData.firestoreId;
      let docId = existingDocId;

      if (existingDocId) {
        await updateLibraryMusic({
          userId: user.uid,
          musicId: existingDocId,
          musicType: collectionType,
          data: sanitized,
        });
        actions.addNotification?.({ type: 'success', message: '라이브러리 정보를 업데이트했어요.' });
      } else {
        docId = await addMusicToLibrary(user.uid, sanitized);
        actions.addToLibrary?.({ ...dataToSave, id: musicData.id || docId, firestoreId: docId });
        actions.addNotification?.({ type: 'success', message: '라이브러리에 추가되었습니다.' });
      }

      const nextMusicData = {
        ...musicData,
        ...dataToSave,
        firestoreId: docId,
        id: docId || musicData.id,
      };

      if (isConversion) {
        actions.setResult?.({ convertedMusic: nextMusicData });
      } else {
        actions.setResult?.({ generatedMusic: nextMusicData });
      }

      console.log('라이브러리 저장 성공 (공용 URL):', nextMusicData);
    } catch (error) {
      console.error('라이브러리 저장 실패:', error);
      if (error.message?.includes('already exists')) {
        actions.addNotification?.({ type: 'info', message: '이미 라이브러리에 있는 음악입니다.' });
      } else {
        actions.addNotification?.({ type: 'error', message: `라이브러리 저장 실패: ${error.message}` });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = () => {
    if (state.result?.generatedMusic || state.generation?.generatedMusic) navigate('/generate');
    else if (musicData?.type === 'score-generated' || musicData?.type === 'score-audio') navigate('/score-to-music');
    else navigate('/convert');
  };

  const hasMusic = !!(musicData && audioUrl);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.background }}>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {!hasMusic ? (
          <Box sx={{ textAlign: 'center' }}>
            <Alert
              severity="info"
              sx={{
                mb: 3,
                border: `1px solid ${colors.accent}`,
                bgcolor: 'rgba(45, 212, 191, 0.08)',
                color: colors.accent,
                fontWeight: 600,
              }}
            >
              표시할 음악 데이터가 없습니다.
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              startIcon={<Home />}
              sx={{
                bgcolor: colors.accent,
                color: colors.background,
                fontWeight: 700,
                px: 4,
                py: 1.5,
                '&:hover': { bgcolor: colors.primary, color: '#041311' },
              }}
            >
              홈으로 돌아가기
            </Button>
          </Box>
        ) : (
          <>
            {/* 헤더 */}
            <Box sx={{ mb: 6, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: '4rem', color: colors.accent, mb: 2 }} />
              <Typography variant="h3" component="h1" sx={{ fontWeight: 600, color: colors.text, mb: 1, letterSpacing: '-0.02em' }}>
                {musicData.type === 'score-generated' || musicData.type === 'score-audio' 
                  ? '악보 연주 완료' 
                  : isConversion ? '음악 변환 완료' : '음악 생성 완료'}
              </Typography>
              <Typography variant="h6" color={colors.textLight} sx={{ fontWeight: 400, opacity: 0.8 }}>
                {musicData.type === 'score-generated' || musicData.type === 'score-audio'
                  ? '악보가 성공적으로 연주되었습니다'
                  : isConversion ? '음악이 성공적으로 변환되었습니다' : '새로운 음악이 성공적으로 생성되었습니다'}
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {/* 메인 컨텐츠 */}
              <Grid xs={12} lg={9}>
                {/* 플레이어 카드 */}
                <Paper elevation={0} sx={{ p: 4, border: `1px solid ${colors.border}`, borderRadius: 2, mb: 3, bgcolor: colors.cardBg, color: colors.text }}>
                  <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="곡 제목을 입력하세요"
                    sx={{
                      mb: 1,
                      '& .MuiInputBase-input': {
                        fontSize: '1.8rem',
                        fontWeight: 600,
                        color: colors.text,
                      },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: colors.border },
                        '&:hover fieldset': { borderColor: colors.accent },
                        '&.Mui-focused fieldset': { borderColor: colors.accent },
                      },
                    }}
                  />
                    <Typography variant="body1" sx={{ opacity: 0.8, color: colors.textLight }}>
                      {musicData.type === 'score-generated' || musicData.type === 'score-audio'
                        ? `${musicData.originalFile} 파일을 오디오로 변환했습니다.`
                        : isConversion
                        ? `${musicData.originalFile}을(를) ${musicData.targetGenre} 스타일로 변환했습니다.`
                        : '음악이 성공적으로 생성되었습니다.'}
                    </Typography>
                  </Box>

                  {/* 웨이브폼 */}
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

                  <audio ref={audioRef} src={audioUrl} preload="auto" style={{ display: 'none' }} />
                </Paper>

                {/* 정보 카드 */}
                <Paper elevation={0} sx={{ p: 4, border: `1px solid ${colors.border}`, borderRadius: 2, bgcolor: colors.cardBg }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: colors.text }}>
                    {isConversion ? '변환 정보' : '음악 정보'}
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid xs={12} sm={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: colors.textLight }}>
                        {isConversion ? '변환된 장르' : '장르'}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {(musicData.genres || [musicData.targetGenre]).filter(Boolean).map((genreId) => {
                          const genre = getGenreInfo(genreId);
                          return (
                            <Chip
                              key={genreId}
                              label={genre.label}
                              size="small"
                              sx={{
                                bgcolor: colors.cardBg,
                                color: colors.primary,
                                border: `1px solid ${colors.primary}`,
                                fontWeight: 600
                              }}
                            />
                          );
                        })}
                      </Box>
                    </Grid>

                    {!isConversion && musicData.moods && musicData.moods.length > 0 && (
                      <Grid xs={12} sm={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: colors.textLight }}>
                          분위기
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {musicData.moods.map((moodId) => {
                            const mood = getMoodInfo(moodId);
                            return (
                              <Chip
                                key={moodId}
                                label={`${mood.emoji} ${mood.label}`}
                                size="small"
                                sx={{
                                  bgcolor: colors.cardBg,
                                  color: colors.primary,
                                  border: `1px solid ${colors.primary}`,
                                  fontWeight: 600
                                }}
                              />
                            );
                          })}
                        </Box>
                      </Grid>
                    )}

                    <Grid xs={12} sm={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: colors.textLight }}>
                        길이
                      </Typography>
                      <Typography variant="body2" color={colors.text}>
                        {formatTime(musicData.duration || duration)}
                      </Typography>
                    </Grid>

                    <Grid xs={12} sm={6}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: colors.textLight }}>
                        생성 시간
                      </Typography>
                      <Typography variant="body2" color={colors.text}>
                        {new Date(musicData.createdAt).toLocaleString('ko-KR')}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* 사이드바 */}
              <Grid xs={12} lg={3}>
                <Box sx={{ position: 'sticky', top: 24 }}>
                  <Paper elevation={0} sx={{ p: 4, border: `1px solid ${colors.border}`, borderRadius: 2, bgcolor: colors.cardBg, minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                      <Button 
                        fullWidth 
                        variant="contained" 
                        startIcon={<BookmarkBorder />} 
                        onClick={handleSaveToLibrary}
                        disabled={isSaving || !state.auth.user}
                        sx={{ 
                          bgcolor: colors.accent, 
                          color: colors.background, 
                          fontWeight: 600, 
                          textTransform: 'none', 
                          py: 2, 
                          '&:hover': { bgcolor: colors.text },
                          '&:disabled': { bgcolor: colors.border, color: colors.textLight }
                        }}
                      >
                        {isSaving ? '저장 중...' : !state.auth.user ? '로그인 필요' : '라이브러리에 저장'}
                      </Button>

                      <Button fullWidth variant="outlined" startIcon={<Download />} onClick={handleDownload}
                        sx={{ color: colors.text, borderColor: colors.border, fontWeight: 600, textTransform: 'none', py: 2, '&:hover': { bgcolor: colors.accent, borderColor: colors.accent, color: colors.background } }}>
                        다운로드
                      </Button>

                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Share />}
                        onClick={handleShare}
                        disabled={isUploading}
                        sx={{
                          color: colors.text,
                          borderColor: colors.border,
                          fontWeight: 600,
                          textTransform: 'none',
                          py: 2,
                          '&:hover': { bgcolor: colors.accent, borderColor: colors.accent, color: colors.background },
                          '&:disabled': { opacity: 0.6 }
                        }}
                      >
                        {isUploading ? '링크 준비 중...' : '공유하기'}
                      </Button>

                      <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={handleRegenerate}
                        sx={{ color: colors.text, borderColor: colors.border, fontWeight: 600, textTransform: 'none', py: 2, '&:hover': { bgcolor: colors.accent, borderColor: colors.accent, color: colors.background } }}>
                        다시 {isConversion ? '변환' : '생성'}하기
                      </Button>

                      <Button fullWidth variant="outlined" startIcon={<LibraryMusic />} onClick={() => navigate('/library')}
                        sx={{ color: colors.text, borderColor: colors.border, fontWeight: 600, textTransform: 'none', py: 2, '&:hover': { bgcolor: colors.accent, borderColor: colors.accent, color: colors.background } }}>
                        라이브러리 보기
                      </Button>

                      <Button fullWidth variant="outlined" startIcon={<Home />} onClick={() => navigate('/')}
                        sx={{ color: colors.text, borderColor: colors.border, fontWeight: 600, textTransform: 'none', py: 2, '&:hover': { bgcolor: colors.accent, borderColor: colors.accent, color: colors.background } }}>
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

      {/* 공유 다이얼로그 */}
      <Dialog 
        open={shareDialogOpen} 
        onClose={handleCloseShareDialog}
        PaperProps={{
          sx: {
            bgcolor: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: 2,
            minWidth: 300
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text, borderBottom: `1px solid ${colors.border}` }}>
          공유하기
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {isUploading && (
            <Box sx={{ px: 3, py: 2 }}>
              <Alert severity="info" sx={{ bgcolor: 'rgba(80, 227, 194, 0.1)', border: '1px solid rgba(80, 227, 194, 0.3)' }}>
                파일을 업로드하여 공유 링크를 만드는 중입니다...
              </Alert>
            </Box>
          )}
          {uploadError && (
            <Box sx={{ px: 3, py: 2 }}>
              <Alert severity="error">
                {uploadError}
              </Alert>
            </Box>
          )}
          <List>
            <ListItem disablePadding>
              <ListItemButton 
                onClick={() => handleShareOption('facebook')} // 'instagram' -> 'facebook'
                sx={{ 
                  py: 2,
                  '&:hover': { bgcolor: colors.border }
                }}
              >
                <ListItemIcon sx={{ minWidth: 48 }}>
                  {/* Instagram 아이콘 -> Facebook 아이콘 */}
                  <Facebook sx={{ color: '#1877F2', fontSize: 32 }} /> 
                </ListItemIcon>
                <ListItemText 
                  primary="Facebook" // 'Instagram' -> 'Facebook'
                  sx={{ '& .MuiListItemText-primary': { color: colors.text } }}
                />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton 
                onClick={() => handleShareOption('twitter')}
                sx={{ 
                  py: 2,
                  '&:hover': { bgcolor: colors.border }
                }}
              >
                <ListItemIcon sx={{ minWidth: 48 }}>
                  <Twitter sx={{ color: '#1DA1F2', fontSize: 32 }} />
                </ListItemIcon>
                <ListItemText 
                  primary="X" 
                  sx={{ '& .MuiListItemText-primary': { color: colors.text } }}
                />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton 
                onClick={() => handleShareOption('copy')}
                sx={{ 
                  py: 2,
                  '&:hover': { bgcolor: colors.border }
                }}
              >
                <ListItemIcon sx={{ minWidth: 48 }}>
                  <ContentCopy sx={{ color: colors.accent, fontSize: 32 }} />
                </ListItemIcon>
                <ListItemText 
                  primary="링크 복사" 
                  sx={{ '& .MuiListItemText-primary': { color: colors.text } }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ResultPage;
