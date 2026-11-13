import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, SellerProfile } from '../types.js';
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  setAuthToken,
  getAuthToken,
  toggleProductFavourite
} from '../services/api.js';
import {
  getCachedSessionInfo,
  getUserSessionFromFirestore,
  signOutFromFirebase,
  subscribeToFirebaseAuthChanges,
  toggleFavouriteInFirestore
} from '../services/firebase.js';

interface AuthContextType {
  user: User | null;
  sellerProfile: SellerProfile | null;
  favourites: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  register: (data: any) => Promise<User>;
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

  const loadUser = useCallback(async () => {
    const token = getAuthToken();
    const cached = getCachedSessionInfo();
    if (!token && !cached.uid) {
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
      if (cached.user) {
        setUser(cached.user);
        setSellerProfile(cached.sellerProfile || null);
      } else {
        setAuthToken(null);
        setUser(null);
        setSellerProfile(null);
        setFavourites([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();

    const unsubscribe = subscribeToFirebaseAuthChanges(async (fbUser) => {
      if (fbUser) {
        const session = await getUserSessionFromFirestore(fbUser.uid);
        if (session) {
          setAuthToken(`firebase-session:${session.user.id}`);
          setUser(session.user);
          setSellerProfile(session.sellerProfile || null);
          setFavourites(session.favourites || []);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [loadUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await loginUser(email, password);
    setUser(data.user);
    setSellerProfile(data.sellerProfile || null);
    await loadUser();
    return data.user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    const { signInWithGoogle } = await import('../services/firebase.js');
    const { user: appUser, sellerProfile: sp } = await signInWithGoogle();
    setAuthToken(`firebase-session:${appUser.id}`);
    setUser(appUser);
    setSellerProfile(sp || null);
    return appUser;
  };

  const register = async (data: any): Promise<User> => {
    const res = await registerUser(data);
    setAuthToken(res.token);
    setUser(res.user);
    setSellerProfile(res.sellerProfile || null);
    setFavourites([]);
    setLoading(false);
    return res.user;
  };

  const logout = () => {
    setAuthToken(null);
    signOutFromFirebase();
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
      const res = user.id
        ? await toggleFavouriteInFirestore(user.id, productId)
        : await toggleProductFavourite(productId);
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
        loginWithGoogle,
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
