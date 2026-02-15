'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';
import ErrorMessage from './ErrorMessage';

interface Village {
  _id: string;
  villageId: number;
  villageName: string;
  deliveryCost: number;
  areaId: number;
  isActive: boolean;
}

interface VillageSelectProps {
  value?: number | string;
  onChange: (villageId: number, villageName: string, deliveryCost: number) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function VillageSelect({
  value,
  onChange,
  className = '',
  disabled = false,
  required = false,
}: VillageSelectProps) {
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedVillage, setSelectedVillage] = useState<number | null>(
    value ? Number(value) : null
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllVillages();
  }, []);

  const fetchAllVillages = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all villages (limit 1000 should be enough for now)
      const response = await fetch('/api/villages?limit=1000');
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        if (data.data.length === 0) {
          setError('لا توجد قرى متاحة. يرجى تشغيل: node scripts/import-villages.js');
        } else {
          // Sort villages by name for easier navigation
          const sortedVillages = data.data.sort((a: Village, b: Village) =>
            a.villageName.localeCompare(b.villageName, 'ar')
          );
          setVillages(sortedVillages);
          setError(null);
        }
      } else {
        setError(data.message || 'فشل في جلب القرى');
      }
    } catch (error) {
      setError('حدث خطأ أثناء جلب القرى');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort villages based on search
  const filteredVillages = useMemo(() => {
    if (!search.trim()) {
      // Return all villages when search is empty
      return villages;
    }
    
    const searchLower = search.toLowerCase();
    return villages.filter((village) =>
      village.villageName.toLowerCase().includes(searchLower)
    );
  }, [villages, search]);

  // Sync search with selected village when village is selected (not when user types)
  useEffect(() => {
    if (selectedVillage && villages.length > 0 && !isSearching) {
      const village = villages.find((v) => v.villageId === selectedVillage);
      if (village) {
        onChange(village.villageId, village.villageName, village.deliveryCost);
        setSearch(village.villageName);
        setShowDropdown(false);
      }
    }
  }, [selectedVillage, villages, onChange, isSearching]);

  // Show dropdown when user focuses or types (but not when a village is selected and displayed)
  useEffect(() => {
    if (isSearching || !selectedVillage) {
      if (!loading && filteredVillages.length > 0) {
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } else if (!loading && search.trim() === '' && villages.length > 0) {
        setShowDropdown(true);
        setHighlightedIndex(-1);
      }
    }
  }, [search, filteredVillages.length, loading, villages.length, isSearching, selectedVillage]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedVillageData = villages.find((v) => v.villageId === selectedVillage);

  const handleVillageSelect = (village: Village) => {
    // مسح القديم واستبداله فوراً بالقيمة الجديدة
    setSelectedVillage(village.villageId);
    setSearch(village.villageName);
    setIsSearching(false);
    setShowDropdown(false);
    searchInputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredVillages.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredVillages.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredVillages.length) {
          handleVillageSelect(filteredVillages[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        searchInputRef.current?.blur();
        break;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Village Selection */}
      <div ref={containerRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          القرية {required && <span className="text-red-500">*</span>}
        </label>

        {/* Search Input */}
        <div className="relative">
          {loading ? (
            <>
              <input
                type="text"
                placeholder="جاري تحميل القرى..."
                disabled
                className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/80 text-gray-500 dark:text-slate-400 cursor-wait min-h-[44px]"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
                <div className="loading-spinner w-5 h-5"></div>
              </div>
            </>
          ) : (
            <>
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ابحث عن القرية أو المحافظة أو ID..."
                value={search}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearch(newValue);
                  setIsSearching(true);
                  // Clear selected village when user starts typing a different value
                  if (newValue && selectedVillage) {
                    const currentVillage = villages.find((v) => v.villageId === selectedVillage);
                    if (currentVillage && newValue !== currentVillage.villageName) {
                      setSelectedVillage(null);
                    }
                  }
                }}
                onFocus={() => {
                  if (!loading && villages.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                onClick={() => {
                  if (!loading && villages.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                onBlur={() => {
                  // Reset searching flag after a short delay to allow click events
                  setTimeout(() => setIsSearching(false), 200);
                }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF9800] focus:border-transparent transition-all min-h-[44px]"
              />
            </>
          )}
          
          {/* Dropdown List */}
          {showDropdown && !loading && filteredVillages.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-[60] w-full mt-1 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl shadow-xl ring-2 ring-[#FF9800]/20 max-h-60 overflow-y-auto"
            >
              {filteredVillages.map((village, index) => (
                <button
                  key={village._id}
                  type="button"
                  onClick={() => handleVillageSelect(village)}
                  className={`w-full text-right px-4 py-3 min-h-[44px] hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                    highlightedIndex === index
                      ? 'bg-[#FF9800] text-white hover:bg-[#F57C00]'
                      : ''
                  } ${
                    selectedVillage === village.villageId && highlightedIndex !== index
                      ? 'bg-slate-100 dark:bg-slate-700/50 font-medium'
                      : ''
                  }`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {village.villageName}
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {village.deliveryCost} ₪
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-2">
            <ErrorMessage message={error} onRetry={fetchAllVillages} />
          </div>
        ) : (
          villages.length > 0 && !loading && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {search ? (
                <>
                  {filteredVillages.length} نتيجة {filteredVillages.length !== villages.length && `(من ${villages.length} قرية)`}
                </>
              ) : (
                <>
                  {villages.length} قرية متاحة - ابدأ بالكتابة للبحث
                </>
              )}
            </p>
          )
        )}
        
        {/* Hidden select for form validation */}
        <select
          value={selectedVillage || ''}
          onChange={() => {}}
          disabled={disabled || loading}
          required={required}
          className="hidden"
          tabIndex={-1}
        >
          <option value=""></option>
          {villages.map((village) => (
            <option key={village._id} value={village.villageId}>
              {village.villageName}
            </option>
          ))}
        </select>
      </div>

      {selectedVillageData && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm mb-1">
            <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="text-gray-700 dark:text-gray-300">
              <strong>القرية المختارة:</strong> {selectedVillageData.villageName}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>تكلفة التوصيل:</strong> {selectedVillageData.deliveryCost} ₪
          </div>
        </div>
      )}
    </div>
  );
}
