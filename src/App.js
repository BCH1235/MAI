import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

// 페이지 및 컴포넌트
import Navbar from './components/layout/Navbar';
import MusicGeneration from './pages/MusicGeneration';
import MusicConversion from './pages/MusicConversion';
import ResultPage from './pages/ResultPage';
import Library from './pages/Library';
import AuthPage from './pages/Auth';
import ScoreToMusic from './pages/ScoreToMusic';
import RequireAuth from './components/common/RequireAuth';
import { MusicContextProvider } from './context/MusicContext';

// ✅ MUI 테마 설정
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6366F1' },
    secondary: { main: '#8B5CF6' },
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700 },
    h2: { fontSize: '2rem', fontWeight: 600 },
    h3: { fontSize: '1.5rem', fontWeight: 500 },
    body1: { fontSize: '1rem', fontWeight: 400 },
    caption: { fontSize: '0.875rem', fontWeight: 400 },
  },
  shape: { borderRadius: 8 },
  spacing: 8,
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MusicContextProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* ✅ 모든 페이지에서 공통으로 보여줄 Navbar */}
            <Navbar />

            {/* ✅ 라우터로 각 페이지 연결 */}
            <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
              <Routes>
                {/* 기본 홈 (AI 음악 생성) */}
                <Route path="/" element={<MusicGeneration />} />
                <Route path="/generate" element={<MusicGeneration />} />

                {/* 음악 변환 페이지 */}
                <Route path="/convert" element={<MusicConversion />} />

                {/* 악보 → 음악 변환 페이지 */}
                <Route path="/score-to-midi" element={<ScoreToMusic />} />

                {/* 결과 페이지 */}
                <Route path="/result" element={<ResultPage />} />

                {/* 라이브러리 (로그인 필요) */}
                <Route
                  path="/library"
                  element={
                    <RequireAuth>
                      <Library />
                    </RequireAuth>
                  }
                />

                {/* 로그인/회원가입 */}
                <Route path="/auth" element={<AuthPage />} />

                {/* ✅ 예외 처리 (잘못된 주소 → 홈으로) */}
                <Route path="*" element={<MusicGeneration />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </MusicContextProvider>
    </ThemeProvider>
  );
}

export default App;
