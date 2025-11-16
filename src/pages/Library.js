import React from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { 
  Search,
  PlayArrow,
  Download,
  Delete,
  Favorite,
  MusicNote
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useMusicContext } from '../context/MusicContext';
import { GENRE_OPTIONS } from '../components/common/GenreSelector';

const Library = () => {
  const navigate = useNavigate();
  const { state, actions } = useMusicContext();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState('date');
  const [filterBy, setFilterBy] = React.useState('all');

  const { musicList, loading, error } = state.library;

  console.log('=== Library 페이지 ===');
  console.log('musicList:', musicList);
  console.log('musicList 개수:', musicList?.length);

  // 장르 정보 가져오기
  const getGenreInfo = (genreId) => {
    return GENRE_OPTIONS.find(g => g.id === genreId) || { label: genreId, color: '#6366F1' };
  };

  // 시간 포맷팅
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 필터링 및 정렬된 음악 리스트
  const getCreatedAt = (item) => {
    if (!item?.createdAt) return 0;
    if (typeof item.createdAt === 'string') {
      return new Date(item.createdAt).getTime() || 0;
    }
    if (item.createdAt?.toMillis) {
      return item.createdAt.toMillis();
    }
    return Number(item.createdAt) || 0;
  };

  const filteredAndSortedMusic = musicList
    .filter((music) => {
      // 검색 필터
      if (searchQuery && !music.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // 타입 필터
      if (filterBy !== 'all') {
        if (filterBy === 'generated' && music.type !== 'generated') return false;
        if (filterBy === 'converted' && !['converted', 'score-generated', 'score-audio'].includes(music.type)) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return getCreatedAt(b) - getCreatedAt(a);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'favorites':
          return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        default:
          return 0;
      }
    });

  // 이벤트 핸들러들
  const handlePlay = (music) => {
    // Result 페이지로 이동하면서 해당 음악 데이터 전달
    const isConversion = ['converted', 'score-generated', 'score-audio'].includes(music.type);
    
    actions.setResult?.({ 
      convertedMusic: isConversion ? music : null,
      generatedMusic: !isConversion ? music : null
    });
    
    navigate('/result');
  };

  const handleDownload = (music) => {
    try {
      const a = document.createElement('a');
      a.href = music.audioUrl;
      const extension = music.audioUrl.endsWith('.wav') ? 'wav' : 'mp3';
      a.download = `${music.title}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      actions.addNotification?.({
        type: 'success',
        message: `"${music.title}" 다운로드가 시작되었습니다.`
      });
    } catch (error) {
      console.error('Download error:', error);
      actions.addNotification?.({
        type: 'error',
        message: '다운로드에 실패했습니다.'
      });
    }
  };

  const handleDelete = (musicId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      actions.removeFromLibrary?.(musicId);
      actions.addNotification?.({
        type: 'success',
        message: '음악이 라이브러리에서 제거되었습니다.'
      });
    }
  };

  const handleToggleFavorite = (music) => {
    // [기존 alert 로직 삭제]
    if (!music || !music.id) return;
    
    // music 객체에서 type을 추론합니다.
    const musicType = music.type === 'beat' ? 'beat' : 'track';
    
    // context action을 호출합니다.
    actions.toggleFavorite?.(music.id, musicType, !!music.isFavorite);
  };

  // 색상 테마
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

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: colors.background,
      backgroundImage: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)'
    }}>
      <Container maxWidth="xl" sx={{ py: 6 }}>
        {/* 페이지 헤더 */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography 
            variant="h2" 
            component="h1"
            sx={{ 
              fontWeight: 700,
              color: colors.text,
              mb: 2
            }}
          >
            라이브러리
          </Typography>
          
          <Typography 
            variant="h6" 
            sx={{ 
              color: colors.textLight,
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            생성하고 변환한 음악들을 관리하세요
          </Typography>
        </Box>

        {/* 검색 및 필터 */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            mb: 4,
            bgcolor: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: 3,
            boxShadow: `0 4px 20px ${colors.shadow}`
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="음악 제목으로 검색..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: colors.textLight }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    color: colors.text,
                    '& fieldset': {
                      borderColor: colors.border,
                    },
                    '&:hover fieldset': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: colors.primary,
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: colors.textLight,
                    opacity: 1,
                  },
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: colors.textLight, '&.Mui-focused': { color: colors.primary } }}>
                  정렬 기준
                </InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="정렬 기준"
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: colors.cardBg,
                        border: `1px solid ${colors.border}`,
                        '& .MuiMenuItem-root': {
                          color: colors.text,
                          '&:hover': {
                            bgcolor: colors.border,
                          },
                          '&.Mui-selected': {
                            bgcolor: colors.primary,
                            color: '#000000',
                            '&:hover': {
                              bgcolor: colors.primary,
                            },
                          },
                        },
                      },
                    },
                  }}
                  sx={{
                    borderRadius: 2,
                    color: colors.text,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.border,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                  }}
                >
                  <MenuItem value="date">최신순</MenuItem>
                  <MenuItem value="title">제목순</MenuItem>
                  <MenuItem value="duration">재생시간</MenuItem>
                  <MenuItem value="favorites">즐겨찾기</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: colors.textLight, '&.Mui-focused': { color: colors.primary } }}>
                  필터
                </InputLabel>
                <Select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  label="필터"
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: colors.cardBg,
                        border: `1px solid ${colors.border}`,
                        '& .MuiMenuItem-root': {
                          color: colors.text,
                          '&:hover': {
                            bgcolor: colors.border,
                          },
                          '&.Mui-selected': {
                            bgcolor: colors.primary,
                            color: '#000000',
                            '&:hover': {
                              bgcolor: colors.primary,
                            },
                          },
                        },
                      },
                    },
                  }}
                  sx={{
                    borderRadius: 2,
                    color: colors.text,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.border,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                  }}
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="generated">생성된 음악</MenuItem>
                  <MenuItem value="converted">변환된 음악</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* 음악 리스트 */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress sx={{ color: colors.accent }} />
            <Typography variant="body1" color={colors.textLight} sx={{ mt: 2 }}>
              라이브러리를 불러오는 중이에요...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" color="#FCA5A5" sx={{ mb: 1 }}>
              데이터를 불러오지 못했어요
            </Typography>
            <Typography variant="body1" color={colors.textLight}>
              {error}
            </Typography>
          </Box>
        ) : filteredAndSortedMusic.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <MusicNote sx={{ fontSize: '4rem', color: colors.textLight, mb: 2 }} />
            <Typography variant="h5" color={colors.textLight} sx={{ mb: 1 }}>
              {searchQuery ? '검색 결과가 없어요' : '저장된 곡이 아직 없어요'}
            </Typography>
            <Typography variant="body1" color={colors.textLight} sx={{ mb: 3 }}>
              {searchQuery ? '다른 검색어로 시도해보세요.' : '음악을 생성하거나 악보를 변환해서 저장해보세요!'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{
                bgcolor: colors.accent,
                color: colors.background,
                '&:hover': { bgcolor: colors.primary }
              }}
            >
              홈으로 가기
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredAndSortedMusic.map((music) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={music.id}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: colors.cardBg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 3,
                    boxShadow: `0 4px 20px ${colors.shadow}`,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 30px ${colors.shadow}`
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    {/* 타입 표시 */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Chip 
                        label={
                          music.type === 'generated' ? '생성됨' : 
                          music.type === 'score-generated' || music.type === 'score-audio' ? '악보 연주' : 
                          '변환됨'
                        }
                        size="small"
                        sx={{
                          bgcolor: '#1A1A1A',
                          color: music.type === 'generated' ? '#FFD700' : '#50E3C2',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          border: `2px solid ${music.type === 'generated' ? '#FFD700' : '#50E3C2'}`
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleToggleFavorite(music)}
                        sx={{ 
                          color: music.isFavorite ? '#FFD700' : colors.textLight, 
                    '&:hover': {
                      bgcolor: music.isFavorite ? 'rgba(255, 215, 0, 0.1)' : colors.border
                          }
                        }}
                      >
                        <Favorite />
                      </IconButton>
                    </Box>

                    {/* 제목 */}
                    <Typography 
                      variant="h6" 
                      component="h3"
                      sx={{ 
                        fontWeight: 600,
                        color: colors.text,
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {music.title}
                    </Typography>

                    {/* 장르/분위기 태그 */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {music.genres && music.genres.map((genre) => {
                        const genreInfo = getGenreInfo(genre);
                        return (
                          <Chip
                            key={genre}
                            label={genreInfo.label}
                            size="small"
                            sx={{
                              bgcolor: colors.border,
                              color: colors.text,
                              fontSize: '0.75rem'
                            }}
                          />
                        );
                      })}
                      {music.targetGenre && (
                        <Chip
                          label={getGenreInfo(music.targetGenre).label}
                          size="small"
                          sx={{
                            bgcolor: colors.border,
                            color: colors.text,
                            fontSize: '0.75rem'
                          }}
                        />
                      )}
                    </Box>

                    {/* 재생시간 */}
                    <Typography variant="body2" color={colors.textLight}>
                      {formatTime(music.duration || 0)}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      startIcon={<PlayArrow />}
                      onClick={() => handlePlay(music)}
                      sx={{
                        color: colors.primary,
                        '&:hover': {
                          bgcolor: 'rgba(80, 227, 194, 0.1)'
                        }
                      }}
                    >
                      재생
                    </Button>
                    <Button
                      startIcon={<Download />}
                      onClick={() => handleDownload(music)}
                      sx={{
                        color: colors.accent,
                        '&:hover': {
                          bgcolor: 'rgba(45, 212, 191, 0.1)'
                        }
                      }}
                    >
                      다운로드
                    </Button>
                    <IconButton
                      onClick={() => handleDelete(music.id)}
                      sx={{
                        color: colors.textLight,
                        ml: 'auto',
                        '&:hover': {
                          bgcolor: '#FFEBEE',
                          color: '#F44336'
                        }
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default Library;