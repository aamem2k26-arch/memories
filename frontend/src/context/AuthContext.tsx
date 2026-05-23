import { message } from 'antd';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  name?: string;
  email: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setUser({ email: payload.email, name: payload.name });
        } else {
          localStorage.removeItem('token');
        }
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  // Monitor token expiration
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const timeToExpiry = payload.exp * 1000 - Date.now();

        if (timeToExpiry <= 0) {
          handleSessionExpired();
        } else {
          const timeout = setTimeout(() => {
            handleSessionExpired();
          }, timeToExpiry);
          return () => clearTimeout(timeout);
        }
      } catch (e) {
        handleSessionExpired();
      }
    }
  }, [token]);

  const handleSessionExpired = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    message.error('Session expired, please login again');
  };

  const login = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      setUser({ email: payload.email, name: payload.name });
    } catch (e) {}
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};