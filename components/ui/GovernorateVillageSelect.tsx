'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Loader2, ChevronDown, Search, X } from 'lucide-react';
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
  const [villageSearchQuery, setVillageSearchQuery] = useState<string>('');
  const [selectedVillageIndex, setSelectedVillageIndex] = useState<number>(-1);
  const [showVillageDropdown, setShowVillageDropdown] = useState(false);
  const [governorateSearchQuery, setGovernorateSearchQuery] = useState<string>('');
  const [selectedGovernorateIndex, setSelectedGovernorateIndex] = useState<number>(-1);
  const [showGovernorateDropdown, setShowGovernorateDropdown] = useState(false);

  // Normalize text for search (remove diacritics, normalize Arabic characters)
  const normalizeText = (text: string): string => {
    return text
      .replace(/[أإآ]/g, 'ا')
      .replace(/[ى]/g, 'ي')
      .replace(/[ة]/g, 'ه')
      .replace(/[ئ]/g, 'ي')
      .replace(/[ؤ]/g, 'و')
      .toLowerCase()
      .trim();
  };

  // Fetch shipping regions
  useEffect(() => {
    fetchShippingRegions();
  }, []);

  const fetchShippingRegions = async () => {
    try {
      // Add cache-busting with timestamp to ensure fresh data
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/settings/shipping?t=${timestamp}`, {
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.regions)) {
        setShippingRegions(data.regions);
      }
    } catch (error) {
      // Silently handle errors
      console.error('Error fetching shipping regions:', error);
    }
  };

  // Get active regions (priority: shippingRegions > governorates for backward compatibility)
  const baseActiveGovernorates = useMemo(() => {
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

  // Apply search filter to governorates
  const activeGovernorates = useMemo(() => {
    if (!governorateSearchQuery.trim()) {
      return baseActiveGovernorates;
    }

    const normalizedQuery = normalizeText(governorateSearchQuery.trim());
    
    return baseActiveGovernorates.filter((item: any) => {
      const name = normalizeText(item.name || '');
      return name.includes(normalizedQuery);
    }).sort((a: any, b: any) => {
      // Sort by relevance: exact matches first
      const aName = normalizeText(a.name || '');
      const bName = normalizeText(b.name || '');
      const aStartsWith = aName.startsWith(normalizedQuery);
      const bStartsWith = bName.startsWith(normalizedQuery);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return 0;
    });
  }, [baseActiveGovernorates, governorateSearchQuery]);

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
  const baseFilteredVillages = useMemo(() => {
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

  // Apply search filter to villages
  const filteredVillages = useMemo(() => {
    if (!villageSearchQuery.trim()) {
      return baseFilteredVillages;
    }

    const normalizedQuery = normalizeText(villageSearchQuery.trim());
    
    return baseFilteredVillages.filter((village) => {
      const villageName = village.villageName.split('-').slice(1).join('-').trim();
      const villageId = village.villageId?.toString() || '';
      const governorateName = village.villageName.split('-')[0]?.trim() || '';
      
      // Normalize village name
      const normalizedName = normalizeText(villageName);
      const normalizedGovernorate = normalizeText(governorateName);
      
      // Check multiple search criteria
      const nameMatch = normalizedName.includes(normalizedQuery);
      const idMatch = villageId.includes(normalizedQuery);
      const governorateMatch = normalizedGovernorate.includes(normalizedQuery);
      
      return nameMatch || idMatch || governorateMatch;
    }).sort((a, b) => {
      // Sort by relevance: exact matches first, then partial matches
      const aName = normalizeText(a.villageName.split('-').slice(1).join('-').trim());
      const bName = normalizeText(b.villageName.split('-').slice(1).join('-').trim());
      const aStartsWith = aName.startsWith(normalizedQuery);
      const bStartsWith = bName.startsWith(normalizedQuery);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Then sort by exact match position
      const aIndex = aName.indexOf(normalizedQuery);
      const bIndex = bName.indexOf(normalizedQuery);
      if (aIndex !== bIndex) return aIndex - bIndex;
      
      return 0;
    });
  }, [baseFilteredVillages, villageSearchQuery]);

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
    const village = filteredVillages.find((v) => v.villageId === villageId) || baseFilteredVillages.find((v) => v.villageId === villageId);
    if (village) {
      setSelectedVillageId(villageId);
      // Extract village name (part after "-")
      const villageName = village.villageName.split('-').slice(1).join('-').trim();
      const regionInfo = selectedRegionInfo;
      const regionName = regionInfo?.code || undefined;
      onVillageChange(village.villageId, villageName, village.deliveryCost, selectedGovernorate, regionName);
      // Set search query to show selected village name in input
      setVillageSearchQuery(village.villageName);
      setSelectedVillageIndex(-1);
      setShowVillageDropdown(false);
    }
  };

  // Reset village search when governorate changes
  useEffect(() => {
    setVillageSearchQuery('');
    setSelectedVillageIndex(-1);
    setShowGovernorateDropdown(false);
    setShowVillageDropdown(false);
  }, [selectedGovernorate]);

  // Close village dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (target && !(target as Element).closest('.village-search-container')) {
        setShowVillageDropdown(false);
      }
    };

    if (showVillageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showVillageDropdown]);

  // Close governorate dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (target && !(target as Element).closest('.governorate-search-container')) {
        setShowGovernorateDropdown(false);
      }
    };

    if (showGovernorateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showGovernorateDropdown]);


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
        // Set search query to show village name in input
        setVillageSearchQuery(village.villageName);
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

  // Don't return early - show search field even if no governorates

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Governorate Select */}
      <div className="space-y-2">
        {!loading && !error && (
          <div className="relative governorate-search-container">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
              <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              value={governorateSearchQuery || selectedGovernorate || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                setGovernorateSearchQuery(newValue);
                setSelectedGovernorateIndex(-1);
                // Clear selected governorate when user starts typing a different value
                if (newValue && selectedGovernorate && newValue !== selectedGovernorate) {
                  setSelectedGovernorate('');
                  if (onGovernorateChange) {
                    onGovernorateChange('', undefined);
                  }
                  onVillageChange(0, '', 0, '', undefined);
                }
                // Show dropdown when typing
                if (newValue && activeGovernorates.length > 0) {
                  setShowGovernorateDropdown(true);
                }
              }}
              onFocus={() => {
                if (!disabled && activeGovernorates.length > 0) {
                  // If there's a selected governorate, clear search query to show all options
                  if (selectedGovernorate && !governorateSearchQuery) {
                    setGovernorateSearchQuery('');
                  }
                  setShowGovernorateDropdown(true);
                }
              }}
              onClick={() => {
                if (!disabled && activeGovernorates.length > 0) {
                  // If there's a selected governorate, clear search query to show all options
                  if (selectedGovernorate && !governorateSearchQuery) {
                    setGovernorateSearchQuery('');
                  }
                  setShowGovernorateDropdown(true);
                }
              }}
              onKeyDown={(e) => {
                // Escape: Clear search and close dropdown
                if (e.key === 'Escape') {
                  if (governorateSearchQuery) {
                    setGovernorateSearchQuery('');
                    setSelectedGovernorateIndex(-1);
                  } else {
                    setShowGovernorateDropdown(false);
                  }
                  e.preventDefault();
                }
                // Enter: Select first result if only one, or selected one
                else if (e.key === 'Enter' && activeGovernorates.length > 0 && showGovernorateDropdown) {
                  e.preventDefault();
                  const indexToSelect = selectedGovernorateIndex >= 0 ? selectedGovernorateIndex : 0;
                  if (activeGovernorates[indexToSelect]) {
                    handleGovernorateChange(activeGovernorates[indexToSelect].name);
                    setGovernorateSearchQuery('');
                    setSelectedGovernorateIndex(-1);
                    setShowGovernorateDropdown(false);
                  }
                }
                // Arrow Down: Navigate down
                else if (e.key === 'ArrowDown' && activeGovernorates.length > 0) {
                  e.preventDefault();
                  setShowGovernorateDropdown(true);
                  setSelectedGovernorateIndex((prev) => 
                    prev < activeGovernorates.length - 1 ? prev + 1 : 0
                  );
                }
                // Arrow Up: Navigate up
                else if (e.key === 'ArrowUp' && activeGovernorates.length > 0) {
                  e.preventDefault();
                  setShowGovernorateDropdown(true);
                  setSelectedGovernorateIndex((prev) => 
                    prev > 0 ? prev - 1 : activeGovernorates.length - 1
                  );
                }
              }}
              placeholder={selectedGovernorate || "ابحث عن المنطقة أو اختر من القائمة..."}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF9800] focus:border-transparent transition-all"
              disabled={disabled}
              required={required}
              aria-label="بحث عن المنطقة"
            />
            {(governorateSearchQuery || selectedGovernorate) && (
              <button
                onClick={() => {
                  setGovernorateSearchQuery('');
                  setSelectedGovernorate('');
                  setSelectedGovernorateIndex(-1);
                  setShowGovernorateDropdown(false);
                  if (onGovernorateChange) {
                    onGovernorateChange('', undefined);
                  }
                  onVillageChange(0, '', 0, '', undefined);
                }}
                className="absolute inset-y-0 left-0 pl-3 flex items-center hover:bg-gray-100 dark:hover:bg-slate-600 rounded-l-lg transition-colors z-10"
                aria-label="مسح"
              >
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
            <ChevronDown className="absolute left-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            
            {/* Dropdown List */}
            {showGovernorateDropdown && activeGovernorates.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {activeGovernorates.map((item: any, index) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      handleGovernorateChange(item.name);
                      setGovernorateSearchQuery('');
                      setSelectedGovernorateIndex(-1);
                      setShowGovernorateDropdown(false);
                    }}
                    className={`w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                      selectedGovernorateIndex === index && governorateSearchQuery
                        ? 'bg-[#FF9800] text-white'
                        : selectedGovernorate === item.name
                        ? 'bg-blue-50 dark:bg-blue-900/20 font-medium'
                        : ''
                    }`}
                    onMouseEnter={() => setSelectedGovernorateIndex(index)}
                  >
                    <div className="text-sm text-gray-900 dark:text-slate-100">{item.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {governorateSearchQuery && activeGovernorates.length > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            🔍 عرض {activeGovernorates.length} من {baseActiveGovernorates.length} منطقة بناءً على البحث
          </p>
        )}
        {governorateSearchQuery && activeGovernorates.length === 0 && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            لا توجد نتائج للبحث
          </p>
        )}
        {baseActiveGovernorates.length === 0 && (
          <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-2">
            لا توجد محافظات مفعّلة. يرجى تفعيل المحافظات من إعدادات النظام.
          </div>
        )}
      </div>

      {/* Village Select - Hidden for marketers, only shown for admins */}
      {!hideVillageSelect && selectedGovernorate && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            القرية {required && <span className="text-red-500">*</span>}
          </label>
          
          {!loading && baseFilteredVillages.length > 0 && (
            <div className="relative village-search-container">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
                <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={villageSearchQuery || selectedVillageName || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setVillageSearchQuery(newValue);
                  setSelectedVillageIndex(-1);
                  // Clear selected village when user starts typing a different value
                  if (newValue && selectedVillageId) {
                    const currentVillageName = selectedVillageName || '';
                    if (newValue !== currentVillageName) {
                      setSelectedVillageId(null);
                      onVillageChange(0, '', 0, selectedGovernorate);
                    }
                  }
                  // Show dropdown when typing
                  if (newValue && filteredVillages.length > 0) {
                    setShowVillageDropdown(true);
                  }
                }}
                onFocus={() => {
                  if (!disabled && filteredVillages.length > 0) {
                    // If there's a selected village, clear search query to show all options
                    if (selectedVillageId && !villageSearchQuery) {
                      setVillageSearchQuery('');
                    }
                    setShowVillageDropdown(true);
                  }
                }}
                onClick={() => {
                  if (!disabled && filteredVillages.length > 0) {
                    // If there's a selected village, clear search query to show all options
                    if (selectedVillageId && !villageSearchQuery) {
                      setVillageSearchQuery('');
                    }
                    setShowVillageDropdown(true);
                  }
                }}
                onKeyDown={(e) => {
                  // Escape: Clear search and close dropdown
                  if (e.key === 'Escape') {
                    if (villageSearchQuery) {
                      setVillageSearchQuery('');
                      setSelectedVillageIndex(-1);
                    } else {
                      setShowVillageDropdown(false);
                    }
                    e.preventDefault();
                  }
                  // Enter: Select first result if only one, or selected one
                  else if (e.key === 'Enter' && filteredVillages.length > 0 && showVillageDropdown) {
                    e.preventDefault();
                    const indexToSelect = selectedVillageIndex >= 0 ? selectedVillageIndex : 0;
                    if (filteredVillages[indexToSelect]) {
                      handleVillageChange(filteredVillages[indexToSelect].villageId);
                      setShowVillageDropdown(false);
                    }
                  }
                  // Arrow Down: Navigate down
                  else if (e.key === 'ArrowDown' && filteredVillages.length > 0) {
                    e.preventDefault();
                    setShowVillageDropdown(true);
                    setSelectedVillageIndex((prev) => 
                      prev < filteredVillages.length - 1 ? prev + 1 : 0
                    );
                  }
                  // Arrow Up: Navigate up
                  else if (e.key === 'ArrowUp' && filteredVillages.length > 0) {
                    e.preventDefault();
                    setShowVillageDropdown(true);
                    setSelectedVillageIndex((prev) => 
                      prev > 0 ? prev - 1 : filteredVillages.length - 1
                    );
                  }
                }}
                placeholder={selectedVillageName || "ابحث عن القرية أو المحافظة أو ID..."}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF9800] focus:border-transparent transition-all"
                disabled={disabled || !selectedGovernorate}
                required={required}
                aria-label="بحث عن القرية"
              />
              {(villageSearchQuery || selectedVillageId) && (
                <button
                  onClick={() => {
                    setVillageSearchQuery('');
                    setSelectedVillageId(null);
                    setSelectedVillageIndex(-1);
                    setShowVillageDropdown(false);
                    onVillageChange(0, '', 0, selectedGovernorate);
                  }}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center hover:bg-gray-100 dark:hover:bg-slate-600 rounded-l-lg transition-colors z-10"
                  aria-label="مسح"
                >
                  <X className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              )}
              <MapPin className="absolute left-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              
              {/* Dropdown List */}
              {showVillageDropdown && filteredVillages.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredVillages.map((village, index) => {
                    const villageName = village.villageName.split('-').slice(1).join('-').trim();
                    return (
                      <button
                        key={village.villageId}
                        type="button"
                        onClick={() => {
                          handleVillageChange(village.villageId);
                          setShowVillageDropdown(false);
                        }}
                        className={`w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                          selectedVillageIndex === index && villageSearchQuery
                            ? 'bg-[#FF9800] text-white'
                            : selectedVillageId === village.villageId
                            ? 'bg-blue-50 dark:bg-blue-900/20 font-medium'
                            : ''
                        }`}
                        onMouseEnter={() => setSelectedVillageIndex(index)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-900 dark:text-slate-100">
                            {villageName}
                          </span>
                          {village.deliveryCost > 0 && (
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              {village.deliveryCost}₪
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {loading && (
            <div className="relative">
              <input
                type="text"
                placeholder="جاري تحميل القرى..."
                disabled
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-wait"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <div className="loading-spinner w-4 h-4"></div>
              </div>
            </div>
          )}
          {filteredVillages.length === 0 && selectedGovernorate && (
            <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="font-medium mb-1">
                {villageSearchQuery ? (
                  <>
                    لا توجد نتائج للبحث "<strong>{villageSearchQuery}</strong>". 
                    <button
                      onClick={() => {
                        setVillageSearchQuery('');
                        setSelectedVillageIndex(-1);
                      }}
                      className="text-[#FF9800] hover:text-[#F57C00] dark:text-[#FF9800] dark:hover:text-[#F57C00] font-medium mr-1"
                    >
                      امسح البحث
                    </button>
                    لعرض جميع القرى.
                  </>
                ) : baseFilteredVillages.length === 0 ? (
                  'لا توجد قرى متاحة لهذه المنطقة'
                ) : (
                  'لا توجد قرى متاحة لهذه المنطقة'
                )}
              </p>
              {!villageSearchQuery && selectedRegionInfo?.region?.villageIds && selectedRegionInfo.region.villageIds.length > 0 ? (
                <p className="text-xs">
                  المنطقة محددة بقرى معينة، لكن هذه القرى غير موجودة في قاعدة البيانات. يرجى التحقق من إعدادات المنطقة.
                </p>
              ) : !villageSearchQuery ? (
                <p className="text-xs">
                  يرجى إضافة القرى إلى هذه المنطقة من إعدادات النظام، أو اختيار منطقة أخرى.
                </p>
              ) : null}
            </div>
          )}
          {villageSearchQuery && filteredVillages.length > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              🔍 عرض {filteredVillages.length} من {baseFilteredVillages.length} قرية بناءً على البحث
            </p>
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

