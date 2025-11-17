import { useEffect, useState } from 'react';
import { subscribeToUserProfile } from '../services/userProfileApi';

export default function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToUserProfile(userId, {
      onUpdate: (data) => {
        setProfile(data);
        setLoading(false);
      },
      onError: (err) => {
        setError(err);
        setLoading(false);
      },
    });

    return () => unsubscribe?.();
  }, [userId]);

  return { profile, loading, error };
}
