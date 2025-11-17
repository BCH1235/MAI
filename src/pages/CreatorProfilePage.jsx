import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Tabs,
  Tab,
  Typography,
  Card,
  CardContent,
  IconButton,
  Pagination,
} from '@mui/material';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useUserProfile from '../hooks/useUserProfile';
import UserAvatar from '../components/common/UserAvatar';
import UserNameWithAvatar from '../components/common/UserNameWithAvatar';
import { GENRE_OPTIONS } from '../components/common/GenreSelector';
import { PlayArrow, Pause, MusicNote } from '@mui/icons-material';

const colors = {
  background: '#050505',
  cardBg: '#111111',
  text: '#FFFFFF',
  textLight: '#A0AEC0',
  accent: '#2DD4BF',
  border: '#1F2937',
};

const getCreatedAtValue = (item) => {
  if (!item?.createdAt) return 0;
  if (typeof item.createdAt === 'string') {
    const time = new Date(item.createdAt).getTime();
    return Number.isNaN(time) ? 0 : time;
  }
  if (item.createdAt?.toMillis) return item.createdAt.toMillis();
  if (item.createdAt instanceof Date) return item.createdAt.getTime();
  return Number(item.createdAt) || 0;
};

const formatDuration = (seconds = 0) => {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

const normalizeDoc = (docSnap, type) => ({
  id: docSnap.id,
  collectionType: type,
  ...docSnap.data(),
});

const pageSize = 6;

const CreatorProfilePage = () => {
  const { userId } = useParams();
  const { profile, loading: profileLoading } = useUserProfile(userId);
  const [activeTab, setActiveTab] = useState('tracks');
  const [tracksState, setTracksState] = useState({ items: [], loading: true });
  const [beatsState, setBeatsState] = useState({ items: [], loading: true });
  const [currentPage, setCurrentPage] = useState(1);
  const audioRef = React.useRef(null);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);

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
    if (!userId) return undefined;
    setTracksState((prev) => ({ ...prev, loading: true }));
    const q = query(collection(db, 'tracks'), where('ownerId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map((docSnap) => normalizeDoc(docSnap, 'track'))
          .sort((a, b) => getCreatedAtValue(b) - getCreatedAtValue(a));
        setTracksState({ items, loading: false });
      },
      (error) => {
        console.warn('[CreatorProfile] tracks subscribe error', error);
        setTracksState({ items: [], loading: false, error });
      }
    );
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    setBeatsState((prev) => ({ ...prev, loading: true }));
    const q = query(collection(db, 'beats'), where('ownerId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map((docSnap) => normalizeDoc(docSnap, 'beat'))
          .sort((a, b) => getCreatedAtValue(b) - getCreatedAtValue(a));
        setBeatsState({ items, loading: false });
      },
      (error) => {
        console.warn('[CreatorProfile] beats subscribe error', error);
        setBeatsState({ items: [], loading: false, error });
      }
    );
    return () => unsubscribe();
  }, [userId]);

  const tracks = tracksState.items;
  const beats = beatsState.items;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, tracks.length, beats.length]);

  const currentLoading = activeTab === 'tracks' ? tracksState.loading : beatsState.loading;

  if (!userId) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: colors.background, color: colors.text, p: 4 }}>
        <Typography>잘못된 사용자입니다.</Typography>
      </Box>
    );
  }

  if (profileLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: colors.accent }} />
      </Box>
    );
  }

  const hasAnyWorks = tracks.length > 0 || beats.length > 0;
  const showNotFound =
    !profile &&
    !tracksState.loading &&
    !beatsState.loading &&
    !hasAnyWorks;
  const creatorDisplayName =
    profile?.nickname ||
    profile?.displayName ||
    tracks[0]?.ownerNickname ||
    tracks[0]?.creatorNickname ||
    beats[0]?.ownerNickname ||
    beats[0]?.creatorNickname ||
    '이름 없는 크리에이터';

  if (showNotFound) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: colors.background, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>존재하지 않는 크리에이터입니다.</Typography>
      </Box>
    );
  }

  const handlePlayClick = (item) => {
    if (!item?.audioUrl) return;
    const audio = audioRef.current;
    if (!audio) return;
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

  const activeItems = activeTab === 'tracks' ? tracks : beats;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = activeItems.slice(startIndex, startIndex + pageSize);

  return (
    <Box sx={{ bgcolor: colors.background, minHeight: '100vh', py: 6 }}>
      <Container maxWidth="lg">
        <Paper
          sx={{
            p: 4,
            mb: 4,
            bgcolor: colors.cardBg,
            borderRadius: 4,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <UserAvatar
              userId={userId}
              size={72}
              profile={profile || undefined}
              textColor="#0A0A0A"
              fallbackName={creatorDisplayName}
              displayNameOverride={creatorDisplayName}
            />
            <Box>
              <Typography variant="h4" sx={{ color: colors.text, fontWeight: 700 }}>
                {creatorDisplayName}
              </Typography>
              <Typography sx={{ color: colors.textLight, mt: 0.5 }}>
                전체 배경음악 {tracks.length}곡 · 비트 {beats.length}개
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ bgcolor: colors.cardBg, borderRadius: 3, border: `1px solid ${colors.border}` }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            sx={{
              borderBottom: `1px solid ${colors.border}`,
              '& .MuiTab-root': { color: colors.textLight, fontWeight: 600 },
              '& .Mui-selected': { color: colors.accent },
              '& .MuiTabs-indicator': { backgroundColor: colors.accent },
            }}
            variant="fullWidth"
          >
            <Tab label={`배경음악 (${tracksState.items.length})`} value="tracks" />
            <Tab label={`비트 (${beatsState.items.length})`} value="beats" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {currentLoading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress sx={{ color: colors.accent }} />
              </Box>
            ) : paginatedItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', color: colors.textLight, py: 4 }}>
                <Typography>
                  {activeTab === 'tracks'
                    ? '아직 만든 배경음악이 없습니다.'
                    : '아직 만든 비트가 없습니다.'}
                </Typography>
              </Box>
            ) : (
              <>
                <Grid container spacing={3}>
                  {paginatedItems.map((item) => {
                    const collectionType = item.collectionType || item.type;
                    const canPlay = Boolean(item.audioUrl);
                    const isPlaying = currentPlayingId === item.id;
                    return (
                      <Grid item xs={12} sm={6} md={4} key={`${collectionType}-${item.id}`}>
                        <Card
                          sx={{
                            bgcolor: colors.cardBg,
                            borderRadius: 3,
                            border: `1px solid ${colors.border}`,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
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

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                              {(item.genres || []).slice(0, 3).map((genre) => {
                                const info = GENRE_OPTIONS.find((g) => g.id === genre);
                                return (
                                  <Chip
                                    key={genre}
                                    label={info?.label || genre}
                                    size="small"
                                    sx={{
                                      height: 24,
                                      fontSize: 11,
                                      bgcolor: 'rgba(80, 227, 194, 0.08)',
                                      border: `1px solid ${colors.accent}`,
                                      color: colors.text,
                                    }}
                                  />
                                );
                              })}
                            </Box>

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

                            <Box sx={{ mt: 1 }}>
                              <UserNameWithAvatar
                                userId={item.ownerId}
                                size={20}
                                textColor={colors.textLight}
                                fallbackName={item.ownerNickname || item.creatorNickname}
                                clickable={false}
                              />
                            </Box>
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
                                onClick={() => handlePlayClick(item)}
                                disabled={!canPlay}
                                sx={{
                                  bgcolor: isPlaying ? colors.accent : '#1A202C',
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

                            <MusicNote sx={{ fontSize: 18, color: colors.textLight }} />
                          </Box>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
                {totalPages > 1 && (
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
                          bgcolor: colors.accent,
                          color: '#041311',
                        },
                      }}
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CreatorProfilePage;
