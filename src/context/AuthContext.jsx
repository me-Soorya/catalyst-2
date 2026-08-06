import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

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

  // Sync token to sessionStorage and fetch profile when needed
  useEffect(() => {
    if (accessToken) {
      sessionStorage.setItem('catalyst_google_token', accessToken);

      if (!user) {
        fetchGoogleUserProfile(accessToken)
          .then((profile) => {
            const userProfile = {
              name: profile.name || profile.email?.split('@')[0] || DEFAULT_USER.name,
              email: profile.email || '',
              avatar: profile.picture || DEFAULT_USER.avatar,
            };
            setUser(userProfile);
            sessionStorage.setItem('catalyst_user', JSON.stringify(userProfile));
          })
          .catch((err) => {
            console.error('Failed to fetch Google profile:', err);
            setUser(DEFAULT_USER);
            sessionStorage.setItem('catalyst_user', JSON.stringify(DEFAULT_USER));
          });
      }
    } else {
      sessionStorage.removeItem('catalyst_google_token');
      sessionStorage.removeItem('catalyst_user');
    }
  }, [accessToken, user]);

  const handleGoogleSuccess = async (tokenResponse) => {
    setAccessToken(tokenResponse.access_token);

    try {
      const profile = await fetchGoogleUserProfile(tokenResponse.access_token);
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
  };

  // Google OAuth Login Hook requesting calendar scope
  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: (error) => {
      console.error('Google Auth Failed:', error);
    },
    scope: 'openid profile email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/classroom.announcements.readonly https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
  });

  const logout = () => {
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isAuthenticated: !!accessToken,
        login: googleLogin,
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
