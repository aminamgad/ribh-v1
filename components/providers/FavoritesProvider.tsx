'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Product } from '@/types';
import { useAuth } from './AuthProvider';
import toast from 'react-hot-toast';

interface FavoritesContextType {
  favorites: Product[];
  loading: boolean;
  addToFavorites: (product: Product) => Promise<void>;
  removeFromFavorites: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  fetchFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites);
      }
    } catch (error) {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addToFavorites = async (product: Product) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: product._id }),
      });

      if (response.ok) {
        setFavorites(prev => [...prev, product]);
        toast.success('تم إضافة المنتج إلى المفضلة');
      } else {
        toast.error('فشل في إضافة المنتج إلى المفضلة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة المنتج إلى المفضلة');
    }
  };

  const removeFromFavorites = async (productId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/favorites/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(p => p._id !== productId));
        toast.success('تم إزالة المنتج من المفضلة');
      } else {
        toast.error('فشل في إزالة المنتج من المفضلة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إزالة المنتج من المفضلة');
    }
  };

  const isFavorite = (productId: string): boolean => {
    return favorites.some(p => p._id === productId);
  };

  const value = {
    favorites,
    loading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    fetchFavorites
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
} 