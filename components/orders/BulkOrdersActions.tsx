'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Printer, 
  X, 
  RotateCcw,
  XCircle,
  AlertCircle,
  Save,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  shippingAddress?: {
    villageId?: number;
    villageName?: string;
    city?: string;
    governorate?: string;
    fullName?: string;
    phone?: string;
  };
  shippingCompany?: string;
}

interface BulkOrdersActionsProps {
  orders: Order[];
  selectedOrderIds: string[];
  onSelectionChange: (orderIds: string[]) => void;
  onBulkUpdate: (action: string, data?: any) => Promise<void>;
  onBulkPrint?: (orderIds: string[]) => void;
  onRefresh?: () => void | Promise<void>; // Cache refresh function
  isLoading?: boolean;
  user?: { role?: string };
}

export default function BulkOrdersActions({
  orders,
  selectedOrderIds,
  onSelectionChange,
  onBulkUpdate,
  onBulkPrint,
  onRefresh,
  isLoading = false,
  user
}: BulkOrdersActionsProps) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Ship modal state
  const [shippingCompany, setShippingCompany] = useState(''); // Will be set to UltraPal when needed
  const [shipMultipleCompany, setShipMultipleCompany] = useState<Record<string, string>>({});
  const [shipMultipleCity, setShipMultipleCity] = useState<Record<string, string>>({});
  const [shipMultipleVillageId, setShipMultipleVillageId] = useState<Record<string, number | null>>({}); // NEW: Store villageId for each order
  const [shippingCompanies, setShippingCompanies] = useState<Array<{
    _id: string; 
    companyName: string;
    shippingCities?: Array<{cityName: string; cityCode?: string; isActive: boolean}>;
    shippingRegions?: Array<{regionName: string; regionCode?: string; cities: string[]; isActive: boolean}>;
  }>>([]);
  const [villages, setVillages] = useState<Array<{villageId: number; villageName: string}>>([]);
  const [filteredVillages, setFilteredVillages] = useState<Array<{villageId: number; villageName: string}>>([]); // FIXED: Add filteredVillages like individual order
  const [companyCities, setCompanyCities] = useState<Record<string, string[]>>({}); // Map company ID to cities
  const [loadingVillages, setLoadingVillages] = useState(false); // Loading state for villages
  const [villageSearchQuery, setVillageSearchQuery] = useState<string>(''); // Search query for villages (general search)
  const [selectedVillageIndex, setSelectedVillageIndex] = useState<number>(-1); // Selected village index for keyboard navigation
  const [orderVillageSearch, setOrderVillageSearch] = useState<Record<string, string>>({}); // Search query for each order
  const [orderVillageDropdown, setOrderVillageDropdown] = useState<Record<string, boolean>>({}); // Dropdown state for each order
  const [orderSelectedVillageIndex, setOrderSelectedVillageIndex] = useState<Record<string, number>>({}); // Selected index for each order
  
  // Cancel/Return modal state
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch shipping companies and villages when ship modal opens
  useEffect(() => {
    if (showBulkModal && (selectedAction === 'ship' || selectedAction === 'update-shipping')) {
      // Set default shipping company to UltraPal for bulk shipping
      setShippingCompany('UltraPal');
      
      fetchShippingCompanies().then((loadedCompanies) => {
        const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
        
        // Initialize company data from existing orders
        const initialCompany: Record<string, string> = {};
        selectedOrders.forEach(order => {
          if (order.shippingCompany) {
            initialCompany[order._id] = order.shippingCompany;
          } else {
            // Default to UltraPal if no company is set
            initialCompany[order._id] = 'UltraPal';
          }
        });
        
        // If no existing companies found, default to UltraPal
        if (Object.keys(initialCompany).length === 0) {
          selectedOrderIds.forEach(id => {
            initialCompany[id] = 'UltraPal';
          });
        }
        
        setShipMultipleCompany(initialCompany);
      });
      fetchVillages();
      
      // Initialize city data from existing order shipping addresses
      const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
      const initialCity: Record<string, string> = {};
      selectedOrders.forEach(order => {
        if (order.shippingAddress?.villageName) {
          initialCity[order._id] = order.shippingAddress.villageName;
        } else if (order.shippingAddress?.city) {
          initialCity[order._id] = order.shippingAddress.city;
        }
      });
      if (Object.keys(initialCity).length > 0) {
        setShipMultipleCity(initialCity);
      }
    }
  }, [showBulkModal, selectedAction, selectedOrderIds, orders]);

  const fetchShippingCompanies = async () => {
    try {
      const response = await fetch('/api/admin/external-companies', {
        credentials: 'include' // Include cookies for authentication
      });
      
      if (response.status === 403) {
        // User doesn't have admin permissions, silently return empty array
        return [];
      }
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      if (data.success && data.companies) {
        // Filter: Only companies with integration (apiEndpointUrl and apiToken)
        const companiesWithIntegration = data.companies.filter((c: any) => 
          c.isActive && c.apiEndpointUrl && c.apiToken && c.apiEndpointUrl.trim() !== '' && c.apiToken.trim() !== ''
        );
        setShippingCompanies(companiesWithIntegration);
        
        // Build cities map for each company
        const citiesMap: Record<string, string[]> = {};
        companiesWithIntegration.forEach((company: any) => {
          const cities: string[] = [];
          // Add cities from shippingCities
          if (company.shippingCities && Array.isArray(company.shippingCities)) {
            company.shippingCities
              .filter((c: any) => c.isActive !== false)
              .forEach((c: any) => {
                if (c.cityName) cities.push(c.cityName);
              });
          }
          // Add cities from shippingRegions
          if (company.shippingRegions && Array.isArray(company.shippingRegions)) {
            company.shippingRegions
              .filter((r: any) => r.isActive !== false)
              .forEach((r: any) => {
                if (r.cities && Array.isArray(r.cities)) {
                  r.cities.forEach((city: string) => {
                    if (city && !cities.includes(city)) cities.push(city);
                  });
                }
              });
          }
          citiesMap[company._id] = cities;
        });
        setCompanyCities(citiesMap);
        
        return companiesWithIntegration;
      }
    } catch (error) {
      // Silently handle errors
    }
    return [];
  };

  const fetchVillages = async () => {
    try {
      setLoadingVillages(true);
      const response = await fetch('/api/villages?limit=1000', {
        credentials: 'include' // Include cookies for authentication
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const sortedVillages = data.data
            .filter((v: any) => v.isActive !== false)
            .sort((a: any, b: any) => a.villageName.localeCompare(b.villageName, 'ar'))
            .map((v: any) => ({ villageId: v.villageId, villageName: v.villageName }));
          setVillages(sortedVillages);
          // FIXED: Initialize filteredVillages with all villages (same as individual order)
          setFilteredVillages(sortedVillages);
        }
      }
    } catch (error) {
      // Silently handle errors
    } finally {
      setLoadingVillages(false);
    }
  };
  
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

  // Smart village search function
  const searchVillages = (query: string, villagesList: typeof villages): typeof villages => {
    if (!query || query.trim() === '') {
      return villagesList;
    }

    const normalizedQuery = normalizeText(query.trim());
    
    return villagesList.filter((village) => {
      const villageName = village.villageName || '';
      const villageId = village.villageId?.toString() || '';
      
      // Normalize village name
      const normalizedName = normalizeText(villageName);
      
      // Check multiple search criteria:
      // 1. Exact match in village name
      // 2. Partial match in village name
      // 3. ID match
      // 4. Match in governorate (if village name contains " - ")
      const nameMatch = normalizedName.includes(normalizedQuery);
      const idMatch = villageId.includes(normalizedQuery);
      
      // Extract governorate if format is "المحافظة - اسم القرية"
      const parts = villageName.split(' - ');
      const governorateMatch = parts.length > 1 ? normalizeText(parts[0]).includes(normalizedQuery) : false;
      const villageOnlyMatch = parts.length > 1 ? normalizeText(parts[1]).includes(normalizedQuery) : false;
      
      return nameMatch || idMatch || governorateMatch || villageOnlyMatch;
    }).sort((a, b) => {
      // Sort by relevance: exact matches first, then partial matches
      const aName = normalizeText(a.villageName || '');
      const bName = normalizeText(b.villageName || '');
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
  };

  // FIXED: Filter villages based on company (same as individual order)
  const filterVillagesForCompany = (company: typeof shippingCompanies[0]) => {
    if (!company || villages.length === 0) {
      return villages;
    }
    
    // If company has no specific cities/regions, show all villages
    const hasCities = company.shippingCities && company.shippingCities.length > 0;
    const hasRegions = company.shippingRegions && company.shippingRegions.length > 0;
    
    if (!hasCities && !hasRegions) {
      return villages;
    }
    
    // Filter villages based on company's supported cities/regions
    // For now, show all villages since UltraPal supports all villages
    // This can be enhanced later if companies have specific village restrictions
    return villages;
  };
  
  // FIXED: Update filtered villages when company, villages, or search query change (same as individual order)
  useEffect(() => {
    if (villages.length === 0) return;
    
    let baseFiltered: typeof villages = [];
    
    // First apply company filter
    if (shippingCompany && shippingCompanies.length > 0) {
      const selectedCompany = shippingCompanies.find(c => c.companyName === shippingCompany);
      if (selectedCompany) {
        baseFiltered = filterVillagesForCompany(selectedCompany);
      } else {
        baseFiltered = villages;
      }
    } else {
      baseFiltered = villages;
    }
    
    // Then apply search filter - Real-time
    if (villageSearchQuery.trim()) {
      const searchResults = searchVillages(villageSearchQuery, baseFiltered);
      setFilteredVillages(searchResults);
    } else {
      setFilteredVillages(baseFiltered);
    }
  }, [villageSearchQuery, villages, shippingCompany, shippingCompanies]);

  // Click outside detection for village dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.village-search-container')) {
        // Close all dropdowns
        const allClosed: Record<string, boolean> = {};
        Object.keys(orderVillageDropdown).forEach(orderId => {
          allClosed[orderId] = false;
        });
        setOrderVillageDropdown(allClosed);
      }
    };

    if (Object.values(orderVillageDropdown).some(open => open)) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [orderVillageDropdown]);


  const selectedCount = selectedOrderIds.length;
  const allSelected = selectedCount === orders.length && orders.length > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(orders.map(order => order._id));
    }
  };

  const handleToggleSelect = (orderId: string) => {
    if (selectedOrderIds.includes(orderId)) {
      onSelectionChange(selectedOrderIds.filter(id => id !== orderId));
    } else {
      onSelectionChange([...selectedOrderIds, orderId]);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCount === 0) {
      toast.error('يرجى اختيار طلب واحد على الأقل');
      return;
    }

    // Actions that need a modal
    if (['ship', 'update-shipping', 'cancel', 'return'].includes(action)) {
      setSelectedAction(action);
      setShowBulkModal(true);
      return;
    }

    // Print action
    if (action === 'print' && onBulkPrint) {
      onBulkPrint(selectedOrderIds);
      return;
    }

    // Direct actions (confirm, process, deliver)
    await executeBulkAction(action);
  };

  const executeBulkAction = async (action: string, additionalData?: any) => {
    if (selectedCount === 0) return;

    setProcessing(true);
    try {
      const actionData: any = {
        action,
        ...additionalData
      };

      // For update-shipping action, update shipping info without changing status
      // FIXED: Use same API as individual order (PUT /api/orders/[id] with updateShippingOnly: true)
      if (action === 'update-shipping') {
        if (additionalData?.ordersData && Array.isArray(additionalData.ordersData)) {
          const updateResults = await Promise.allSettled(
            additionalData.ordersData.map(async (orderData: any) => {
              const order = orders.find(o => o._id === orderData.orderId);
              if (!order) {
                throw new Error(`الطلب ${orderData.orderId} غير موجود`);
              }
              
              // Ensure villageId is a valid number
              const villageId = orderData.villageId;
              if (!villageId || villageId === null || villageId === undefined) {
                throw new Error(`القرية غير محددة للطلب ${order.orderNumber}`);
              }
              
              // Get village name
              const selectedVillage = villages.find(v => v.villageId === villageId);
              const villageName = selectedVillage?.villageName || order.shippingAddress?.villageName || '';
              const finalShippingCity = orderData.city || villageName || order.shippingAddress?.governorate || 'غير محدد';
              
              // Use same API endpoint as individual order
              const response = await fetch(`/api/orders/${orderData.orderId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies for authentication
                body: JSON.stringify({
                  shippingCompany: orderData.shippingCompany.trim(),
                  shippingCity: finalShippingCity.trim(),
                  villageId: Number(villageId),
                  villageName: villageName,
                  updateShippingOnly: true // Same flag as individual order
                }),
              });
              
              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || error.message || `فشل تحديث الطلب ${order.orderNumber}`);
              }
              
              return { orderId: orderData.orderId, orderNumber: order.orderNumber, success: true };
            })
          );
          
          const successful = updateResults.filter(r => r.status === 'fulfilled').length;
          const failed = updateResults.filter(r => r.status === 'rejected');
          
          if (failed.length > 0) {
            const failedOrders = failed.map((f: any) => f.reason?.message || 'خطأ غير معروف').join(', ');
            toast.error(`فشل تحديث ${failed.length} طلب: ${failedOrders}`);
          }
          
          if (successful > 0) {
            toast.success(`تم تحديث معلومات الشحن لـ ${successful} طلب بنجاح`);
            // Refresh cache to update orders list
            if (onRefresh) {
              await onRefresh();
            } else if (typeof window !== 'undefined') {
              // Fallback to event if onRefresh not provided
              window.dispatchEvent(new Event('refresh-orders'));
            }
          }
          
          // Reset selection after successful action
          onSelectionChange([]);
          setShowBulkModal(false);
          setSelectedAction(null);
          setShippingCompany('');
          setShipMultipleCompany({});
          setShipMultipleCity({});
          setShipMultipleVillageId({});
          setReason('');
          setAdminNotes('');
        } else {
          toast.error('بيانات الطلبات غير صحيحة');
        }
        return;
      }
      
      // For ship action, handle each order with its specific data
      // FIXED: Use same flow as individual order - update shipping first, then ship
      if (action === 'ship') {
        // FIXED: Build ordersToShip array with proper validation
        let ordersToShip: Array<{orderId: string; shippingCompany: string; city: string; villageId: number}> = [];
        
        if (additionalData?.ordersData && Array.isArray(additionalData.ordersData)) {
          // Filter out null/undefined items and validate
          ordersToShip = additionalData.ordersData
            .filter((item: any) => item !== null && item !== undefined && item.orderId)
            .map((orderData: any) => {
              const order = orders.find(o => o._id === orderData.orderId);
              // Use villageId from orderData or fallback to order.shippingAddress?.villageId
              const villageId = orderData.villageId || order?.shippingAddress?.villageId;
              
              if (!villageId || villageId === null || villageId === undefined) {
                return null;
              }
              
              return {
                orderId: orderData.orderId,
                shippingCompany: orderData.shippingCompany || 'UltraPal',
                city: orderData.city || order?.shippingAddress?.villageName || order?.shippingAddress?.city || '',
                villageId: Number(villageId)
              };
            })
            .filter((item: any) => item !== null) as Array<{orderId: string; shippingCompany: string; city: string; villageId: number}>;
        } else {
          // Legacy format
          ordersToShip = selectedOrderIds
            .map((orderId) => {
              const order = orders.find(o => o._id === orderId);
              const company = shipMultipleCompany[orderId] || shippingCompany || 'UltraPal';
              const city = shipMultipleCity[orderId];
              // FIXED: Use same logic - check both shipMultipleVillageId and order.shippingAddress?.villageId
              const villageId = shipMultipleVillageId[orderId] || order?.shippingAddress?.villageId;
              
              if (!villageId || villageId === null || villageId === undefined) {
                return null;
              }
              
              return {
                orderId: orderId,
                shippingCompany: company,
                city: city || order?.shippingAddress?.villageName || order?.shippingAddress?.city || '',
                villageId: Number(villageId)
              };
            })
            .filter(item => item !== null) as Array<{orderId: string; shippingCompany: string; city: string; villageId: number}>;
        }
        
        // If no valid orders after filtering, show error
        if (ordersToShip.length === 0) {
          toast.error('لا توجد طلبات صالحة للشحن. يرجى التأكد من تحديد القرية لكل طلب.');
          setProcessing(false);
          return;
        }
        
        // Process each order: first update shipping, then ship (same as individual order)
        const shipResults = await Promise.allSettled(
          ordersToShip.map(async (orderData: any) => {
            const order = orders.find(o => o._id === orderData.orderId);
            if (!order) {
              throw new Error(`الطلب ${orderData.orderId} غير موجود`);
            }
            
            // Ensure villageId is a valid number
            const villageId = orderData.villageId;
            if (!villageId || villageId === null || villageId === undefined) {
              throw new Error(`القرية غير محددة للطلب ${order.orderNumber}`);
            }
            
            // Get village name
            const selectedVillage = villages.find(v => v.villageId === villageId);
            const villageName = selectedVillage?.villageName || order.shippingAddress?.villageName || '';
            const finalShippingCity = orderData.city || villageName || order.shippingAddress?.governorate || 'غير محدد';
            
            // STEP 1: Update shipping info first (same as individual order)
            const updateResponse = await fetch(`/api/orders/${orderData.orderId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Include cookies for authentication
              body: JSON.stringify({
                shippingCompany: orderData.shippingCompany.trim(),
                shippingCity: finalShippingCity.trim(),
                villageId: Number(villageId),
                villageName: villageName,
                updateShippingOnly: true // Same as individual order
              }),
            });
            
            if (!updateResponse.ok) {
              const error = await updateResponse.json();
              throw new Error(error.error || error.message || `فشل تحديث معلومات الشحن للطلب ${order.orderNumber}`);
            }
            
            // STEP 2: Ship the order (same as individual order)
            const villageIdToSend = parseInt(String(villageId), 10);
            const shipResponse = await fetch(`/api/orders/${orderData.orderId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Include cookies for authentication
              body: JSON.stringify({
                status: 'shipped',
                shippingCompany: orderData.shippingCompany.trim(),
                shippingCity: finalShippingCity.trim(),
                villageId: villageIdToSend
              }),
            });
            
            if (!shipResponse.ok) {
              const error = await shipResponse.json();
              throw new Error(error.error || error.message || `فشل شحن الطلب ${order.orderNumber}`);
            }
            
            const shipData = await shipResponse.json();
            
            // Check if order was successfully shipped (apiSuccess field indicates if package was sent to shipping company)
            const apiSuccess = shipData.apiSuccess !== false; // Default to true if not specified (for backward compatibility)
            const packageId = shipData.order?.packageId;
            
            if (!apiSuccess) {
              // Package was created but failed to send to shipping company
              const errorMessage = shipData.error || 'فشل إرسال الطرد إلى شركة الشحن';
              throw new Error(`${errorMessage} - الطلب ${order.orderNumber}${packageId ? ` (رقم الطرد: ${packageId})` : ''}`);
            }
            
            // Check if response indicates failure
            if (!shipData.success) {
              const errorMessage = shipData.error || 'فشل شحن الطلب';
              throw new Error(`${errorMessage} - الطلب ${order.orderNumber}`);
            }
            
            // Check package status (same as individual order)
            let packageStatus: string | null = null;
            if (packageId) {
              try {
                const statusResponse = await fetch(`/api/packages?packageId=${packageId}`, {
                  credentials: 'include' // Include cookies for authentication
                });
                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  if (statusData.success && statusData.package) {
                    packageStatus = statusData.package.status || 'pending';
                  } else {
                    // Package not found or error - assume pending
                    packageStatus = 'pending';
                  }
                } else {
                  // API error - assume pending
                  packageStatus = 'pending';
                }
              } catch (error) {
                // Ignore package status check errors - assume pending
                packageStatus = 'pending';
              }
            }
            
            return {
              orderId: orderData.orderId,
              orderNumber: order.orderNumber,
              packageId: packageId,
              packageStatus: packageStatus,
              success: true
            };
          })
        );
        
        // Process results
        const successful = shipResults.filter(r => r.status === 'fulfilled').length;
        const failed = shipResults.filter(r => r.status === 'rejected');
        
        // Separate successful shipments into confirmed and pending packages
        const fulfilledResults = shipResults
          .filter(r => r.status === 'fulfilled')
          .map((r: any) => r.value);
        
        const confirmedPackages = fulfilledResults.filter((v: any) => 
          v.packageId && v.packageStatus && v.packageStatus !== 'pending'
        );
        
        const pendingPackages = fulfilledResults.filter((v: any) => 
          v.packageId && v.packageStatus === 'pending'
        );
        
        const noPackageResults = fulfilledResults.filter((v: any) => !v.packageId);
        
        if (failed.length > 0) {
          const failedOrders = failed.map((f: any) => f.reason?.message || 'خطأ غير معروف').join(', ');
          toast.error(`فشل شحن ${failed.length} طلب: ${failedOrders}`, { duration: 5000 });
        }
        
        // Show warning only if packages were created but failed to send to shipping company
        if (pendingPackages.length > 0) {
          const pendingList = pendingPackages
            .map((p: any) => {
              const packageId = p.packageId || 'غير محدد';
              return `الطلب ${p.orderNumber} (طرد ${packageId})`;
            })
            .join(', ');
          toast(`⚠️ تم إنشاء ${pendingPackages.length} طرد لكن فشل إرسالهم لشركة الشحن. يمكنك إعادة الإرسال من صفحة تفاصيل الطلب: ${pendingList}`, {
            icon: '⚠️',
            duration: 8000
          });
        }
        
        // Show success message for confirmed packages and orders without packages
        const successCount = confirmedPackages.length + noPackageResults.length;
        if (successCount > 0) {
          const successList = [
            ...confirmedPackages.map((v: any) => 
              `الطلب ${v.orderNumber} (طرد ${v.packageId})`
            ),
            ...noPackageResults.map((v: any) => 
              `الطلب ${v.orderNumber}`
            )
          ].join(', ');
          toast.success(`✅ تم شحن ${successCount} طلب بنجاح: ${successList}`, { duration: 5000 });
          // Refresh cache to update orders list
          if (onRefresh) {
            await onRefresh();
          } else if (typeof window !== 'undefined') {
            // Fallback to event if onRefresh not provided
            window.dispatchEvent(new Event('refresh-orders'));
          }
        }
        
        // Reset selection after action
        onSelectionChange([]);
        setShowBulkModal(false);
        setSelectedAction(null);
        setShippingCompany('');
        setShipMultipleCompany({});
        setShipMultipleCity({});
        setShipMultipleVillageId({});
        setReason('');
        setAdminNotes('');
        return;
      } else {
        // onBulkUpdate will show the success message, so we don't need to show it here
        await onBulkUpdate(action, {
          orderIds: selectedOrderIds,
          ...actionData
        });
      }

      // Reset selection after successful action
      onSelectionChange([]);
      setShowBulkModal(false);
      setSelectedAction(null);
      setShippingCompany('');
      setShipMultipleCompany({});
      setShipMultipleCity({});
      setReason('');
      setAdminNotes('');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setProcessing(false);
    }
  };

  const canPerformAction = (action: string): boolean => {
    // Get unique statuses of selected orders
    const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
    const statuses = new Set(selectedOrders.map(o => o.status));

    switch (action) {
      case 'confirm':
        return Array.from(statuses).every(s => s === 'pending');
      case 'process':
        return Array.from(statuses).every(s => s === 'confirmed');
      case 'ship':
        return Array.from(statuses).every(s => ['processing', 'confirmed'].includes(s));
      case 'deliver':
        return Array.from(statuses).every(s => s === 'shipped');
      case 'cancel':
        return Array.from(statuses).every(s => !['cancelled', 'delivered', 'returned'].includes(s));
      case 'return':
        return Array.from(statuses).every(s => ['shipped', 'delivered'].includes(s));
      default:
        return true;
    }
  };

  if (!orders.length) return null;

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4 space-x-reverse">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                تم اختيار {selectedCount} طلب
              </span>
              <button
                onClick={() => onSelectionChange([])}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                إلغاء التحديد
              </button>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-2">
              {canPerformAction('confirm') && (
                <button
                  onClick={() => handleBulkAction('confirm')}
                  disabled={processing || isLoading}
                  className="btn-success text-sm px-3 py-1.5 flex items-center"
                >
                  <CheckCircle className="w-4 h-4 ml-1" />
                  تأكيد ({selectedCount})
                </button>
              )}

              {canPerformAction('process') && (
                <button
                  onClick={() => handleBulkAction('process')}
                  disabled={processing || isLoading}
                  className="btn-primary text-sm px-3 py-1.5 flex items-center"
                >
                  <Package className="w-4 h-4 ml-1" />
                  معالجة ({selectedCount})
                </button>
              )}

              {canPerformAction('ship') && (
                <button
                  onClick={() => handleBulkAction('ship')}
                  disabled={processing || isLoading}
                  className="btn-primary text-sm px-3 py-1.5 flex items-center"
                >
                  <Truck className="w-4 h-4 ml-1" />
                  شحن ({selectedCount})
                </button>
              )}

              {/* Update Shipping - Always visible for admin when orders are selected */}
              {user?.role === 'admin' && selectedCount > 0 && (
                <button
                  onClick={() => handleBulkAction('update-shipping')}
                  disabled={processing || isLoading}
                  className="btn-secondary text-sm px-3 py-1.5 flex items-center border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <Truck className="w-4 h-4 ml-1" />
                  تحديث الشحن ({selectedCount})
                </button>
              )}

              {canPerformAction('deliver') && (
                <button
                  onClick={() => handleBulkAction('deliver')}
                  disabled={processing || isLoading}
                  className="btn-success text-sm px-3 py-1.5 flex items-center"
                >
                  <CheckCircle className="w-4 h-4 ml-1" />
                  توصيل ({selectedCount})
                </button>
              )}

              {onBulkPrint && (
                <button
                  onClick={() => handleBulkAction('print')}
                  disabled={processing || isLoading}
                  className="btn-secondary text-sm px-3 py-1.5 flex items-center"
                >
                  <Printer className="w-4 h-4 ml-1" />
                  طباعة ({selectedCount})
                </button>
              )}

              {canPerformAction('cancel') && (
                <button
                  onClick={() => handleBulkAction('cancel')}
                  disabled={processing || isLoading}
                  className="btn-danger text-sm px-3 py-1.5 flex items-center"
                >
                  <XCircle className="w-4 h-4 ml-1" />
                  إلغاء ({selectedCount})
                </button>
              )}

              {canPerformAction('return') && (
                <button
                  onClick={() => handleBulkAction('return')}
                  disabled={processing || isLoading}
                  className="btn-warning text-sm px-3 py-1.5 flex items-center"
                >
                  <RotateCcw className="w-4 h-4 ml-1" />
                  إرجاع ({selectedCount})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Modal */}
      {showBulkModal && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl ${selectedAction === 'ship' ? 'max-w-3xl' : 'max-w-md'} w-full max-h-[90vh] overflow-y-auto`}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {selectedAction === 'ship' && 'شحن الطلبات'}
                  {selectedAction === 'update-shipping' && 'تحديث معلومات الشحن'}
                  {selectedAction === 'cancel' && 'إلغاء الطلبات'}
                  {selectedAction === 'return' && 'إرجاع الطلبات'}
                </h3>
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setSelectedAction(null);
                    setShippingCompany('');
                    setShipMultipleCompany({});
                    setShipMultipleCity({});
                    setReason('');
                    setAdminNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Update Shipping Action Form */}
              {selectedAction === 'update-shipping' && (
                <div className="space-y-4">
                  {/* Same form as ship but for updating only */}
                  {/* Check for orders without shipping data */}
                  {(() => {
                    const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
                    const ordersWithoutShipping = selectedOrders.filter(o => 
                      !o.shippingAddress?.villageName && !o.shippingAddress?.city
                    );
                    
                    if (ordersWithoutShipping.length > 0) {
                      return (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start">
                          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 ml-2 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-300">
                            <p className="font-semibold mb-1">بعض الطلبات لا تحتوي على بيانات الشحن:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {ordersWithoutShipping.map(order => (
                                <li key={order._id}>الطلب {order.orderNumber}</li>
                              ))}
                            </ul>
                            <p className="mt-2">يرجى تحديد المدينة لكل طلب أدناه.</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                      بيانات الشحن لكل طلب
                    </label>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {orders
                        .filter(o => selectedOrderIds.includes(o._id))
                        .map(order => {
                          const hasShippingData = order.shippingAddress?.villageName || order.shippingAddress?.city;
                          const currentCompany = 'UltraPal'; // Always UltraPal
                          const currentCity = shipMultipleCity[order._id] || order.shippingAddress?.villageName || order.shippingAddress?.city || '';
                          
                          return (
                            <div key={order._id} className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-slate-700/30">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                                  طلب #{order.orderNumber}
                                </h4>
                                {!hasShippingData && (
                                  <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                                    بدون بيانات شحن
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Shipping Company - Read-only for update-shipping action */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    شركة الشحن <span className="text-red-500">*</span>
                                  </label>
                                  {shippingCompanies.length > 0 ? (
                                    <select
                                      value={currentCompany}
                                      onChange={(e) => {
                                        const newCompany = e.target.value;
                                        setShipMultipleCompany({
                                          ...shipMultipleCompany,
                                          [order._id]: newCompany
                                        });
                                        // Clear city when company changes
                                        if (currentCompany !== newCompany) {
                                          setShipMultipleCity({
                                            ...shipMultipleCity,
                                            [order._id]: ''
                                          });
                                        }
                                      }}
                                      disabled={selectedAction === 'update-shipping'}
                                      className="input-field text-sm disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
                                      required
                                    >
                                      <option value="">اختر شركة الشحن</option>
                                      {shippingCompanies.map((company) => (
                                        <option key={company._id} value={company.companyName}>
                                          {company.companyName}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={currentCompany}
                                      onChange={(e) => setShipMultipleCompany({
                                        ...shipMultipleCompany,
                                        [order._id]: e.target.value
                                      })}
                                      placeholder="اسم شركة الشحن"
                                      disabled={selectedAction === 'update-shipping'}
                                      className="input-field text-sm disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
                                      required
                                    />
                                  )}
                                  {selectedAction === 'update-shipping' && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      ℹ️ شركة الشحن غير قابلة للتغيير عند التحديث
                                    </p>
                                  )}
                                </div>

                                {/* City/Village */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    المدينة <span className="text-red-500">*</span>
                                  </label>
                                  {(() => {
                                    // Find selected company and get its cities
                                    const selectedCompanyObj = shippingCompanies.find(
                                      c => c.companyName === currentCompany
                                    );
                                    const availableCities = selectedCompanyObj?._id 
                                      ? (companyCities[selectedCompanyObj._id] || [])
                                      : [];
                                    
                                    if (availableCities.length > 0) {
                                      return (
                                        <select
                                          value={currentCity}
                                          onChange={(e) => setShipMultipleCity({
                                            ...shipMultipleCity,
                                            [order._id]: e.target.value
                                          })}
                                          className="input-field text-sm"
                                          required
                                        >
                                          <option value="">اختر المدينة</option>
                                          {availableCities.map((city, idx) => (
                                            <option key={idx} value={city}>
                                              {city}
                                            </option>
                                          ))}
                                        </select>
                                      );
                                    } else if (loadingVillages) {
                                      // Show loader while villages are loading
                                      return (
                                        <div className="relative">
                                          <select
                                            disabled
                                            className="input-field text-sm bg-gray-50 dark:bg-slate-700 cursor-wait"
                                          >
                                            <option value="">جاري تحميل القرى...</option>
                                          </select>
                                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                            <div className="loading-spinner w-4 h-4"></div>
                                          </div>
                                        </div>
                                      );
                                    } else if (filteredVillages.length > 0) {
                                      // FIXED: Use filteredVillages with villageId support (same as individual order)
                                      return (
                                        <div className="relative village-search-container">
                                          <div className="relative">
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
                                              <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <input
                                              type="text"
                                              value={orderVillageSearch[order._id] !== undefined ? orderVillageSearch[order._id] : (shipMultipleVillageId[order._id] || order.shippingAddress?.villageId ? filteredVillages.find(v => v.villageId === (shipMultipleVillageId[order._id] || order.shippingAddress?.villageId))?.villageName || order.shippingAddress?.villageName || '' : '')}
                                              onChange={(e) => {
                                                const newValue = e.target.value;
                                                const currentVillageId = shipMultipleVillageId[order._id] || order.shippingAddress?.villageId;
                                                const currentVillageName = currentVillageId ? filteredVillages.find(v => v.villageId === currentVillageId)?.villageName || order.shippingAddress?.villageName || '' : '';
                                                
                                                setOrderVillageSearch({
                                                  ...orderVillageSearch,
                                                  [order._id]: newValue
                                                });
                                                setOrderSelectedVillageIndex({
                                                  ...orderSelectedVillageIndex,
                                                  [order._id]: -1
                                                });
                                                
                                                // If user is typing something different from the current village name, clear the selection
                                                if (newValue !== currentVillageName) {
                                                  // Clear the selected village when user starts typing a new search
                                                  setShipMultipleVillageId({
                                                    ...shipMultipleVillageId,
                                                    [order._id]: null
                                                  });
                                                  setShipMultipleCity({
                                                    ...shipMultipleCity,
                                                    [order._id]: ''
                                                  });
                                                }
                                              }}
                                              onFocus={() => {
                                                if (filteredVillages.length > 0) {
                                                  setOrderVillageDropdown({
                                                    ...orderVillageDropdown,
                                                    [order._id]: true
                                                  });
                                                }
                                              }}
                                              onClick={() => {
                                                if (filteredVillages.length > 0) {
                                                  setOrderVillageDropdown({
                                                    ...orderVillageDropdown,
                                                    [order._id]: true
                                                  });
                                                }
                                              }}
                                              onKeyDown={(e) => {
                                                const searchQuery = orderVillageSearch[order._id] || '';
                                                const orderFiltered = searchQuery.trim() 
                                                  ? searchVillages(searchQuery, filteredVillages)
                                                  : filteredVillages;
                                                const currentIndex = orderSelectedVillageIndex[order._id] ?? -1;
                                                
                                                if (e.key === 'Escape') {
                                                  setOrderVillageDropdown({
                                                    ...orderVillageDropdown,
                                                    [order._id]: false
                                                  });
                                                  setOrderVillageSearch({
                                                    ...orderVillageSearch,
                                                    [order._id]: ''
                                                  });
                                                  setOrderSelectedVillageIndex({
                                                    ...orderSelectedVillageIndex,
                                                    [order._id]: -1
                                                  });
                                                  e.preventDefault();
                                                } else if (e.key === 'Enter' && orderFiltered.length > 0) {
                                                  e.preventDefault();
                                                  const indexToSelect = currentIndex >= 0 ? currentIndex : 0;
                                                  if (orderFiltered[indexToSelect]) {
                                                    const village = orderFiltered[indexToSelect];
                                                    setShipMultipleVillageId({
                                                      ...shipMultipleVillageId,
                                                      [order._id]: village.villageId
                                                    });
                                                    setShipMultipleCity({
                                                      ...shipMultipleCity,
                                                      [order._id]: village.villageName
                                                    });
                                                    setOrderVillageSearch({
                                                      ...orderVillageSearch,
                                                      [order._id]: ''
                                                    });
                                                    setOrderVillageDropdown({
                                                      ...orderVillageDropdown,
                                                      [order._id]: false
                                                    });
                                                    setOrderSelectedVillageIndex({
                                                      ...orderSelectedVillageIndex,
                                                      [order._id]: -1
                                                    });
                                                  }
                                                } else if (e.key === 'ArrowDown' && orderFiltered.length > 0) {
                                                  e.preventDefault();
                                                  setOrderSelectedVillageIndex({
                                                    ...orderSelectedVillageIndex,
                                                    [order._id]: currentIndex < orderFiltered.length - 1 ? currentIndex + 1 : 0
                                                  });
                                                } else if (e.key === 'ArrowUp' && orderFiltered.length > 0) {
                                                  e.preventDefault();
                                                  setOrderSelectedVillageIndex({
                                                    ...orderSelectedVillageIndex,
                                                    [order._id]: currentIndex > 0 ? currentIndex - 1 : orderFiltered.length - 1
                                                  });
                                                }
                                              }}
                                              placeholder={order.shippingAddress?.villageId 
                                                ? `القرية الحالية: ${order.shippingAddress?.villageName || 'غير محدد'} (ID: ${order.shippingAddress.villageId})`
                                                : "ابحث عن القرية أو المحافظة أو ID..."}
                                              className="input-field text-sm pr-10"
                                              required
                                            />
                                            {orderVillageSearch[order._id] && (
                                              <button
                                                onClick={() => {
                                                  setOrderVillageSearch({
                                                    ...orderVillageSearch,
                                                    [order._id]: ''
                                                  });
                                                  setOrderSelectedVillageIndex({
                                                    ...orderSelectedVillageIndex,
                                                    [order._id]: -1
                                                  });
                                                }}
                                                className="absolute inset-y-0 left-0 pl-3 flex items-center hover:bg-gray-100 dark:hover:bg-slate-600 rounded-l-lg transition-colors"
                                                aria-label="مسح البحث"
                                              >
                                                <X className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                                              </button>
                                            )}
                                          </div>
                                          
                                          {/* Dropdown List */}
                                          {orderVillageDropdown[order._id] && (
                                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                              {(() => {
                                                const searchQuery = orderVillageSearch[order._id] || '';
                                                const orderFiltered = searchQuery.trim() 
                                                  ? searchVillages(searchQuery, filteredVillages)
                                                  : filteredVillages;
                                                
                                                if (orderFiltered.length === 0) {
                                                  return (
                                                    <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                                      لا توجد نتائج
                                                    </div>
                                                  );
                                                }
                                                
                                                return orderFiltered.map((village, index) => {
                                                  const currentIndex = orderSelectedVillageIndex[order._id] ?? -1;
                                                  const isSelected = currentIndex === index;
                                                  const isCurrentVillage = village.villageId === (shipMultipleVillageId[order._id] || order.shippingAddress?.villageId);
                                                  
                                                  return (
                                                    <div
                                                      key={village.villageId}
                                                      onClick={() => {
                                                        setShipMultipleVillageId({
                                                          ...shipMultipleVillageId,
                                                          [order._id]: village.villageId
                                                        });
                                                        setShipMultipleCity({
                                                          ...shipMultipleCity,
                                                          [order._id]: village.villageName
                                                        });
                                                        setOrderVillageSearch({
                                                          ...orderVillageSearch,
                                                          [order._id]: ''
                                                        });
                                                        setOrderVillageDropdown({
                                                          ...orderVillageDropdown,
                                                          [order._id]: false
                                                        });
                                                        setOrderSelectedVillageIndex({
                                                          ...orderSelectedVillageIndex,
                                                          [order._id]: -1
                                                        });
                                                      }}
                                                      className={`p-3 cursor-pointer text-sm transition-colors ${
                                                        isSelected
                                                          ? 'bg-[#FF9800] text-white'
                                                          : isCurrentVillage
                                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                          : 'text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-600'
                                                      }`}
                                                    >
                                                      <div className="font-medium">{village.villageName}</div>
                                                      <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        ID: {village.villageId}
                                                      </div>
                                                    </div>
                                                  );
                                                });
                                              })()}
                                            </div>
                                          )}
                                          
                                          {order.shippingAddress?.villageId && (
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                              ℹ️ القرية الحالية محددة من قبل المسوق. يمكنك تغييرها إذا لزم الأمر.
                                            </p>
                                          )}
                                          {orderVillageSearch[order._id] && (
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                              🔍 عرض {(() => {
                                                const searchQuery = orderVillageSearch[order._id] || '';
                                                const orderFiltered = searchQuery.trim() 
                                                  ? searchVillages(searchQuery, filteredVillages)
                                                  : filteredVillages;
                                                return orderFiltered.length;
                                              })()} من {filteredVillages.length} قرية بناءً على البحث
                                            </p>
                                          )}
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <input
                                          type="text"
                                          value={currentCity}
                                          onChange={(e) => setShipMultipleCity({
                                            ...shipMultipleCity,
                                            [order._id]: e.target.value
                                          })}
                                          placeholder="اسم المدينة"
                                          className="input-field text-sm"
                                          required
                                        />
                                      );
                                    }
                                  })()}
                                </div>

                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 space-x-reverse pt-4 border-t border-gray-200 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setShowBulkModal(false);
                        setSelectedAction(null);
                      }}
                      disabled={processing}
                      className="btn-secondary"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        // FIXED: Validate all orders have required data (same as individual order)
                        const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
                        
                        // Validate shipping company
                        const company = 'UltraPal'; // Always UltraPal for now
                        if (!company || !company.trim()) {
                          toast.error('يرجى اختيار شركة الشحن');
                          return;
                        }
                        
                        // Validate villageId for each order
                        const invalidOrders = selectedOrders.filter(order => {
                          const villageId = shipMultipleVillageId[order._id] || order.shippingAddress?.villageId;
                          return !villageId;
                        });

                        if (invalidOrders.length > 0) {
                          toast.error(`يرجى تحديد القرية للطلبات: ${invalidOrders.map(o => o.orderNumber).join(', ')}`);
                          return;
                        }
                        
                        // Validate village exists in filtered list (same as individual order)
                        const invalidVillageOrders = selectedOrders.filter(order => {
                          const villageId = shipMultipleVillageId[order._id] || order.shippingAddress?.villageId;
                          if (!villageId || !company || filteredVillages.length === 0) return false;
                          return !filteredVillages.some(v => v.villageId === villageId);
                        });
                        
                        if (invalidVillageOrders.length > 0) {
                          toast.error(`القرية المختارة غير متاحة لشركة الشحن للطلبات: ${invalidVillageOrders.map(o => o.orderNumber).join(', ')}`);
                          return;
                        }

                        executeBulkAction('update-shipping', {
                          ordersData: selectedOrders.map(order => ({
                            orderId: order._id,
                            shippingCompany: 'UltraPal',
                            city: shipMultipleCity[order._id],
                            villageId: shipMultipleVillageId[order._id] // FIXED: Include villageId
                          }))
                        });
                      }}
                      disabled={processing}
                      className="btn-primary flex items-center"
                    >
                      {processing ? (
                        <>
                          <div className="loading-spinner w-4 h-4 ml-2"></div>
                          جاري التحديث...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 ml-2" />
                          تحديث ({selectedCount})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Ship Action Form */}
              {selectedAction === 'ship' && (
                <div className="space-y-4">
                  {/* Check for orders without shipping data */}
                  {(() => {
                    const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
                    const ordersWithoutShipping = selectedOrders.filter(o => 
                      !o.shippingAddress?.villageName && !o.shippingAddress?.city
                    );
                    
                    if (ordersWithoutShipping.length > 0) {
                      return (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start">
                          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 ml-2 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-300">
                            <p className="font-semibold mb-1">بعض الطلبات لا تحتوي على بيانات الشحن:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {ordersWithoutShipping.map(order => (
                                <li key={order._id}>الطلب {order.orderNumber}</li>
                              ))}
                            </ul>
                            <p className="mt-2">يرجى تحديد المدينة لكل طلب أدناه.</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Bulk orders form - each order has its own shipping company, city, and tracking */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                      بيانات الشحن لكل طلب <span className="text-red-500">*</span>
                    </label>
                    
                    {/* Village Search Field */}
                    {!loadingVillages && villages.length > 0 && (
                      <div className="mb-4">
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          </div>
                          <input
                            type="text"
                            value={villageSearchQuery}
                            onChange={(e) => {
                              setVillageSearchQuery(e.target.value);
                              setSelectedVillageIndex(-1); // Reset selection when typing
                            }}
                            onKeyDown={(e) => {
                              // Escape: Clear search
                              if (e.key === 'Escape') {
                                setVillageSearchQuery('');
                                setSelectedVillageIndex(-1);
                                e.preventDefault();
                              }
                              // Enter: Select first result if only one, or selected one
                              else if (e.key === 'Enter' && filteredVillages.length > 0) {
                                e.preventDefault();
                                const indexToSelect = selectedVillageIndex >= 0 ? selectedVillageIndex : 0;
                                if (filteredVillages[indexToSelect]) {
                                  const village = filteredVillages[indexToSelect];
                                  // Apply to all orders that don't have a village selected
                                  const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
                                  const ordersWithoutVillage = selectedOrders.filter(o => 
                                    !shipMultipleVillageId[o._id] && !o.shippingAddress?.villageId
                                  );
                                  
                                  if (ordersWithoutVillage.length > 0) {
                                    const updates: Record<string, number | null> = {};
                                    const cityUpdates: Record<string, string> = {};
                                    ordersWithoutVillage.forEach(o => {
                                      updates[o._id] = village.villageId;
                                      cityUpdates[o._id] = village.villageName;
                                    });
                                    setShipMultipleVillageId({...shipMultipleVillageId, ...updates});
                                    setShipMultipleCity({...shipMultipleCity, ...cityUpdates});
                                    toast.success(`تم اختيار: ${village.villageName} لـ ${ordersWithoutVillage.length} طلب`);
                                  } else {
                                    toast('جميع الطلبات لديها قرية محددة بالفعل', { icon: 'ℹ️' });
                                  }
                                  setVillageSearchQuery('');
                                  setSelectedVillageIndex(-1);
                                }
                              }
                              // Arrow Down: Navigate down
                              else if (e.key === 'ArrowDown' && filteredVillages.length > 0) {
                                e.preventDefault();
                                setSelectedVillageIndex((prev) => 
                                  prev < filteredVillages.length - 1 ? prev + 1 : 0
                                );
                              }
                              // Arrow Up: Navigate up
                              else if (e.key === 'ArrowUp' && filteredVillages.length > 0) {
                                e.preventDefault();
                                setSelectedVillageIndex((prev) => 
                                  prev > 0 ? prev - 1 : filteredVillages.length - 1
                                );
                              }
                            }}
                            placeholder="ابحث عن القرية أو المحافظة أو ID... (استخدم ↑↓ للتنقل، Enter للاختيار، Esc للمسح)"
                            className="w-full pl-4 pr-10 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF9800] focus:border-transparent transition-all"
                            aria-label="بحث عن القرية"
                          />
                          {villageSearchQuery && (
                            <button
                              onClick={() => {
                                setVillageSearchQuery('');
                                setSelectedVillageIndex(-1);
                              }}
                              className="absolute inset-y-0 left-0 pl-3 flex items-center hover:bg-gray-100 dark:hover:bg-slate-600 rounded-l-lg transition-colors"
                              aria-label="مسح البحث"
                            >
                              <X className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                            </button>
                          )}
                        </div>
                        {villageSearchQuery && (
                          <div className="mt-1.5 flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">
                              {filteredVillages.length > 0 ? (
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  {filteredVillages.length} نتيجة
                                  {selectedVillageIndex >= 0 && (
                                    <span className="text-[#FF9800] mr-1">
                                      {' '}({selectedVillageIndex + 1} محددة)
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                  لا توجد نتائج
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              {filteredVillages.length > 0 && (
                                <span className="text-gray-500 dark:text-gray-400 text-[10px]">
                                  ↑↓ للتنقل • Enter للاختيار
                                </span>
                              )}
                              {filteredVillages.length < villages.length && (
                                <button
                                  onClick={() => {
                                    setVillageSearchQuery('');
                                    setSelectedVillageIndex(-1);
                                  }}
                                  className="text-[#FF9800] hover:text-[#F57C00] dark:text-[#FF9800] dark:hover:text-[#F57C00] font-medium"
                                >
                                  عرض الكل
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {orders
                        .filter(o => selectedOrderIds.includes(o._id))
                        .map(order => {
                          const hasShippingData = order.shippingAddress?.villageName || order.shippingAddress?.city;
                          return (
                            <div key={order._id} className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-slate-700/30">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                                  طلب #{order.orderNumber}
                                </h4>
                                {!hasShippingData && (
                                  <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                                    بدون بيانات شحن
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Shipping Company */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    شركة الشحن
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value="UltraPal"
                                      readOnly
                                      className="input-field text-sm bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                      title="شركة الشحن الحالية - UltraPal"
                                    />
                                    <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                      <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>

                                {/* FIXED: Village Selection with villageId - Same as individual order */}
                                <div className="relative village-search-container">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    القرية <span className="text-red-500">*</span>
                                  </label>
                                  {loadingVillages ? (
                                    // Show loader while villages are loading
                                    <div className="relative">
                                      <input
                                        type="text"
                                        disabled
                                        value="جاري تحميل القرى..."
                                        className="input-field text-sm bg-gray-50 dark:bg-slate-700 cursor-wait"
                                      />
                                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                        <div className="loading-spinner w-4 h-4"></div>
                                      </div>
                                    </div>
                                  ) : filteredVillages.length > 0 ? (
                                    <>
                                      <div className="relative">
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
                                          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <input
                                          type="text"
                                          value={orderVillageSearch[order._id] !== undefined ? orderVillageSearch[order._id] : (shipMultipleVillageId[order._id] || order.shippingAddress?.villageId ? filteredVillages.find(v => v.villageId === (shipMultipleVillageId[order._id] || order.shippingAddress?.villageId))?.villageName || order.shippingAddress?.villageName || '' : '')}
                                          onChange={(e) => {
                                            const newValue = e.target.value;
                                            const currentVillageId = shipMultipleVillageId[order._id] || order.shippingAddress?.villageId;
                                            const currentVillageName = currentVillageId ? filteredVillages.find(v => v.villageId === currentVillageId)?.villageName || order.shippingAddress?.villageName || '' : '';
                                            
                                            setOrderVillageSearch({
                                              ...orderVillageSearch,
                                              [order._id]: newValue
                                            });
                                            setOrderSelectedVillageIndex({
                                              ...orderSelectedVillageIndex,
                                              [order._id]: -1
                                            });
                                            
                                            // If user is typing something different from the current village name, clear the selection
                                            if (newValue !== currentVillageName) {
                                              // Clear the selected village when user starts typing a new search
                                              setShipMultipleVillageId({
                                                ...shipMultipleVillageId,
                                                [order._id]: null
                                              });
                                              setShipMultipleCity({
                                                ...shipMultipleCity,
                                                [order._id]: ''
                                              });
                                            }
                                          }}
                                          onFocus={() => {
                                            if (filteredVillages.length > 0) {
                                              setOrderVillageDropdown({
                                                ...orderVillageDropdown,
                                                [order._id]: true
                                              });
                                            }
                                          }}
                                          onClick={() => {
                                            if (filteredVillages.length > 0) {
                                              setOrderVillageDropdown({
                                                ...orderVillageDropdown,
                                                [order._id]: true
                                              });
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            const searchQuery = orderVillageSearch[order._id] || '';
                                            const orderFiltered = searchQuery.trim() 
                                              ? searchVillages(searchQuery, filteredVillages)
                                              : filteredVillages;
                                            const currentIndex = orderSelectedVillageIndex[order._id] ?? -1;
                                            
                                            if (e.key === 'Escape') {
                                              setOrderVillageDropdown({
                                                ...orderVillageDropdown,
                                                [order._id]: false
                                              });
                                              setOrderVillageSearch({
                                                ...orderVillageSearch,
                                                [order._id]: ''
                                              });
                                              setOrderSelectedVillageIndex({
                                                ...orderSelectedVillageIndex,
                                                [order._id]: -1
                                              });
                                              e.preventDefault();
                                            } else if (e.key === 'Enter' && orderFiltered.length > 0) {
                                              e.preventDefault();
                                              const indexToSelect = currentIndex >= 0 ? currentIndex : 0;
                                              if (orderFiltered[indexToSelect]) {
                                                const village = orderFiltered[indexToSelect];
                                                setShipMultipleVillageId({
                                                  ...shipMultipleVillageId,
                                                  [order._id]: village.villageId
                                                });
                                                setShipMultipleCity({
                                                  ...shipMultipleCity,
                                                  [order._id]: village.villageName
                                                });
                                                setOrderVillageSearch({
                                                  ...orderVillageSearch,
                                                  [order._id]: ''
                                                });
                                                setOrderVillageDropdown({
                                                  ...orderVillageDropdown,
                                                  [order._id]: false
                                                });
                                                setOrderSelectedVillageIndex({
                                                  ...orderSelectedVillageIndex,
                                                  [order._id]: -1
                                                });
                                              }
                                            } else if (e.key === 'ArrowDown' && orderFiltered.length > 0) {
                                              e.preventDefault();
                                              setOrderSelectedVillageIndex({
                                                ...orderSelectedVillageIndex,
                                                [order._id]: currentIndex < orderFiltered.length - 1 ? currentIndex + 1 : 0
                                              });
                                            } else if (e.key === 'ArrowUp' && orderFiltered.length > 0) {
                                              e.preventDefault();
                                              setOrderSelectedVillageIndex({
                                                ...orderSelectedVillageIndex,
                                                [order._id]: currentIndex > 0 ? currentIndex - 1 : orderFiltered.length - 1
                                              });
                                            }
                                          }}
                                          placeholder="ابحث عن القرية أو المحافظة أو ID..."
                                          className="input-field text-sm pr-10"
                                          required
                                        />
                                        {orderVillageSearch[order._id] && (
                                          <button
                                            onClick={() => {
                                              setOrderVillageSearch({
                                                ...orderVillageSearch,
                                                [order._id]: ''
                                              });
                                              setOrderSelectedVillageIndex({
                                                ...orderSelectedVillageIndex,
                                                [order._id]: -1
                                              });
                                            }}
                                            className="absolute inset-y-0 left-0 pl-3 flex items-center hover:bg-gray-100 dark:hover:bg-slate-600 rounded-l-lg transition-colors"
                                            aria-label="مسح البحث"
                                          >
                                            <X className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                                          </button>
                                        )}
                                      </div>
                                      
                                      {/* Dropdown List */}
                                      {orderVillageDropdown[order._id] && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                          {(() => {
                                            const searchQuery = orderVillageSearch[order._id] || '';
                                            const orderFiltered = searchQuery.trim() 
                                              ? searchVillages(searchQuery, filteredVillages)
                                              : filteredVillages;
                                            
                                            if (orderFiltered.length === 0) {
                                              return (
                                                <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                                  لا توجد نتائج
                                                </div>
                                              );
                                            }
                                            
                                            return orderFiltered.map((village, index) => {
                                              const currentIndex = orderSelectedVillageIndex[order._id] ?? -1;
                                              const isSelected = currentIndex === index;
                                              const isCurrentVillage = village.villageId === (shipMultipleVillageId[order._id] || order.shippingAddress?.villageId);
                                              
                                              return (
                                                <div
                                                  key={village.villageId}
                                                  onClick={() => {
                                                    setShipMultipleVillageId({
                                                      ...shipMultipleVillageId,
                                                      [order._id]: village.villageId
                                                    });
                                                    setShipMultipleCity({
                                                      ...shipMultipleCity,
                                                      [order._id]: village.villageName
                                                    });
                                                    setOrderVillageSearch({
                                                      ...orderVillageSearch,
                                                      [order._id]: ''
                                                    });
                                                    setOrderVillageDropdown({
                                                      ...orderVillageDropdown,
                                                      [order._id]: false
                                                    });
                                                    setOrderSelectedVillageIndex({
                                                      ...orderSelectedVillageIndex,
                                                      [order._id]: -1
                                                    });
                                                  }}
                                                  className={`p-3 cursor-pointer text-sm transition-colors ${
                                                    isSelected
                                                      ? 'bg-[#FF9800] text-white'
                                                      : isCurrentVillage
                                                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                      : 'text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-600'
                                                  }`}
                                                >
                                                  <div className="font-medium">{village.villageName}</div>
                                                  <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    ID: {village.villageId}
                                                  </div>
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                      )}
                                      
                                      {order.shippingAddress?.villageId && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                          ℹ️ القرية الحالية محددة من قبل المسوق. يمكنك تغييرها إذا لزم الأمر.
                                        </p>
                                      )}
                                      {orderVillageSearch[order._id] && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                          🔍 عرض {(() => {
                                            const searchQuery = orderVillageSearch[order._id] || '';
                                            const orderFiltered = searchQuery.trim() 
                                              ? searchVillages(searchQuery, filteredVillages)
                                              : filteredVillages;
                                            return orderFiltered.length;
                                          })()} من {filteredVillages.length} قرية بناءً على البحث
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                        <p className="text-xs text-yellow-800 dark:text-yellow-300">
                                          {villages.length === 0 
                                            ? 'لا توجد قرى متاحة'
                                            : villageSearchQuery
                                              ? (
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
                                                )
                                              : (shippingCompany || shipMultipleCompany[order._id] || 'UltraPal')
                                                ? 'لا توجد قرى متاحة لشركة الشحن المختارة. سيتم عرض جميع القرى.'
                                                : 'يرجى اختيار شركة الشحن أولاً'}
                                        </p>
                                      </div>
                                      {order.shippingAddress?.villageId && (
                                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                          <p className="text-xs text-gray-600 dark:text-gray-400">
                                            القرية الحالية: {order.shippingAddress?.villageName || 'غير محدد'} (ID: {order.shippingAddress.villageId})
                                          </p>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>

                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      ملاحظات (اختياري)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="ملاحظات إضافية..."
                      className="input-field"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 space-x-reverse pt-4 border-t border-gray-200 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setShowBulkModal(false);
                        setSelectedAction(null);
                      }}
                      disabled={processing}
                      className="btn-secondary"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        // FIXED: Validate all orders have required data (same as individual order)
                        const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
                        
                        // Validate shipping company
                        const company = 'UltraPal'; // Always UltraPal for now
                        if (!company || !company.trim()) {
                          toast.error('يرجى اختيار شركة الشحن');
                          return;
                        }
                        
                        // Validate villageId for each order
                        const invalidOrders = selectedOrders.filter(order => {
                          const villageId = shipMultipleVillageId[order._id] || order.shippingAddress?.villageId;
                          return !villageId;
                        });

                        if (invalidOrders.length > 0) {
                          toast.error(`يرجى تحديد القرية للطلبات: ${invalidOrders.map(o => o.orderNumber).join(', ')}`);
                          return;
                        }
                        
                        // Validate village exists in filtered list (same as individual order)
                        const invalidVillageOrders = selectedOrders.filter(order => {
                          const villageId = shipMultipleVillageId[order._id] || order.shippingAddress?.villageId;
                          if (!villageId || !company || filteredVillages.length === 0) return false;
                          return !filteredVillages.some(v => v.villageId === villageId);
                        });
                        
                        if (invalidVillageOrders.length > 0) {
                          toast.error(`القرية المختارة غير متاحة لشركة الشحن للطلبات: ${invalidVillageOrders.map(o => o.orderNumber).join(', ')}`);
                          return;
                        }

                        executeBulkAction('ship', {
                          ordersData: selectedOrders.map(order => {
                            // FIXED: Use same logic as validation - check both shipMultipleVillageId and order.shippingAddress?.villageId
                            const villageId = shipMultipleVillageId[order._id] || order.shippingAddress?.villageId;
                            
                            // This should never happen because we validated above, but just in case
                            if (!villageId || villageId === null || villageId === undefined) {
                              // Don't throw, return null and filter it out
                              return null;
                            }
                            
                            // Get city from state or order
                            const city = shipMultipleCity[order._id] || order.shippingAddress?.villageName || order.shippingAddress?.city || '';
                            
                            return {
                              orderId: order._id,
                              shippingCompany: 'UltraPal',
                              city: city,
                              villageId: Number(villageId) // FIXED: Ensure it's a number
                            };
                          }).filter(item => item !== null), // Remove any null items
                          adminNotes
                        });
                      }}
                      disabled={processing}
                      className="btn-primary flex items-center"
                    >
                      {processing ? (
                        <>
                          <div className="loading-spinner w-4 h-4 ml-2"></div>
                          جاري الشحن...
                        </>
                      ) : (
                        <>
                          <Truck className="w-4 h-4 ml-2" />
                          شحن ({selectedCount})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Cancel Action Form */}
              {selectedAction === 'cancel' && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 ml-2 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-300">
                      سيتم إلغاء {selectedCount} طلب. لا يمكن التراجع عن هذا الإجراء.
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      سبب الإلغاء <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="اكتب سبب الإلغاء..."
                      className="input-field"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      ملاحظات (اختياري)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="ملاحظات إضافية..."
                      className="input-field"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                    <button
                      onClick={() => {
                        setShowBulkModal(false);
                        setSelectedAction(null);
                        setReason('');
                        setAdminNotes('');
                      }}
                      disabled={processing}
                      className="btn-secondary"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => executeBulkAction('cancel', {
                        cancellationReason: reason,
                        adminNotes
                      })}
                      disabled={processing || !reason.trim()}
                      className="btn-danger flex items-center"
                    >
                      {processing ? (
                        <>
                          <div className="loading-spinner w-4 h-4 ml-2"></div>
                          جاري الإلغاء...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 ml-2" />
                          إلغاء ({selectedCount})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Return Action Form */}
              {selectedAction === 'return' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-start">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 ml-2 mt-0.5" />
                    <div className="text-sm text-orange-800 dark:text-orange-300">
                      سيتم إرجاع {selectedCount} طلب وسيتم استرداد الأرباح.
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      سبب الإرجاع <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="اكتب سبب الإرجاع..."
                      className="input-field"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      ملاحظات (اختياري)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="ملاحظات إضافية..."
                      className="input-field"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                    <button
                      onClick={() => {
                        setShowBulkModal(false);
                        setSelectedAction(null);
                        setReason('');
                        setAdminNotes('');
                      }}
                      disabled={processing}
                      className="btn-secondary"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => executeBulkAction('return', {
                        returnReason: reason,
                        adminNotes
                      })}
                      disabled={processing || !reason.trim()}
                      className="btn-warning flex items-center"
                    >
                      {processing ? (
                        <>
                          <div className="loading-spinner w-4 h-4 ml-2"></div>
                          جاري الإرجاع...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4 ml-2" />
                          إرجاع ({selectedCount})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Export checkbox component for use in table
export function OrderCheckbox({
  orderId,
  isSelected,
  onToggle
}: {
  orderId: string;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={onToggle}
      onClick={(e) => e.stopPropagation()}
      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
    />
  );
}

// Export select all checkbox component
export function SelectAllCheckbox({
  allSelected,
  onToggle
}: {
  allSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <input
      type="checkbox"
      checked={allSelected}
      onChange={onToggle}
      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
    />
  );
}

