import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

import { useMusicContext } from '../context/MusicContext';

const colors = {
  background: '#050505',
  backgroundSoft: '#060708',
  cardBg: '#101416',
  accent: '#2DD4BF',
  accentDark: '#1AA38E',
  border: '#1F2A2E',
  text: '#FFFFFF',
  textMuted: '#8FA3B5',
};

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return (
    <Box sx={{ mt: 3 }}>
      {children}
    </Box>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useMusicContext();
  const authState = state.auth;
  const isLoading = authState.status === 'loading';
  const [tab, setTab] = useState(0);
  const [signUpForm, setSignUpForm] = useState({ displayName: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');
  const textFieldStyles = useMemo(
    () => ({
      '& .MuiOutlinedInput-root': {
        bgcolor: '#12181B',
        borderRadius: 2,
        color: colors.text,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '& input': { color: colors.text },
        '& fieldset': { borderColor: colors.border },
        '&:hover fieldset': { borderColor: colors.accent },
        '&.Mui-focused fieldset': { borderColor: colors.accent },
      },
      '& .MuiInputLabel-root': { color: colors.textMuted },
      '& .MuiInputLabel-root.Mui-focused': { color: colors.accent },
    }),
    []
  );

  const gradient = useMemo(
    () =>
      [
        'radial-gradient(55% 60% at 20% 20%, rgba(45,212,191,0.18), rgba(4,8,8,0) 70%)',
        'radial-gradient(45% 55% at 80% 15%, rgba(32,178,170,0.1), rgba(0,0,0,0) 72%)',
        'linear-gradient(145deg, #050505 0%, #040606 45%, #000000 100%)',
      ].join(', '),
    []
  );

  useEffect(() => {
    if (authState.user) {
      navigate('/library', { replace: true });
    }
  }, [authState.user, navigate]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLocalError('');
    const { email, password, displayName } = signUpForm;
    if (!email || !password || !displayName) {
      setLocalError('이름, 이메일, 비밀번호를 모두 입력해주세요.');
      return;
    }
    try {
      await actions.signUpWithEmail({ email, password, displayName });
    } catch (error) {
      // 이미 컨텍스트에서 에러를 처리하지만, 폼에서도 안내 유지
      setLocalError(error?.message || '회원가입에 실패했어요.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    const { email, password } = loginForm;
    if (!email || !password) {
      setLocalError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    try {
      await actions.signInWithEmail({ email, password });
    } catch (error) {
      setLocalError(error?.message || '로그인에 실패했어요.');
    }
  };

  const redirectFrom = location.state?.from;
  const errorMessage = localError || authState.error;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        bgcolor: colors.background,
        display: 'flex',
        alignItems: 'center',
        py: { xs: 6, md: 10 },
        backgroundImage: gradient,
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(50% 35% at 60% 95%, rgba(45,212,191,0.1), rgba(0,0,0,0) 75%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            position: 'relative',
            bgcolor: colors.cardBg,
            color: colors.text,
            borderRadius: 4,
            border: `1px solid ${colors.border}`,
            boxShadow: `0 25px 55px rgba(0,0,0,0.6), 0 0 35px rgba(45,212,191,0.18)`,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: { xs: 4, md: 6 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
              AI Music Studio
            </Typography>
            <Typography sx={{ color: colors.textMuted, textAlign: 'center', mb: 4 }}>
              나만의 음악을 저장하고 공유하려면 먼저 로그인하세요.
            </Typography>

            <Tabs
              value={tab}
              onChange={(_, value) => {
                setTab(value);
                setLocalError('');
              }}
              variant="fullWidth"
              textColor="inherit"
              TabIndicatorProps={{ style: { backgroundColor: colors.accent } }}
              sx={{
                '& .MuiTab-root': {
                  color: colors.textMuted,
                  fontWeight: 600,
                  textTransform: 'none',
                },
                '& .Mui-selected': {
                  color: colors.text,
                },
              }}
            >
              <Tab label="로그인" />
              <Tab label="회원가입" />
            </Tabs>

            {redirectFrom && !authState.user && (
              <Alert
                severity="info"
                sx={{
                  mt: 3,
                  bgcolor: 'rgba(45,212,191,0.12)',
                  color: colors.accent,
                  borderRadius: 2,
                  border: '1px solid rgba(45,212,191,0.35)',
                  fontWeight: 500,
                }}
              >
                {redirectFrom === '/library'
                  ? '라이브러리는 로그인 후 이용할 수 있어요.'
                  : '이 페이지는 로그인 후 이용할 수 있어요.'}
              </Alert>
            )}

            {errorMessage && (
              <Alert
                severity="error"
                sx={{
                  mt: 3,
                  bgcolor: 'rgba(239,68,68,0.12)',
                  color: '#FCA5A5',
                  borderRadius: 2,
                  border: '1px solid rgba(239,68,68,0.35)',
                }}
              >
                {errorMessage}
              </Alert>
            )}

            <TabPanel value={tab} index={0}>
              <Box component="form" onSubmit={handleLogin} noValidate>
                <Stack spacing={3}>
                  <TextField
                    label="이메일"
                    type="email"
                    fullWidth
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                    sx={textFieldStyles}
                  />
                  <TextField
                    label="비밀번호"
                    type="password"
                    fullWidth
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    sx={textFieldStyles}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    size="large"
                    disabled={isLoading}
                    sx={{
                      mt: 1,
                      py: 1.5,
                      fontWeight: 700,
                      borderRadius: 999,
                      bgcolor: colors.accent,
                      color: '#041311',
                      '&:hover': {
                        bgcolor: colors.accentDark,
                      },
                      '&:disabled': {
                        bgcolor: '#1f3a36',
                        color: '#6fbfb0',
                      },
                    }}
                  >
                    {isLoading ? '로그인 중...' : '로그인'}
                  </Button>
                </Stack>
              </Box>
            </TabPanel>

            <TabPanel value={tab} index={1}>
              <Box component="form" onSubmit={handleSignUp} noValidate>
                <Stack spacing={3}>
                  <TextField
                    label="닉네임"
                    fullWidth
                    value={signUpForm.displayName}
                    onChange={(e) => setSignUpForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    sx={textFieldStyles}
                  />
                  <TextField
                    label="이메일"
                    type="email"
                    fullWidth
                    value={signUpForm.email}
                    onChange={(e) => setSignUpForm((prev) => ({ ...prev, email: e.target.value }))}
                    sx={textFieldStyles}
                  />
                  <TextField
                    label="비밀번호"
                    type="password"
                    fullWidth
                    value={signUpForm.password}
                    onChange={(e) => setSignUpForm((prev) => ({ ...prev, password: e.target.value }))}
                    sx={textFieldStyles}
                  />
                  <Typography variant="caption" sx={{ color: colors.textMuted }}>
                    최소 6자 이상의 비밀번호를 사용해주세요.
                  </Typography>
                  <Button
                    type="submit"
                    fullWidth
                    size="large"
                    disabled={isLoading}
                    sx={{
                      mt: 1,
                      py: 1.5,
                      fontWeight: 700,
                      borderRadius: 999,
                      bgcolor: colors.accent,
                      color: '#041311',
                      '&:hover': {
                        bgcolor: colors.accentDark,
                      },
                      '&:disabled': {
                        bgcolor: '#1f3a36',
                        color: '#6fbfb0',
                      },
                    }}
                  >
                    {isLoading ? '가입 중...' : '회원가입'}
                  </Button>
                </Stack>
              </Box>
            </TabPanel>

            <Typography sx={{ mt: 6, fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
              음악 생성 기능은 로그인 없이도 체험할 수 있지만, 저장과 라이브러리 기능은 계정이 필요해요.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
