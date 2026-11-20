import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { User, SellerProfile, AppNotification } from '../types.js';
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  setAuthToken,
  getAuthToken,
  toggleProductFavourite
} from '../services/api.js';
import {
  auth,
  getCachedSessionInfo,
  getUserSessionFromFirestore,
  signOutFromFirebase,
  subscribeToFirebaseAuthChanges,
  toggleFavouriteInFirestore
} from '../services/firebase.js';
import { subscribeToUserNotifications } from '../services/notifications.js';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  sellerProfile: SellerProfile | null;
  favourites: string[];
  notifications: AppNotification[];
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadUser = useCallback(async () => {
    const token = getAuthToken();
    const cached = getCachedSessionInfo();
    const activeFbUser = auth.currentUser;

    if (!token && !cached.uid && (!activeFbUser || activeFbUser.isAnonymous)) {
      setUser(null);
      setSellerProfile(null);
      setFavourites([]);
      setLoading(false);
      return;
    }

    if (activeFbUser && !activeFbUser.isAnonymous && cached.uid && cached.uid !== activeFbUser.uid) {
      try {
        const canonical = await getUserSessionFromFirestore(activeFbUser.uid);
        if (canonical) {
          setAuthToken(`firebase-session:${canonical.user.id}`);
          setUser(canonical.user);
          setSellerProfile(canonical.sellerProfile || null);
          setFavourites(canonical.favourites || []);
          setLoading(false);
          return;
        }
      } catch {}
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
      setFirebaseUser(fbUser);
      if (fbUser && !fbUser.isAnonymous) {
        try {
          const session = await getUserSessionFromFirestore(fbUser.uid);
          if (session) {
            setAuthToken(`firebase-session:${session.user.id}`);
            setUser(session.user);
            setSellerProfile(session.sellerProfile || null);
            setFavourites(session.favourites || []);
          }
        } catch (err) {
          console.warn('[AuthContext non-blocking auth sync]:', err);
        } finally {
          setLoading(false);
        }
      } else if (!fbUser) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadUser]);

  useEffect(() => {
    if (!firebaseUser?.uid || firebaseUser.isAnonymous) {
      setNotifications([]);
      return;
    }
    const unsub = subscribeToUserNotifications(firebaseUser.uid, setNotifications);
    return () => unsub();
  }, [firebaseUser?.uid, firebaseUser?.isAnonymous]);

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
    try {
      localStorage.removeItem('fuwukari_student_session');
      localStorage.removeItem('fu_market_guest_mode');
      localStorage.removeItem('fu_market_guest_id');
    } catch {}
    setUser(null);
    setFirebaseUser(null);
    setSellerProfile(null);
    setFavourites([]);
    setNotifications([]);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const toggleFavourite = async (productId: string): Promise<boolean> => {
    if (!user) {
      setFavourites((prev) => {
        if (prev.includes(productId)) {
          return prev.filter((id) => id !== productId);
        }
        return [...prev, productId];
      });
      return !favourites.includes(productId);
    }

    try {
      const res = user.id
        ? await toggleFavouriteInFirestore(user.id, productId)
        : await toggleProductFavourite(productId);
      if (res.favourited) {
        setFavourites((prev) => [...prev.filter((id) => id !== productId), productId]);
      } else {
        setFavourites((prev) => prev.filter((id) => id !== productId));
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
        firebaseUser,
        sellerProfile,
        favourites,
        notifications,
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
