import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

const DEFAULT_USER = {
  name: 'Connected User',
  email: '',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
};

async function fetchGoogleUserProfile(accessToken) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.status}`);
  }

  return response.json();
}

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(() => {
    return sessionStorage.getItem('catalyst_google_token') || null;
  });

  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('catalyst_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleTokenReceived = useCallback(async (token) => {
    setAccessToken(token);
    sessionStorage.setItem('catalyst_google_token', token);

    try {
      const profile = await fetchGoogleUserProfile(token);
      const userProfile = {
        name: profile.name || profile.email?.split('@')[0] || DEFAULT_USER.name,
        email: profile.email || '',
        avatar: profile.picture || DEFAULT_USER.avatar,
      };
      setUser(userProfile);
      sessionStorage.setItem('catalyst_user', JSON.stringify(userProfile));
    } catch (err) {
      console.error('Failed to fetch Google profile:', err);
      setUser(DEFAULT_USER);
      sessionStorage.setItem('catalyst_user', JSON.stringify(DEFAULT_USER));
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        handleTokenReceived(token);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [handleTokenReceived]);

  const login = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin;
    const scopes = [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
      'https://www.googleapis.com/auth/classroom.announcements.readonly',
      'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
    ].join(' ');

    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&response_type=token' +
      `&scope=${encodeURIComponent(scopes)}` +
      '&prompt=select_account';

    window.location.href = authUrl;
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    sessionStorage.removeItem('catalyst_google_token');
    sessionStorage.removeItem('catalyst_user');
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isAuthenticated: !!accessToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
