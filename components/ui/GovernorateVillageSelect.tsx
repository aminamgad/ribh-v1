'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, Loader2, ChevronDown } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

interface Village {
  _id: string;
  villageId: number;
  villageName: string;
  deliveryCost: number;
  areaId: number;
  isActive: boolean;
}

interface GovernorateVillageSelectProps {
  governorate?: string;
  villageId?: number | string;
  onGovernorateChange?: (governorate: string, regionName?: string) => void;
  onVillageChange: (villageId: number, villageName: string, deliveryCost: number, governorate: string, regionName?: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  hideVillageSelect?: boolean; // Hide village selection (for marketers, only show regions)
}

export default function GovernorateVillageSelect({
  governorate: initialGovernorate,
  villageId: initialVillageId,
  onGovernorateChange,
  onVillageChange,
  className = '',
  disabled = false,
  required = false,
  label = 'المحافظة والقرية',
  hideVillageSelect = false, // Default: show village select
}: GovernorateVillageSelectProps) {
  const { settings } = useSettings();
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>(initialGovernorate || '');
  const [selectedVillageId, setSelectedVillageId] = useState<number | null>(
    initialVillageId ? Number(initialVillageId) : null
  );
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shippingRegions, setShippingRegions] = useState<any[]>([]);

  // Fetch shipping regions
  useEffect(() => {
    fetchShippingRegions();
  }, []);

  const fetchShippingRegions = async () => {
    try {
      // Add cache-busting to ensure fresh data
      const response = await fetch('/api/settings/shipping', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.regions)) {
        setShippingRegions(data.regions);
      }
    } catch (error) {
      // Silently handle errors
    }
  };

  // Get active regions (priority: shippingRegions > governorates for backward compatibility)
  const activeGovernorates = useMemo(() => {
    // Priority 1: Use shipping regions (new system)
    if (shippingRegions.length > 0) {
      return shippingRegions
        .map((region: any) => ({
          name: region.regionName || region.governorateName,
          code: region.regionName,
          region: region
        }))
        .filter((item: any) => item.name)
        .sort((a: any, b: any) => a.name.localeCompare(b.name, 'ar'));
    }
    
    // Priority 2: Fallback to old governorates (for backward compatibility)
    if (settings?.governorates) {
      return settings.governorates
        .filter((gov: any) => gov.isActive !== false)
        .map((gov: any) => ({
          name: gov.name,
          code: null,
          region: null
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name, 'ar'));
    }
    
    return [];
  }, [shippingRegions, settings?.governorates]);

  // Fetch all villages
  useEffect(() => {
    fetchAllVillages();
  }, []);

  const fetchAllVillages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/villages?limit=1000');
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setVillages(data.data);
        setError(null);
      } else {
        setError(data.message || 'فشل في جلب القرى');
      }
    } catch (error) {
      setError('حدث خطأ أثناء جلب القرى');
    } finally {
      setLoading(false);
    }
  };

  // Get selected region info
  const selectedRegionInfo = useMemo(() => {
    if (!selectedGovernorate) return null;
    return activeGovernorates.find((item: any) => item.name === selectedGovernorate);
  }, [selectedGovernorate, activeGovernorates]);

  // Filter villages by selected region/governorate
  const filteredVillages = useMemo(() => {
    if (!selectedGovernorate) return [];
    
    const regionInfo = selectedRegionInfo;
    
    // Priority 1: If using shipping regions with villageIds, filter by villageIds
    if (regionInfo?.region?.villageIds && Array.isArray(regionInfo.region.villageIds) && regionInfo.region.villageIds.length > 0) {
      const filtered = villages
        .filter((village) => regionInfo.region.villageIds.includes(village.villageId))
        .sort((a, b) => {
          const aName = a.villageName.split('-').slice(1).join('-').trim();
          const bName = b.villageName.split('-').slice(1).join('-').trim();
          return aName.localeCompare(bName, 'ar');
        });
      
      // If filtering by villageIds returns results, return them
      if (filtered.length > 0) {
        return filtered;
      }
      // If no results but villageIds exist, it means those villages don't exist in DB
      // Fall through to show all villages or use fallback method
    }
    
    // Priority 2: If region has governorateName, try to match by governorate name
    if (regionInfo?.region?.governorateName) {
      const filtered = villages
        .filter((village) => {
          const parts = village.villageName.split('-');
          if (parts.length < 2) return false;
          const villageGovernorate = parts[0].trim();
          return villageGovernorate === regionInfo.region.governorateName;
        })
        .sort((a, b) => {
          const aName = a.villageName.split('-').slice(1).join('-').trim();
          const bName = b.villageName.split('-').slice(1).join('-').trim();
          return aName.localeCompare(bName, 'ar');
        });
      
      if (filtered.length > 0) {
        return filtered;
      }
    }
    
    // Priority 3: Try to match by region name (selectedGovernorate)
    const filtered = villages
      .filter((village) => {
        const parts = village.villageName.split('-');
        if (parts.length < 2) return false;
        const villageGovernorate = parts[0].trim();
        return villageGovernorate === selectedGovernorate;
      })
      .sort((a, b) => {
        const aName = a.villageName.split('-').slice(1).join('-').trim();
        const bName = b.villageName.split('-').slice(1).join('-').trim();
        return aName.localeCompare(bName, 'ar');
      });
    
    // Priority 4: If it's a shipping region without villageIds, show all active villages
    // (region is general and includes all villages)
    if (regionInfo?.region && (!regionInfo.region.villageIds || regionInfo.region.villageIds.length === 0)) {
      return villages
        .filter((v) => v.isActive !== false)
        .sort((a, b) => {
          const aName = a.villageName.split('-').slice(1).join('-').trim();
          const bName = b.villageName.split('-').slice(1).join('-').trim();
          return aName.localeCompare(bName, 'ar');
        });
    }
    
    return filtered;
  }, [villages, selectedGovernorate, selectedRegionInfo]);

  // Handle governorate selection
  const handleGovernorateChange = (gov: string) => {
    setSelectedGovernorate(gov);
    setSelectedVillageId(null);
    const regionInfo = activeGovernorates.find((item: any) => item.name === gov);
    const regionName = regionInfo?.code || undefined;
    if (onGovernorateChange) {
      onGovernorateChange(gov, regionName);
    }
    // Reset village selection
    onVillageChange(0, '', 0, gov, regionName);
  };

  // Handle village selection
  const handleVillageChange = (villageId: number) => {
    const village = filteredVillages.find((v) => v.villageId === villageId);
    if (village) {
      setSelectedVillageId(villageId);
      // Extract village name (part after "-")
      const villageName = village.villageName.split('-').slice(1).join('-').trim();
      const regionInfo = selectedRegionInfo;
      const regionName = regionInfo?.code || undefined;
      onVillageChange(village.villageId, villageName, village.deliveryCost, selectedGovernorate, regionName);
    }
  };

  // Initialize from props
  useEffect(() => {
    if (initialGovernorate && !selectedGovernorate) {
      setSelectedGovernorate(initialGovernorate);
    }
  }, [initialGovernorate, selectedGovernorate]);

  // Initialize village from props (separate effect to avoid dependency issues)
  useEffect(() => {
    if (initialVillageId && !selectedVillageId && villages.length > 0 && initialGovernorate) {
      const village = villages.find((v) => v.villageId === Number(initialVillageId));
      if (village) {
        setSelectedVillageId(Number(initialVillageId));
        const villageName = village.villageName.split('-').slice(1).join('-').trim();
        // Only call onVillageChange if village is found and matches initial data
        if (village.villageId === Number(initialVillageId)) {
          onVillageChange(village.villageId, villageName, village.deliveryCost, initialGovernorate);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVillageId, initialGovernorate, villages, selectedVillageId]);

  // Get selected village name for display
  const selectedVillageName = useMemo(() => {
    if (!selectedVillageId) return '';
    const village = filteredVillages.find((v) => v.villageId === selectedVillageId);
    if (!village) return '';
    return village.villageName.split('-').slice(1).join('-').trim();
  }, [selectedVillageId, filteredVillages]);

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (activeGovernorates.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
          لا توجد محافظات مفعّلة. يرجى تفعيل المحافظات من إعدادات النظام.
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Governorate Select */}
      <div className="space-y-2">
        <div className="relative">
          <select
            value={selectedGovernorate}
            onChange={(e) => handleGovernorateChange(e.target.value)}
            disabled={disabled}
            required={required}
            className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF9800] focus:border-[#FF9800] disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
          >
            <option value="">اختيار المنطقة</option>
            {activeGovernorates.map((item: any) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Village Select - Hidden for marketers, only shown for admins */}
      {!hideVillageSelect && selectedGovernorate && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            القرية {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            {loading ? (
              // Show loader while villages are loading
              <>
                <select
                  disabled
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-wait appearance-none"
                >
                  <option value="">جاري تحميل القرى...</option>
                </select>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <div className="loading-spinner w-4 h-4"></div>
                </div>
              </>
            ) : (
              <>
                <select
                  value={selectedVillageId || ''}
                  onChange={(e) => handleVillageChange(Number(e.target.value))}
                  disabled={disabled || !selectedGovernorate || filteredVillages.length === 0}
                  required={required}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF9800] focus:border-[#FF9800] disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                >
                  <option value="">اختر القرية</option>
                  {filteredVillages.map((village) => {
                    const villageName = village.villageName.split('-').slice(1).join('-').trim();
                    return (
                      <option key={village.villageId} value={village.villageId}>
                        {villageName} {village.deliveryCost > 0 && `(${village.deliveryCost}₪)`}
                      </option>
                    );
                  })}
                </select>
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </>
            )}
          </div>
          {filteredVillages.length === 0 && selectedGovernorate && (
            <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="font-medium mb-1">لا توجد قرى متاحة لهذه المنطقة</p>
              {selectedRegionInfo?.region?.villageIds && selectedRegionInfo.region.villageIds.length > 0 ? (
                <p className="text-xs">
                  المنطقة محددة بقرى معينة، لكن هذه القرى غير موجودة في قاعدة البيانات. يرجى التحقق من إعدادات المنطقة.
                </p>
              ) : (
                <p className="text-xs">
                  يرجى إضافة القرى إلى هذه المنطقة من إعدادات النظام، أو اختيار منطقة أخرى.
                </p>
              )}
            </div>
          )}
        </div>
      )}


      {!selectedGovernorate && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          يرجى اختيار المنطقة أولاً
        </p>
      )}
    </div>
  );
}

