'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Printer, 
  X, 
  RotateCcw,
  XCircle,
  AlertCircle,
  Save
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
    fullName?: string;
    phone?: string;
  };
  shippingCompany?: string;
  trackingNumber?: string;
}

interface BulkOrdersActionsProps {
  orders: Order[];
  selectedOrderIds: string[];
  onSelectionChange: (orderIds: string[]) => void;
  onBulkUpdate: (action: string, data?: any) => Promise<void>;
  onBulkPrint?: (orderIds: string[]) => void;
  isLoading?: boolean;
  user?: { role?: string };
}

export default function BulkOrdersActions({
  orders,
  selectedOrderIds,
  onSelectionChange,
  onBulkUpdate,
  onBulkPrint,
  isLoading = false,
  user
}: BulkOrdersActionsProps) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Ship modal state
  const [shippingCompany, setShippingCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipMultipleTracking, setShipMultipleTracking] = useState<Record<string, string>>({});
  const [shipMultipleCompany, setShipMultipleCompany] = useState<Record<string, string>>({});
  const [shipMultipleCity, setShipMultipleCity] = useState<Record<string, string>>({});
  const [shippingCompanies, setShippingCompanies] = useState<Array<{
    _id: string; 
    companyName: string;
    shippingCities?: Array<{cityName: string; cityCode?: string; isActive: boolean}>;
    shippingRegions?: Array<{regionName: string; regionCode?: string; cities: string[]; isActive: boolean}>;
  }>>([]);
  const [villages, setVillages] = useState<Array<{villageId: number; villageName: string}>>([]);
  const [companyCities, setCompanyCities] = useState<Record<string, string[]>>({}); // Map company ID to cities
  
  // Cancel/Return modal state
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch shipping companies and villages when ship modal opens
  useEffect(() => {
    if (showBulkModal && (selectedAction === 'ship' || selectedAction === 'update-shipping')) {
      fetchShippingCompanies().then((loadedCompanies) => {
        const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
        
        // Initialize company data from existing orders
        const initialCompany: Record<string, string> = {};
        selectedOrders.forEach(order => {
          if (order.shippingCompany) {
            initialCompany[order._id] = order.shippingCompany;
          }
        });
        
        // If no existing companies found and only one company exists, use it
        if (Object.keys(initialCompany).length === 0 && loadedCompanies.length === 1) {
          selectedOrderIds.forEach(id => {
            initialCompany[id] = loadedCompanies[0].companyName;
          });
        }
        
        if (Object.keys(initialCompany).length > 0) {
          setShipMultipleCompany(initialCompany);
        }
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
      const response = await fetch('/api/admin/external-companies');
      if (response.ok) {
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
      }
    } catch (error) {
      console.error('Error fetching shipping companies:', error);
    }
    return [];
  };

  const fetchVillages = async () => {
    try {
      const response = await fetch('/api/villages?limit=1000');
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const sortedVillages = data.data
            .filter((v: any) => v.isActive !== false)
            .sort((a: any, b: any) => a.villageName.localeCompare(b.villageName, 'ar'))
            .map((v: any) => ({ villageId: v.villageId, villageName: v.villageName }));
          setVillages(sortedVillages);
        }
      }
    } catch (error) {
      console.error('Error fetching villages:', error);
    }
  };

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
      if (action === 'update-shipping') {
        if (additionalData?.ordersData && Array.isArray(additionalData.ordersData)) {
          const updatePromises = additionalData.ordersData.map((orderData: any) => {
            return onBulkUpdate('update-shipping', {
              orderIds: [orderData.orderId],
              shippingCompany: orderData.shippingCompany,
              shippingCity: orderData.city,
              trackingNumber: orderData.trackingNumber,
              updateShippingOnly: true
            });
          });
          
          await Promise.all(updatePromises);
          toast.success(`تم تحديث معلومات الشحن لـ ${selectedCount} طلب بنجاح`);
        } else {
          toast.error('بيانات الطلبات غير صحيحة');
        }
        // Reset selection after successful action
        onSelectionChange([]);
        setShowBulkModal(false);
        setSelectedAction(null);
        setShippingCompany('');
        setTrackingNumber('');
        setShipMultipleTracking({});
        setShipMultipleCompany({});
        setShipMultipleCity({});
        setReason('');
        setAdminNotes('');
        return;
      }
      
      // For ship action, handle each order with its specific data
      if (action === 'ship') {
        if (additionalData?.ordersData && Array.isArray(additionalData.ordersData)) {
          // New format: each order has its own shipping company, city, and tracking
          const shipPromises = additionalData.ordersData.map((orderData: any) => {
            return onBulkUpdate(action, {
              orderIds: [orderData.orderId],
              trackingNumber: orderData.trackingNumber,
              shippingCompany: orderData.shippingCompany,
              shippingCity: orderData.city,
              adminNotes: additionalData.adminNotes
            });
          });
          
          await Promise.all(shipPromises);
          toast.success(`تم شحن ${selectedCount} طلب بنجاح`);
        } else {
          // Legacy format for single order or backward compatibility
          const shipPromises = selectedOrderIds.map((orderId, index) => {
            const tracking = shipMultipleTracking[orderId] || trackingNumber;
            const company = shipMultipleCompany[orderId] || shippingCompany;
            const city = shipMultipleCity[orderId];
            return onBulkUpdate(action, {
              orderIds: [orderId],
              trackingNumber: tracking || `${trackingNumber}-${index + 1}`,
              shippingCompany: company,
              shippingCity: city,
              adminNotes: additionalData?.adminNotes
            });
          });
          
          await Promise.all(shipPromises);
          toast.success(`تم شحن ${selectedCount} طلب بنجاح`);
        }
        // Reset selection after successful action
        onSelectionChange([]);
        setShowBulkModal(false);
        setSelectedAction(null);
        setShippingCompany('');
        setTrackingNumber('');
        setShipMultipleTracking({});
        setShipMultipleCompany({});
        setShipMultipleCity({});
        setReason('');
        setAdminNotes('');
        return;
      } else {
        await onBulkUpdate(action, {
          orderIds: selectedOrderIds,
          ...actionData
        });
        
        const actionMessages: Record<string, string> = {
          confirm: 'تم تأكيد',
          process: 'تمت معالجة',
          ship: 'تم شحن',
          deliver: 'تم توصيل',
          cancel: 'تم إلغاء',
          return: 'تم إرجاع'
        };
        
        toast.success(`${actionMessages[action] || 'تم تحديث'} ${selectedCount} طلب بنجاح`);
      }

      // Reset selection after successful action
      onSelectionChange([]);
      setShowBulkModal(false);
      setSelectedAction(null);
      setShippingCompany('');
      setTrackingNumber('');
      setShipMultipleTracking({});
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
                    setTrackingNumber('');
                    setShipMultipleTracking({});
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
                          const currentCompany = shipMultipleCompany[order._id] || order.shippingCompany || '';
                          const currentCity = shipMultipleCity[order._id] || order.shippingAddress?.villageName || order.shippingAddress?.city || '';
                          const currentTracking = shipMultipleTracking[order._id] || order.trackingNumber || '';
                          
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
                                      className="input-field text-sm"
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
                                      className="input-field text-sm"
                                      required
                                    />
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
                                    } else if (villages.length > 0) {
                                      // Fallback to villages if no company cities
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
                                          {villages.map((village) => (
                                            <option key={village.villageId} value={village.villageName}>
                                              {village.villageName}
                                            </option>
                                          ))}
                                        </select>
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

                                {/* Tracking Number */}
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    رقم التتبع
                                  </label>
                                  <input
                                    type="text"
                                    value={currentTracking}
                                    onChange={(e) => setShipMultipleTracking({
                                      ...shipMultipleTracking,
                                      [order._id]: e.target.value
                                    })}
                                    placeholder="رقم التتبع (اختياري)"
                                    className="input-field text-sm"
                                  />
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
                        // Validate all orders have required data
                        const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
                        const invalidOrders = selectedOrders.filter(order => 
                          !shipMultipleCompany[order._id] || 
                          !shipMultipleCity[order._id]
                        );

                        if (invalidOrders.length > 0) {
                          toast.error(`يرجى ملء جميع الحقول المطلوبة للطلبات: ${invalidOrders.map(o => o.orderNumber).join(', ')}`);
                          return;
                        }

                        executeBulkAction('update-shipping', {
                          ordersData: selectedOrders.map(order => ({
                            orderId: order._id,
                            shippingCompany: shipMultipleCompany[order._id],
                            city: shipMultipleCity[order._id],
                            trackingNumber: shipMultipleTracking[order._id] || ''
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
                                    شركة الشحن <span className="text-red-500">*</span>
                                  </label>
                                  {shippingCompanies.length > 0 ? (
                                    <select
                                      value={shipMultipleCompany[order._id] || ''}
                                      onChange={(e) => {
                                        const newCompany = e.target.value;
                                        setShipMultipleCompany({
                                          ...shipMultipleCompany,
                                          [order._id]: newCompany
                                        });
                                        // Clear city when company changes
                                        if (shipMultipleCompany[order._id] !== newCompany) {
                                          setShipMultipleCity({
                                            ...shipMultipleCity,
                                            [order._id]: ''
                                          });
                                        }
                                      }}
                                      className="input-field text-sm"
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
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                                      <p className="text-xs text-yellow-800 dark:text-yellow-300">
                                        لا توجد شركات شحن مع integration
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* City/Village */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    المدينة <span className="text-red-500">*</span>
                                  </label>
                                  {villages.length > 0 ? (
                                    <select
                                      value={shipMultipleCity[order._id] || order.shippingAddress?.villageName || order.shippingAddress?.city || ''}
                                      onChange={(e) => setShipMultipleCity({
                                        ...shipMultipleCity,
                                        [order._id]: e.target.value
                                      })}
                                      className="input-field text-sm"
                                      required
                                    >
                                      <option value="">اختر المدينة</option>
                                      {villages.map((village) => (
                                        <option key={village.villageId} value={village.villageName}>
                                          {village.villageName}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={shipMultipleCity[order._id] || order.shippingAddress?.villageName || order.shippingAddress?.city || ''}
                                      onChange={(e) => setShipMultipleCity({
                                        ...shipMultipleCity,
                                        [order._id]: e.target.value
                                      })}
                                      placeholder="اسم المدينة"
                                      className="input-field text-sm"
                                      required
                                    />
                                  )}
                                </div>

                                {/* Tracking Number */}
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    رقم التتبع (اختياري)
                                  </label>
                                  <input
                                    type="text"
                                    value={shipMultipleTracking[order._id] || ''}
                                    onChange={(e) => setShipMultipleTracking({
                                      ...shipMultipleTracking,
                                      [order._id]: e.target.value
                                    })}
                                    placeholder="رقم التتبع (اختياري)"
                                    className="input-field text-sm"
                                  />
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
                        // Validate all orders have required data
                        const selectedOrders = orders.filter(o => selectedOrderIds.includes(o._id));
                        const invalidOrders = selectedOrders.filter(order => 
                          !shipMultipleCompany[order._id] || 
                          !shipMultipleCity[order._id]
                        );

                        if (invalidOrders.length > 0) {
                          toast.error(`يرجى ملء جميع الحقول المطلوبة للطلبات: ${invalidOrders.map(o => o.orderNumber).join(', ')}`);
                          return;
                        }

                        executeBulkAction('ship', {
                          ordersData: selectedOrders.map(order => ({
                            orderId: order._id,
                            shippingCompany: shipMultipleCompany[order._id],
                            city: shipMultipleCity[order._id],
                            trackingNumber: shipMultipleTracking[order._id]
                          })),
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

