import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

import { useMusicContext } from '../../context/MusicContext';

export default function RequireAuth({ children }) {
  const {
    state: {
      auth: { user, status },
    },
  } = useMusicContext();
  const location = useLocation();

  if (status === 'loading' || status === 'idle') {
    return (
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
          bgcolor: '#050505',
        }}
      >
        <CircularProgress size={36} sx={{ color: '#2DD4BF' }} />
        <Typography sx={{ color: '#8FA3B5', fontWeight: 500 }}>
          접속 상태를 확인하고 있어요...
        </Typography>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return children;
}
