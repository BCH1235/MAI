// src/components/layout/Navbar.js
import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  Container,
  IconButton
} from '@mui/material';
import { Menu } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMusicContext } from '../../context/MusicContext';

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

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useMusicContext();
  const auth = state.auth;
  const isAuthed = Boolean(auth.user);

  const navItems = [
    { label: '홈', path: '/home' },
    { label: '음악 생성', path: '/generate', fallback: '/' },
    { label: '비트 만들기', path: '/convert' },
    { label: '악보 연주', path: '/score-to-midi' },
    { label: '라이브러리', path: '/library' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const checkIsActive = (path, fallback) => {
    if (!path) return false;
    if (path === '/home') {
      return location.pathname === path;
    }
    if (location.pathname === path) return true;
    if (fallback && location.pathname === fallback) return true;
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    try {
      await actions.signOut();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        bgcolor: colors.cardBg,
        borderBottom: `1px solid ${colors.accent}`,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar 
          disableGutters
          sx={{
            minHeight: { xs: '64px', md: '80px' },
            justifyContent: 'space-between'
          }}
        >
          {/* 로고 */}
          <Box 
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => handleNavigation('/')}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                color: colors.text,
                fontSize: { xs: '1.2rem', md: '1.5rem' }
              }}
            >
              AI Music Studio
            </Typography>
          </Box>

          {/* 데스크탑 메뉴 */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            {navItems.map((item) => {
              const isActive = checkIsActive(item.path, item.fallback);
              return (
                <Button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    color: isActive ? colors.primary : colors.text,
                    fontWeight: isActive ? 700 : 500,
                    textTransform: 'none',
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    borderBottom: isActive ? `2px solid ${colors.primary}` : '2px solid transparent',
                    bgcolor: isActive ? 'rgba(80, 227, 194, 0.08)' : 'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': { bgcolor: colors.background, color: colors.accent }
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          {/* 사용자 인증 버튼 */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
            {isAuthed ? (
              <>
                <Typography sx={{ color: colors.textLight, fontWeight: 500 }}>
                  {auth.user.displayName || auth.user.email}
                </Typography>
                <Button
                  onClick={handleSignOut}
                  sx={{
                    color: '#041311',
                    bgcolor: colors.accent,
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#26b8a4' }
                  }}
                >
                  로그아웃
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleNavigation('/auth')}
                sx={{
                  color: '#041311',
                  bgcolor: colors.accent,
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#26b8a4' }
                }}
              >
                로그인
              </Button>
            )}
          </Box>

          {/* 모바일 메뉴 */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
            <IconButton
              size="large"
              sx={{ color: colors.text, '&:hover': { bgcolor: colors.background, color: colors.accent } }}
              onClick={() => handleNavigation('/generate')} // 모바일 메뉴 클릭 시 단순 이동
            >
              <Menu />
            </IconButton>

            {isAuthed ? (
              <Button
                onClick={handleSignOut}
                size="small"
                sx={{
                  color: '#041311',
                  bgcolor: colors.accent,
                  px: 2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#26b8a4' }
                }}
              >
                로그아웃
              </Button>
            ) : (
              <Button
                onClick={() => handleNavigation('/auth')}
                size="small"
                sx={{
                  color: '#041311',
                  bgcolor: colors.accent,
                  px: 2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#26b8a4' }
                }}
              >
                로그인
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
