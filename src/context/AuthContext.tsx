import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, SellerProfile } from '../types.js';
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  setAuthToken,
  getAuthToken,
  toggleProductFavourite
} from '../services/api.js';

interface AuthContextType {
  user: User | null;
  sellerProfile: SellerProfile | null;
  favourites: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  toggleFavourite: (productId: string) => Promise<boolean>;
  isFavourite: (productId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setSellerProfile(null);
      setFavourites([]);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchCurrentUser();
      setUser(data.user);
      setSellerProfile(data.sellerProfile || null);
      setFavourites(data.favourites || []);
    } catch {
      setAuthToken(null);
      setUser(null);
      setSellerProfile(null);
      setFavourites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginUser(email, password);
    setUser(data.user);
    setSellerProfile(data.sellerProfile || null);
    await loadUser();
  };

  const register = async (data: any) => {
    const res = await registerUser(data);
    setUser(res.user);
    setSellerProfile(res.sellerProfile || null);
    await loadUser();
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setSellerProfile(null);
    setFavourites([]);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const toggleFavourite = async (productId: string): Promise<boolean> => {
    if (!user) {
      // Local fallback for guests
      setFavourites(prev => {
        if (prev.includes(productId)) {
          return prev.filter(id => id !== productId);
        } else {
          return [...prev, productId];
        }
      });
      return !favourites.includes(productId);
    }

    try {
      const res = await toggleProductFavourite(productId);
      if (res.favourited) {
        setFavourites(prev => [...prev.filter(id => id !== productId), productId]);
      } else {
        setFavourites(prev => prev.filter(id => id !== productId));
      }
      return res.favourited;
    } catch {
      return false;
    }
  };

  const isFavourite = (productId: string) => {
    return favourites.includes(productId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sellerProfile,
        favourites,
        loading,
        login,
        register,
        logout,
        refreshUser,
        toggleFavourite,
        isFavourite
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
