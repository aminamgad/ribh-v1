'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface SystemSettings {
  _id: string;
  platformName: string;
  platformDescription: string;
  contactEmail: string;
  contactPhone: string;
  supportWhatsApp: string;
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawalFee: number;
  currency: string;
  autoApproveOrders: boolean;
  requireAdminApproval: boolean;
  maxOrderValue: number;
  minOrderValue: number;
  autoApproveProducts: boolean;
  requireProductImages: boolean;
  maxProductImages: number;
  maxProductDescription: number;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  pushNotifications: boolean;
  defaultShippingCost: number;
  freeShippingThreshold: number;
  shippingCompanies: string[];
  maxLoginAttempts: number;
  sessionTimeout: number;
  requireTwoFactor: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  termsOfService: string;
  privacyPolicy: string;
  refundPolicy: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
  commissionRates: Array<{
    minPrice: number;
    maxPrice: number;
    rate: number;
  }>;
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

export function SettingsProvider({ children }: { children: React.ReactNode }) {
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
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      
      // Set default settings if fetch fails
      setSettings({
        _id: 'default',
        platformName: 'ربح',
        platformDescription: 'منصة التجارة الإلكترونية الذكية',
        contactEmail: 'support@ribh.com',
        contactPhone: '+20 123 456 789',
        supportWhatsApp: '+20 123 456 789',
        minimumWithdrawal: 100,
        maximumWithdrawal: 10000,
        withdrawalFee: 2.5,
        currency: '₪',
        autoApproveOrders: false,
        requireAdminApproval: true,
        maxOrderValue: 50000,
        minOrderValue: 50,
        autoApproveProducts: false,
        requireProductImages: true,
        maxProductImages: 10,
        maxProductDescription: 1000,
        emailNotifications: true,
        whatsappNotifications: true,
        pushNotifications: true,
        defaultShippingCost: 25,
        freeShippingThreshold: 500,
        shippingCompanies: ['شركة الشحن السريع', 'شركة الشحن الموثوقة'],
        maxLoginAttempts: 5,
        sessionTimeout: 24,
        requireTwoFactor: false,
        maintenanceMode: false,
        maintenanceMessage: 'الموقع قيد الصيانة، يرجى المحاولة لاحقاً',
        facebookUrl: '',
        instagramUrl: '',
        twitterUrl: '',
        linkedinUrl: '',
        termsOfService: '',
        privacyPolicy: '',
        refundPolicy: '',
        googleAnalyticsId: '',
        facebookPixelId: '',
        commissionRates: [
          { minPrice: 0, maxPrice: 1000, rate: 10 },
          { minPrice: 1001, maxPrice: 5000, rate: 8 },
          { minPrice: 5001, maxPrice: 10000, rate: 6 },
          { minPrice: 10001, maxPrice: 999999, rate: 5 }
        ],
        updatedAt: new Date().toISOString()
      });
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
      console.error('Error updating settings:', err);
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