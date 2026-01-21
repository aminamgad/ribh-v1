'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Package, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDataCache } from '@/components/hooks/useDataCache';

interface Village {
  _id: string;
  villageId: number;
  villageName: string;
  deliveryCost: number;
  areaId: number;
  isActive: boolean;
}

interface Area {
  areaId: number;
  totalVillages: number;
  minDeliveryCost: number;
  maxDeliveryCost: number;
}

export default function VillagesPage() {
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [filteredVillages, setFilteredVillages] = useState<Village[]>([]);

  // Use cache hook for villages
  const { data: villagesData, loading: villagesLoading, refresh: refreshVillages } = useDataCache<{
    success: boolean;
    data: Village[];
  }>({
    key: 'villages',
    fetchFn: async () => {
      const response = await fetch('/api/villages?limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch villages');
      }
      return response.json();
    },
    enabled: true,
    forceRefresh: false,
    onError: () => {
      toast.error('فشل في جلب القرى');
    }
  });

  // Use cache hook for areas
  const { data: areasData, loading: areasLoading, refresh: refreshAreas } = useDataCache<{
    success: boolean;
    data: Area[];
  }>({
    key: 'areas',
    fetchFn: async () => {
      const response = await fetch('/api/areas');
      if (!response.ok) {
        throw new Error('Failed to fetch areas');
      }
      return response.json();
    },
    enabled: true,
    forceRefresh: false
  });

  const villages = villagesData?.data || [];
  const areas = areasData?.data || [];
  const loading = villagesLoading || areasLoading;

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refreshVillages();
      refreshAreas();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-villages', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-villages', handleRefresh);
    };
  }, [refreshVillages, refreshAreas]);

  useEffect(() => {
    let filtered = villages;

    if (search) {
      filtered = filtered.filter((v) =>
        v.villageName.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (selectedArea !== null) {
      filtered = filtered.filter((v) => v.areaId === selectedArea);
    }

    setFilteredVillages(filtered);
  }, [villages, search, selectedArea]);

  // Keep functions for backward compatibility
  const fetchVillages = async () => {
    refreshVillages();
  };

  const fetchAreas = async () => {
    refreshAreas();
  };

  const uniqueAreas = Array.from(new Set(villages.map((v) => v.areaId))).sort();

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          إدارة القرى والمناطق
        </h1>
        <button
          onClick={fetchVillages}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
        >
          <RotateCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">إجمالي القرى</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {villages.length}
              </p>
            </div>
            <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">عدد المناطق</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {uniqueAreas.length}
              </p>
            </div>
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">القرى النشطة</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {villages.filter((v) => v.isActive).length}
              </p>
            </div>
            <RotateCw className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="بحث عن قرية..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 sm:pr-10 pl-3 sm:pl-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white min-h-[44px]"
            />
          </div>

          <select
            value={selectedArea || ''}
            onChange={(e) => setSelectedArea(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white min-h-[44px]"
          >
            <option value="">جميع المناطق</option>
            {uniqueAreas.map((areaId) => (
              <option key={areaId} value={areaId}>
                المنطقة {areaId}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Villages Table - Mobile Card View */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-3 sm:p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              جاري التحميل...
            </div>
          ) : filteredVillages.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              لا توجد قرى
            </div>
          ) : (
            filteredVillages.map((village) => (
              <div key={village._id} className="mobile-table-card p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                    {village.villageName}
                  </h3>
                  <span
                    className={`px-2 py-1 text-[10px] sm:text-xs rounded-full flex-shrink-0 ${
                      village.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {village.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">معرف القرية:</span>
                    <span className="text-gray-900 dark:text-white font-medium">{village.villageId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">المنطقة:</span>
                    <span className="text-gray-900 dark:text-white font-medium">المنطقة {village.areaId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">تكلفة التوصيل:</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{village.deliveryCost} ₪</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  معرف القرية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  اسم القرية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  المنطقة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  تكلفة التوصيل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : filteredVillages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    لا توجد قرى
                  </td>
                </tr>
              ) : (
                filteredVillages.map((village) => (
                  <tr key={village._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {village.villageId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {village.villageName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {village.areaId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {village.deliveryCost} ₪
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          village.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {village.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredVillages.length > 0 && (
          <div className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-50 dark:bg-gray-700 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            عرض {filteredVillages.length} من {villages.length} قرية
          </div>
        )}
      </div>
    </div>
  );
}

