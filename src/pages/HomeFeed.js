// src/pages/HomeFeed.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Stack,
  CircularProgress,
  Pagination,
} from '@mui/material';
import { PlayArrow, Pause, MusicNote, StarBorder, Star } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useMusicContext } from '../context/MusicContext';
import { subscribeToHomeFeed } from '../services/homeFeedApi';
import { GENRE_OPTIONS } from '../components/common/GenreSelector';
import UserNameWithAvatar from '../components/common/UserNameWithAvatar';

const colors = {
  background: '#050505',
  cardBg: '#111111',
  primary: '#50E3C2',
  accent: '#2DD4BF',
  text: '#FFFFFF',
  textLight: '#A0AEC0',
  border: '#2D3748',
  shadow: '0 18px 45px rgba(80, 227, 194, 0.25)',
};

const THEME_PRESETS = [
  {
    id: 'focus',
    title: '집중 · 공부',
    description: '로파이, 앰비언트 계열의 차분한 배경음악',
    genreTags: ['lofi', 'ambient', 'edm'],
    moodKeywords: ['차분', '집중', '잔잔', '평화'],
  },
  {
    id: 'relax',
    title: '힐링 · 휴식',
    description: '재즈, 어쿠스틱, 부드러운 사운드',
    genreTags: ['jazz', 'citypop', 'rnb'],
    moodKeywords: ['편안', '잔잔', '로맨틱'],
  },
  {
    id: 'retro',
    title: '게임 · 레트로',
    description: '8bit, 신스, 레트로 느낌의 배경음',
    genreTags: ['synthwave', 'edm', 'game'],
    moodKeywords: ['레트로', '신나는', '몽환'],
  },
];

const getGenreLabel = (genreId) => GENRE_OPTIONS.find((g) => g.id === genreId)?.label || genreId;

const formatDuration = (seconds = 0) => {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

const getCreatedAtValue = (item) => {
  if (!item?.createdAt) return 0;
  if (typeof item.createdAt === 'string') {
    const timestamp = new Date(item.createdAt).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
  if (item.createdAt instanceof Date) return item.createdAt.getTime();
  if (typeof item.createdAt === 'object' && typeof item.createdAt.toMillis === 'function') {
    return item.createdAt.toMillis();
  }
  return Number(item.createdAt) || 0;
};

const matchesTheme = (item, themeId) => {
  if (!themeId) return true;
  const theme = THEME_PRESETS.find((preset) => preset.id === themeId);
  if (!theme) return true;

  const genres = Array.isArray(item?.genres) ? item.genres.map((g) => g?.toLowerCase?.() || g) : [];
  const moods = Array.isArray(item?.moods) ? item.moods.map((m) => m?.toLowerCase?.() || m) : [];

  const hasGenre = theme.genreTags.some((tag) => genres.includes(tag.toLowerCase()));
  const hasMood = theme.moodKeywords.some((keyword) =>
    moods.some((mood) => mood?.includes?.(keyword.toLowerCase()))
  );
  return hasGenre || hasMood;
};

const HomeFeed = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewFilter, setViewFilter] = useState('all');
  const [activeThemeId, setActiveThemeId] = useState(null);
  const [activeGenre, setActiveGenre] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const pageSize = 5;

  const audioRef = useRef(null);
  const latestSectionRef = useRef(null);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const navigate = useNavigate();
  const { state, actions } = useMusicContext();
  const user = state?.auth?.user;
  const notifyMissingCreator = () =>
    actions.addNotification?.({
      type: 'info',
      message: '게스트로 저장된 음악이라 크리에이터 프로필이 없어요.',
    });
  const resolveCollectionType = (item) =>
    item?.collectionType === 'beat' || item?.type === 'beat' ? 'beat' : 'track';

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;
    const onEnd = () => setCurrentPlayingId(null);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToHomeFeed({
      limitCount: 80,
      onUpdate: (list) => {
        setItems(list);
        setLoading(false);
      },
      onError: (err) => {
        setError(err);
        setLoading(false);
      },
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const handlePlayClick = (item) => {
    const audio = audioRef.current;
    if (!audio || !item.audioUrl) return;

    if (currentPlayingId === item.id) {
      audio.pause();
      setCurrentPlayingId(null);
      return;
    }

    audio.src = item.audioUrl;
    audio.currentTime = 0;
    audio
      .play()
      .then(() => setCurrentPlayingId(item.id))
      .catch(() => setCurrentPlayingId(null));
  };

  const handleThemeSelect = (themeId) => {
    setActiveThemeId((prev) => (prev === themeId ? null : themeId));
    setCurrentPage(1);
    latestSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleClearTheme = () => setActiveThemeId(null);

  const handleGenreSelect = (genreId) => {
    setActiveGenre((prev) => (prev === genreId ? null : genreId));
    setCurrentPage(1);
    latestSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleClearGenre = () => setActiveGenre(null);

  const handleTypeFilterChange = (value) => {
    setTypeFilter(value);
    setCurrentPage(1);
    latestSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFavoriteToggle = (item) => {
    if (!user) {
      actions.addNotification?.({ type: 'info', message: '로그인 후 즐겨찾기를 사용할 수 있어요.' });
      navigate('/auth');
      return;
    }
    if (item.ownerId !== user.uid) {
      actions.addNotification?.({ type: 'info', message: '내가 만든 배경음악만 즐겨찾기 할 수 있어요.' });
      return;
    }
    const musicType = item.collectionType === 'beat' || item.type === 'beat' ? 'beat' : 'track';
    actions.toggleFavorite?.(item.id, musicType, !!item.isFavorite);
  };

  useEffect(() => {
    if (!user && viewFilter !== 'all') setViewFilter('all');
  }, [user, viewFilter]);

  const genreStats = useMemo(() => {
    const counter = {};
    items.forEach((item) => {
      (item.genres || []).forEach((genre) => {
        const key = genre?.toLowerCase();
        if (!key) return;
        counter[key] = (counter[key] || 0) + 1;
      });
    });
    return Object.entries(counter)
      .map(([genreId, count]) => ({ genreId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [items]);

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];
    if (viewFilter === 'mine') {
      if (!user?.uid) return [];
      result = result.filter((item) => item.ownerId === user.uid);
    } else if (viewFilter === 'others') {
      if (!user?.uid) return [];
      result = result.filter((item) => item.ownerId !== user.uid);
    }
    if (activeThemeId) result = result.filter((item) => matchesTheme(item, activeThemeId));
    if (activeGenre) {
      result = result.filter((item) =>
        (item.genres || []).some((genre) => genre?.toLowerCase?.() === activeGenre.toLowerCase())
      );
    }
    if (typeFilter === 'tracks') {
      result = result.filter((item) => resolveCollectionType(item) === 'track');
    } else if (typeFilter === 'beats') {
      result = result.filter((item) => resolveCollectionType(item) === 'beat');
    }
    result.sort((a, b) => getCreatedAtValue(b) - getCreatedAtValue(a));
    return result;
  }, [items, viewFilter, user, activeThemeId, activeGenre, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredAndSortedItems.slice(startIndex, startIndex + pageSize);

  const summaryText = useMemo(() => {
    const count = filteredAndSortedItems.length;
    const parts = [];
    if (viewFilter === 'mine') parts.push('내가 만든 배경음악');
    else if (viewFilter === 'others') parts.push('다른 사람이 만든 배경음악');
    else parts.push('전체 배경음악');
    if (activeThemeId) {
      const theme = THEME_PRESETS.find((t) => t.id === activeThemeId);
      if (theme) parts.push(`${theme.title} 테마`);
    }
    if (typeFilter === 'tracks') parts.push('트랙만');
    else if (typeFilter === 'beats') parts.push('비트만');
    if (activeGenre) parts.push(`${getGenreLabel(activeGenre)} 장르`);
    return `${parts.join(', ')} – ${count}곡`;
  }, [filteredAndSortedItems.length, viewFilter, activeThemeId, activeGenre, typeFilter]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.background, pt: 6, pb: 10 }}>
      <Container maxWidth="lg">
        {/* Hero */}
        <Box sx={{ mb: { xs: 5, md: 7 } }}>
          <Box
            sx={{
              borderRadius: 4,
              p: { xs: 3.5, md: 6 },
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: { xs: 4, md: 6 },
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(80, 227, 194, 0.3), rgba(33, 43, 90, 0.95))',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 25px 45px rgba(0,0,0,0.45)',
            }}
          >
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h3" sx={{ color: colors.text, fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem' } }}>
                AI Music Studio 홈
              </Typography>
              <Typography sx={{ color: colors.textLight, fontSize: { xs: 16, md: 18 }, lineHeight: 1.6 }}>
                다른 크리에이터들이 만든 짧은 배경음악을 감상하고, 곧바로 나만의 사운드를 제작해 보세요.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/generate')}
                  sx={{
                    bgcolor: colors.primary,
                    color: '#041311',
                    fontWeight: 700,
                    px: 4,
                    py: 1.5,
                    borderRadius: 999,
                    textTransform: 'none',
                    boxShadow: '0 12px 35px rgba(80, 227, 194, 0.35)',
                    '&:hover': { bgcolor: colors.accent },
                  }}
                >
                  배경음악 만들기
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => latestSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  sx={{
                    borderColor: colors.primary,
                    color: colors.text,
                    px: 4,
                    py: 1.5,
                    borderRadius: 999,
                    textTransform: 'none',
                    '&:hover': { borderColor: colors.accent },
                  }}
                >
                  최신 배경음악 듣기
                </Button>
              </Stack>
            </Box>
            <Box
              sx={{
                flex: 1,
                width: '100%',
                display: { xs: 'none', lg: 'flex' },
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: 280,
                  height: 280,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, rgba(80,227,194,0.35), rgba(15,23,42,0.6))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.text,
                  textAlign: 'center',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(80,227,194,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.accent,
                    fontSize: 28,
                    mb: 2,
                  }}
                >
                  ♫
                </Box>
                <Typography sx={{ color: colors.textLight, fontSize: 14 }}>AI Generated</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 20, mt: 0.5 }}>
                  Ambient Beats
                </Typography>
                <Typography sx={{ color: colors.textLight, fontSize: 12, mt: 1 }}>
                  실시간으로 업데이트되는
                  <br />
                  최신 트랙 & 비트
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Themes */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ color: colors.text, fontWeight: 700 }}>
            추천 테마
          </Typography>
          <Typography sx={{ color: colors.textLight, mt: 1 }}>
            상황에 맞는 테마를 골라서 배경음악을 빠르게 찾아보세요.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 3 }}>
            {THEME_PRESETS.map((theme) => {
              const isActive = activeThemeId === theme.id;
              return (
                <Grid key={theme.id} item xs={12} sm={6} md={4}>
                  <Card
                    onClick={() => handleThemeSelect(theme.id)}
                    sx={{
                      p: 3,
                      cursor: 'pointer',
                      borderRadius: 3,
                      height: '100%',
                      bgcolor: isActive ? 'rgba(80,227,194,0.2)' : colors.cardBg,
                      border: `1px solid ${isActive ? colors.accent : colors.border}`,
                      '&:hover': { borderColor: colors.accent },
                    }}
                  >
                    <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600 }}>
                      {theme.title}
                    </Typography>
                    <Typography sx={{ color: colors.textLight, mt: 1 }}>{theme.description}</Typography>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          {activeThemeId && (
            <Button size="small" sx={{ mt: 2 }} onClick={handleClearTheme}>
              테마 선택 해제
            </Button>
          )}
        </Box>

        {/* Genres */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600 }}>
            장르로 둘러보기
          </Typography>
          <Typography sx={{ color: colors.textLight, mt: 0.5 }}>
            자주 사용되는 장르들을 모아두었어요.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, mt: 2 }}>
            {genreStats.length === 0 ? (
              <Typography sx={{ color: colors.textLight }}>아직 장르 정보가 충분하지 않아요.</Typography>
            ) : (
              genreStats.map(({ genreId, count }) => {
                const isActive = activeGenre?.toLowerCase() === genreId;
                return (
                  <Chip
                    key={genreId}
                    label={`${getGenreLabel(genreId)} (${count})`}
                    onClick={() => handleGenreSelect(genreId)}
                    sx={{
                      borderRadius: '999px',
                      color: colors.text,
                      border: `1px solid ${isActive ? colors.accent : colors.border}`,
                      bgcolor: isActive ? 'rgba(80, 227, 194, 0.18)' : '#0A0A0A',
                    }}
                  />
                );
              })
            )}
          </Box>
          {activeGenre && (
            <Button size="small" sx={{ mt: 2 }} onClick={handleClearGenre}>
              장르 필터 지우기
            </Button>
          )}
        </Box>

        {loading && items.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <CircularProgress sx={{ color: colors.accent }} />
            <Typography sx={{ mt: 2, color: colors.textLight }}>배경음악을 불러오는 중이에요...</Typography>
          </Box>
        )}

        {error && !loading && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography sx={{ color: '#F56565', mb: 1 }}>
              홈 피드를 불러오는 중 오류가 발생했어요.
            </Typography>
          </Box>
        )}

        {!loading && !error && items.length === 0 && (
          <Box
            sx={{
              borderRadius: 3,
              border: `1px dashed ${colors.border}`,
              p: { xs: 4, md: 5 },
              textAlign: 'center',
              bgcolor: '#080808',
            }}
          >
            <Typography variant="h6" sx={{ color: colors.text, mb: 1.5 }}>
              아직 생성된 배경음악이 없어요.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/generate')}>
              배경음악 만들기
            </Button>
          </Box>
        )}

        {!loading && !error && items.length > 0 && filteredAndSortedItems.length === 0 && (
          <Box
            sx={{
              borderRadius: 3,
              border: `1px dashed ${colors.border}`,
              p: 4,
              textAlign: 'center',
              bgcolor: '#080808',
            }}
          >
            <Typography sx={{ color: colors.textLight }}>조건에 맞는 배경음악이 없어요.</Typography>
          </Box>
        )}

        {!loading && !error && filteredAndSortedItems.length > 0 && (
          <>
            <Box ref={latestSectionRef} sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ color: colors.text, fontWeight: 700 }}>
                최신 배경음악
              </Typography>
              <Typography sx={{ color: colors.textLight, mt: 0.5 }}>
                방금 생성된 순서대로 짧은 배경음악을 모아둔 리스트입니다.
              </Typography>
              <Typography sx={{ color: colors.textLight, mt: 1 }}>{summaryText}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                {[
                  { value: 'all', label: '전체' },
                  { value: 'tracks', label: '트랙만' },
                  { value: 'beats', label: '비트만' },
                ].map((option) => {
                  const isActive = typeFilter === option.value;
                  return (
                    <Chip
                      key={option.value}
                      label={option.label}
                      onClick={() => handleTypeFilterChange(option.value)}
                      sx={{
                        borderRadius: '999px',
                        border: `1px solid ${isActive ? colors.accent : colors.border}`,
                        bgcolor: isActive ? 'rgba(80, 227, 194, 0.18)' : '#0F1116',
                        color: colors.text,
                        fontSize: 12,
                        px: 0.5,
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            <Grid container spacing={3}>
              {paginatedItems.map((item) => {
                const collectionType = item.collectionType || item.type;
                const isPlaying = currentPlayingId === item.id;
                const canFavorite = user && item.ownerId === user.uid;
                const canPlay = Boolean(item.audioUrl);

                return (
                  <Grid key={`${collectionType}-${item.id}`} item xs={12} sm={6} md={4}>
                    <Card
                      sx={{
                        bgcolor: colors.cardBg,
                        borderRadius: 3,
                        border: `1px solid ${isPlaying ? colors.accent : colors.border}`,
                        boxShadow: isPlaying ? colors.shadow : '0 12px 25px rgba(0,0,0,0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                      }}
                    >
                      <CardContent sx={{ pb: 2.5, flexGrow: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1.5,
                          }}
                        >
                          <Chip
                            size="small"
                            label={collectionType === 'beat' ? '비트' : '트랙'}
                            sx={{
                              bgcolor: 'rgba(80, 227, 194, 0.12)',
                              color: colors.text,
                              borderRadius: '999px',
                              fontSize: 11,
                              border: `1px solid rgba(80, 227, 194, 0.3)`,
                            }}
                          />
                          {item.duration && (
                            <Typography sx={{ color: colors.textLight, fontSize: 12 }}>
                              {formatDuration(item.duration)}
                            </Typography>
                          )}
                        </Box>

                        <Typography
                          variant="h6"
                          sx={{
                            color: colors.text,
                            fontWeight: 600,
                            mb: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title || '제목 없는 배경음악'}
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <UserNameWithAvatar
                            userId={item.ownerId}
                            size={20}
                            textColor={colors.textLight}
                            fallbackName={item.ownerNickname || item.creatorNickname}
                            onMissingOwner={notifyMissingCreator}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                          {(item.genres || []).slice(0, 2).map((genre) => (
                            <Chip
                              key={genre}
                              label={getGenreLabel(genre)}
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: 11,
                                bgcolor: 'rgba(80, 227, 194, 0.08)',
                                border: `1px solid ${colors.accent}`,
                                color: colors.text,
                              }}
                            />
                          ))}
                        </Box>

                        {collectionType === 'beat' && item.bpm && (
                          <Typography sx={{ color: colors.textLight, fontSize: 12, mb: 1 }}>
                            {item.bpm} BPM{(item.genres || []).length ? ` · ${getGenreLabel(item.genres[0])} 비트` : ''}
                          </Typography>
                        )}

                        {item.description && (
                          <Typography
                            sx={{
                              color: colors.textLight,
                              fontSize: 13,
                              lineHeight: 1.5,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {item.description}
                          </Typography>
                        )}
                      </CardContent>

                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 2,
                          pb: 1.8,
                          pt: 0.5,
                          borderTop: `1px solid rgba(255, 255, 255, 0.04)`,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <IconButton
                            onClick={() => canPlay && handlePlayClick(item)}
                            disabled={!canPlay}
                            sx={{
                              bgcolor: isPlaying ? colors.primary : '#1A202C',
                              color: isPlaying ? '#000' : colors.text,
                              opacity: canPlay ? 1 : 0.4,
                            }}
                            size="small"
                          >
                            {isPlaying ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
                          </IconButton>
                          <Typography sx={{ fontSize: 13, color: colors.textLight }}>
                            {canPlay ? (isPlaying ? '재생 중...' : '미리 듣기') : '오디오 없음'}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleFavoriteToggle(item)}
                            disabled={!canFavorite}
                            sx={{
                              color: item.isFavorite ? colors.accent : colors.textLight,
                              bgcolor: canFavorite && item.isFavorite ? 'rgba(45, 212, 191, 0.15)' : 'transparent',
                            }}
                          >
                            {item.isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                          </IconButton>
                          <MusicNote sx={{ fontSize: 18, color: colors.textLight }} />
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, value) => setCurrentPage(value)}
                color="primary"
                shape="rounded"
                sx={{
                  '& .MuiPaginationItem-root': { color: colors.textLight },
                  '& .MuiPaginationItem-page.Mui-selected': {
                    bgcolor: colors.primary,
                    color: '#041311',
                  },
                }}
              />
            </Box>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              {!loading && currentPage === totalPages && (
                <Typography sx={{ color: colors.textLight }}>
                  모든 배경음악을 불러왔습니다.
                </Typography>
              )}
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
};

export default HomeFeed;
