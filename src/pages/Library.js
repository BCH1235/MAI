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

import { useMusicContext } from '../context/MusicContext';
import { GENRE_OPTIONS } from '../components/common/GenreSelector';

const Library = () => {
  const { state, actions } = useMusicContext();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState('date');
  const [filterBy, setFilterBy] = React.useState('all');

  const { musicList, loading, error } = state.library;

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
      if (filterBy !== 'all' && music.type !== filterBy) {
        return false;
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
          return b.duration - a.duration;
        case 'favorites':
          return b.isFavorite - a.isFavorite;
        default:
          return 0;
      }
    });

  // 이벤트 핸들러들
  const handlePlay = (music) => {
    actions.addNotification({
      type: 'info',
      message: `"${music.title}" 재생을 시작합니다.`
    });
  };

  const handleDownload = (music) => {
    actions.addNotification({
      type: 'success',
      message: `"${music.title}" 다운로드가 시작되었습니다.`
    });
  };

  const handleDelete = (musicId) => {
    actions.addNotification({
      type: 'success',
      message: '음악이 라이브러리에서 제거되었습니다.'
    });
  };

  const handleToggleFavorite = (musicId) => {
    actions.addNotification({
      type: 'info',
      message: '즐겨찾기 상태가 변경되었습니다.'
    });
  };

  // 검은색 배경에 에메랄드 테마
  const colors = {
    background: '#0A0A0A',         // 검은색 배경
    cardBg: '#1A1A1A',            // 어두운 카드 배경
    primary: '#50E3C2',           // 에메랄드 (Emerald)
    secondary: '#40D9B8',         // 연한 에메랄드
    accent: '#2DD4BF',            // 터콰이즈 (Teal)
    text: '#FFFFFF',              // 흰색 텍스트
    textLight: '#CCCCCC',         // 연한 회색 텍스트
    border: '#333333',            // 어두운 테두리
    shadow: 'rgba(80, 227, 194, 0.3)' // 에메랄드 그림자
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
                <InputLabel sx={{ color: colors.textLight, '&.Mui-focused': { color: colors.primary } }}>정렬 기준</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
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
                <InputLabel sx={{ color: colors.textLight, '&.Mui-focused': { color: colors.primary } }}>필터</InputLabel>
                <Select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
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
              잠시 후 다시 시도해주세요.
            </Typography>
          </Box>
        ) : filteredAndSortedMusic.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <MusicNote sx={{ fontSize: '4rem', color: colors.textLight, mb: 2 }} />
            <Typography variant="h5" color={colors.textLight} sx={{ mb: 1 }}>
              저장된 곡이 아직 없어요
            </Typography>
            <Typography variant="body1" color={colors.textLight}>
              음악을 생성하거나 비트를 만들어 저장해보세요!
            </Typography>
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
                        label={music.type === 'generated' ? '생성됨' : '변환됨'}
                        size="small"
                        sx={{
                          bgcolor: music.type === 'generated' ? '#1A1A1A' : '#1A1A1A',
                          color: music.type === 'generated' ? '#FFD700' : '#DAA520',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          border: `2px solid ${music.type === 'generated' ? '#FFD700' : '#DAA520'}`
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleToggleFavorite(music.id)}
                        sx={{ 
                          color: music.isFavorite ? colors.warning : colors.textLight,
                          '&:hover': {
                            bgcolor: music.isFavorite ? '#FFF8E1' : colors.border
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
                      {formatTime(music.duration)}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      startIcon={<PlayArrow />}
                      onClick={() => handlePlay(music)}
                      sx={{
                        color: colors.primary,
                        '&:hover': {
                          bgcolor: '#F3F4FF'
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
                          bgcolor: '#F0FDFC'
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
