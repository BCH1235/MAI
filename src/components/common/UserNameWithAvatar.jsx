import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import useUserProfile from '../../hooks/useUserProfile';
import UserAvatar from './UserAvatar';

const UserNameWithAvatar = ({
  userId,
  size = 24,
  textColor = '#A0AEC0',
  fallbackName = 'Guest',
  clickable = true,
  onMissingOwner,
}) => {
  const navigate = useNavigate();
  const { profile } = useUserProfile(userId);
  const resolvedName =
    profile?.nickname ||
    profile?.displayName ||
    fallbackName ||
    'Guest';

  const handleClick = () => {
    if (!clickable) return;
    if (!userId) {
      onMissingOwner?.();
      return;
    }
    navigate(`/creator/${userId}`);
  };

  if (!clickable) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <UserAvatar
          userId={userId}
          size={size}
          profile={profile || undefined}
          fallbackName={resolvedName}
          displayNameOverride={resolvedName}
        />
        <Typography sx={{ color: textColor, fontSize: 13, fontWeight: 600 }}>
          by {resolvedName}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'pointer',
        '&:hover': { opacity: 0.9 },
      }}
    >
      <UserAvatar
        userId={userId}
        size={size}
        profile={profile || undefined}
        fallbackName={resolvedName}
        displayNameOverride={resolvedName}
      />
      <Typography sx={{ color: textColor, fontSize: 13, fontWeight: 600 }}>
        by {resolvedName}
      </Typography>
    </Box>
  );
};

export default UserNameWithAvatar;
