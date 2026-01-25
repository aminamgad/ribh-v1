'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SystemSettings {
  _id: string;
  platformName: string;
  platformDescription: string;
  contactEmail: string;
  contactPhone: string;
  supportWhatsApp: string;
  // Financial settings
  withdrawalSettings: {
    minimumWithdrawal: number;
    maximumWithdrawal: number;
    withdrawalFees: number;
  };
  commissionRates: Array<{
    minPrice: number;
    maxPrice: number;
    rate: number;
  }>;
  // Order settings
  minimumOrderValue: number;
  maximumOrderValue: number;
  minOrderValue: number;
  maxOrderValue: number;
  // Product settings
  autoApproveProducts: boolean;
  requireProductImages: boolean;
  maxProductImages: number;
  maxProductDescription: number;
  maxProductDescriptionLength: number;
  // Notification settings
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  pushNotifications: boolean;
  // Shipping settings
  shippingEnabled: boolean;
  defaultShippingCost: number;
  defaultFreeShippingThreshold: number;
  governorates: Array<{
    name: string;
    cities: string[];
    shippingCost: number;
    isActive: boolean;
  }>;
  // Legacy shipping fields
  freeShippingThreshold: number;
  shippingCompanies: string[];
  // Security settings
  maxLoginAttempts: number;
  sessionTimeout: number;
  requireTwoFactor: boolean;
  // System settings
  maintenanceMode: boolean;
  maintenanceMessage: string;
  autoApproveOrders: boolean;
  requireAdminApproval: boolean;
  // Social media
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  // Legal
  termsOfService: string;
  privacyPolicy: string;
  refundPolicy: string;
  // Analytics
  googleAnalyticsId: string;
  facebookPixelId: string;
  // Legacy fields
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawalFee: number;
  currency: string;
  updatedAt: string;
}

interface SettingsContextType {
  settings: SystemSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use public settings API for all users
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        throw new Error('فشل في جلب إعدادات النظام');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      setError(null);
      
      // Use admin settings API for updates
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        return data.settings;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في تحديث الإعدادات');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      throw err;
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Refresh settings every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSettings();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const value: SettingsContextType = {
    settings,
    loading,
    error,
    refreshSettings,
    updateSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 