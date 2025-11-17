import React from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import useUserProfile from '../../hooks/useUserProfile';

const AVATAR_COLORS = [
  '#2DD4BF',
  '#6366F1',
  '#F97316',
  '#F43F5E',
  '#0EA5E9',
  '#A855F7',
  '#22C55E',
  '#EAB308',
];

const getColorByIndex = (index = 0) => {
  const normalized = Math.abs(index) % AVATAR_COLORS.length;
  return AVATAR_COLORS[normalized];
};

const UserAvatar = ({
  userId,
  size = 32,
  showName = false,
  profile: profileOverride = null,
  fallbackName = 'Guest',
  textColor = '#FFFFFF',
  displayNameOverride,
}) => {
  const shouldSubscribe = Boolean(userId) && !profileOverride;
  const { profile } = useUserProfile(shouldSubscribe ? userId : null);
  const data = profileOverride || profile || null;

  const resolvedName =
    displayNameOverride ||
    data?.nickname ||
    data?.displayName ||
    fallbackName;
  const initial = resolvedName?.charAt(0)?.toUpperCase() || '?';
  const avatarColor = getColorByIndex(data?.avatarIndex ?? 0);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: showName ? 1 : 0 }}>
      <Avatar
        src={data?.photoURL || undefined}
        alt={resolvedName}
        sx={{
          width: size,
          height: size,
          bgcolor: data?.photoURL ? 'transparent' : avatarColor,
          color: textColor,
          fontWeight: 700,
          fontSize: size * 0.45,
          boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
        }}
      >
        {!data?.photoURL ? initial : null}
      </Avatar>
      {showName ? (
        <Typography sx={{ color: textColor, fontWeight: 600 }}>{resolvedName}</Typography>
      ) : null}
    </Box>
  );
};

export default UserAvatar;
