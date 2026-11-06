'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

// Returns { user, loading, refresh }. user is null when signed out.
export function useMe() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser((await api('/users/me')).user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { user, loading, refresh };
}
