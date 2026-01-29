'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Save, Sparkles, Eye, Copy, CheckSquare, Square } from 'lucide-react';
import { ProductVariant, ProductVariantOption } from '@/types';
import Tooltip from './Tooltip';
import toast from 'react-hot-toast';
import { normalizeForSKU, validateAndCleanSKU } from '@/lib/sku-utils';

/**
 * Normalizes text for SKU generation: removes Arabic, converts to uppercase, removes special chars
 * Uses a shorter version for prefix generation (first 5 chars, no hyphens)
 */
function normalizeForSKUPrefix(text: string): string {
  // First normalize using the shared function
  let normalized = normalizeForSKU(text);
  
  // Limit length and take first 5 characters for prefix
  normalized = normalized.substring(0, 5);
  
  // Remove hyphens for prefix (we want compact prefix)
  normalized = normalized.replace(/-/g, '');
  
  // Final validation: ensure only A-Z, 0-9 remain
  normalized = normalized.replace(/[^A-Z0-9]/g, '');
  
  return normalized;
}

// Generate SKU for variant option
const generateVariantSKU = (optionValues: Array<{name: string, value: string}>, index: number): string => {
  // Normalize each value (transliterate Arabic, remove special chars)
  const prefix = optionValues.map(v => {
    const normalized = normalizeForSKUPrefix(v.value);
    // Take first 3 characters, or use full normalized if shorter
    return normalized.substring(0, 3) || 'VAR';
  }).join('-');
  
  const timestamp = Date.now().toString().slice(-6);
  let sku = `VAR-${prefix}-${timestamp}-${index}`;
  
  // Validate and clean SKU to ensure no Arabic characters remain
  sku = validateAndCleanSKU(sku);
  
  // Final validation: ensure SKU contains only A-Z, 0-9, and hyphens
  if (!/^[A-Z0-9-]+$/.test(sku)) {
    // If validation fails, generate a safe fallback
    const hash = Math.random().toString(36).substr(2, 6).toUpperCase();
    sku = `VAR-${hash}-${timestamp}-${index}`;
  }
  
  return sku;
};

interface ProductVariantsProps {
  hasVariants: boolean | null;
  variants: ProductVariant[];
  variantOptions: ProductVariantOption[];
  onVariantsChange: (hasVariants: boolean, variants: ProductVariant[], variantOptions: ProductVariantOption[]) => void;
  marketerPrice?: number; // سعر المنتج الأساسي
}

export default function ProductVariants({ 
  hasVariants, 
  variants, 
  variantOptions, 
  onVariantsChange,
  marketerPrice = 0
}: ProductVariantsProps) {
  const [localHasVariants, setLocalHasVariants] = useState(hasVariants);
  const [localVariants, setLocalVariants] = useState<ProductVariant[]>(variants);
  const [localVariantOptions, setLocalVariantOptions] = useState<ProductVariantOption[]>(variantOptions);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantValues, setNewVariantValues] = useState<Array<{value: string, stockQuantity: number, customPrice: number | undefined}>>([{value: '', stockQuantity: 0, customPrice: undefined}]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState<'price' | 'stock' | null>(null);
  const [bulkValue, setBulkValue] = useState<string>('');
  const [simpleMode, setSimpleMode] = useState(true); // Simple mode by default

  // Removed predefined templates for simplicity

  useEffect(() => {
    setLocalHasVariants(hasVariants);
    setLocalVariants(variants);
    setLocalVariantOptions(variantOptions);
  }, [hasVariants, variants, variantOptions]);

  // Update default price when marketerPrice changes - auto-fill empty prices
  useEffect(() => {
    if (marketerPrice > 0 && newVariantValues.length > 0) {
      // Update empty or zero customPrice fields to use marketerPrice
      setNewVariantValues(prev => prev.map(v => ({
        ...v,
        customPrice: (v.customPrice === undefined || v.customPrice === 0) ? marketerPrice : v.customPrice
      })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketerPrice]);

  const handleHasVariantsChange = (value: boolean) => {
    setLocalHasVariants(value);
    if (!value) {
      setLocalVariants([]);
      setLocalVariantOptions([]);
      onVariantsChange(false, [], []);
    } else {
      onVariantsChange(true, localVariants, localVariantOptions);
    }
  };

  const addVariant = () => {
    if (!newVariantName.trim()) return;
    
    const valueDetails = newVariantValues
      .map(v => ({ value: v.value.trim(), stockQuantity: v.stockQuantity, customPrice: v.customPrice }))
      .filter(v => v.value);
    
    if (valueDetails.length === 0) return;

    const values = valueDetails.map(v => v.value);

    const newVariant: ProductVariant = {
      _id: `variant_${Date.now()}`,
      name: newVariantName.trim(),
      values, // Keep for backward compatibility
      valueDetails, // New structure with price and stock for each value
      isRequired: true,
      order: localVariants.length
    };

    const updatedVariants = [...localVariants, newVariant];
    setLocalVariants(updatedVariants);
    
    // Generate variant options for all combinations
    generateVariantOptions(updatedVariants);
    
    setNewVariantName('');
    // Auto-fill customPrice with marketerPrice
    setNewVariantValues([{value: '', stockQuantity: 0, customPrice: marketerPrice > 0 ? marketerPrice : 0}]);
  };

  const addValueField = () => {
    // Auto-fill customPrice with marketerPrice when adding new value
    setNewVariantValues([...newVariantValues, {value: '', stockQuantity: 0, customPrice: marketerPrice > 0 ? marketerPrice : 0}]);
  };

  const removeValueField = (index: number) => {
    const updated = newVariantValues.filter((_, i) => i !== index);
    // Auto-fill customPrice with marketerPrice
    setNewVariantValues(updated.length > 0 ? updated : [{value: '', stockQuantity: 0, customPrice: marketerPrice > 0 ? marketerPrice : 0}]);
  };

  const updateValueField = (index: number, field: 'value' | 'stockQuantity' | 'customPrice', newValue: string | number | undefined) => {
    const updated = [...newVariantValues];
    if (field === 'value') {
      updated[index] = { ...updated[index], value: newValue as string };
    } else if (field === 'stockQuantity') {
      updated[index] = { ...updated[index], stockQuantity: (newValue as number) || 0 };
    } else if (field === 'customPrice') {
      // Auto-fill with marketerPrice if empty or zero
      const priceValue = newValue !== '' && newValue !== undefined && newValue !== 0 
        ? (newValue as number) 
        : (marketerPrice > 0 ? marketerPrice : 0);
      updated[index] = { ...updated[index], customPrice: priceValue };
    }
    setNewVariantValues(updated);
  };

  const generateVariantOptions = (variantsList: ProductVariant[]) => {
    if (variantsList.length === 0) {
      setLocalVariantOptions([]);
      onVariantsChange(localHasVariants === true, variantsList, []);
      return;
    }

    // Generate all possible combinations
    const generateCombinations = (vars: ProductVariant[], index = 0, current: any = {}): any[] => {
      if (index === vars.length) {
        return [current];
      }

      const results: any[] = [];
      const variant = vars[index];
      
      for (const value of variant.values) {
        const newCurrent = { ...current, [variant.name]: value };
        results.push(...generateCombinations(vars, index + 1, newCurrent));
      }
      
      return results;
    };

    const combinations = generateCombinations(variantsList);
    const newVariantOptions: ProductVariantOption[] = combinations.map((combo, index) => {
      const optionValues = Object.entries(combo).map(([name, value]) => ({ name, value: value as string }));
      
      // Find price and stock from valueDetails for each value in the combination
      // Use the first variant's price as the base price (not additional)
      let basePrice: number | undefined = undefined;
      let minStock = Infinity;
      
      optionValues.forEach(({ name, value }) => {
        const variant = variantsList.find(v => v.name === name);
        if (variant?.valueDetails) {
          const valueDetail = variant.valueDetails.find(vd => vd.value === value);
          if (valueDetail) {
            // Use customPrice as the full price (not additional)
            if (valueDetail.customPrice !== undefined && basePrice === undefined) {
              basePrice = valueDetail.customPrice;
            }
            if (valueDetail.stockQuantity !== undefined) {
              minStock = Math.min(minStock, valueDetail.stockQuantity);
            }
          }
        }
      });
      
      // Generate SKU automatically
      const sku = generateVariantSKU(optionValues, index);
      
      // Use marketerPrice as default if no custom price is set
      const finalPrice = basePrice !== undefined ? basePrice : (marketerPrice > 0 ? marketerPrice : undefined);
      
      return {
        variantId: `option_${Date.now()}_${index}`,
        variantName: optionValues.map(v => `${v.name}: ${v.value}`).join(' - '),
        value: optionValues.map(v => v.value).join(' - '),
        price: finalPrice, // Full price, defaults to marketerPrice if no custom price
        stockQuantity: minStock !== Infinity ? minStock : 0,
        sku: sku,
        images: []
      };
    });

    setLocalVariantOptions(newVariantOptions);
    onVariantsChange(localHasVariants === true, variantsList, newVariantOptions);
  };

  const removeVariant = (variantId: string) => {
    const updatedVariants = localVariants.filter(v => v._id !== variantId);
    setLocalVariants(updatedVariants);
    generateVariantOptions(updatedVariants);
  };

  const updateVariantOption = (optionId: string, field: keyof ProductVariantOption, value: any) => {
    const updatedOptions = localVariantOptions.map(option => 
      option.variantId === optionId ? { ...option, [field]: value } : option
    );
    setLocalVariantOptions(updatedOptions);
    onVariantsChange(localHasVariants === true, localVariants, updatedOptions);
  };

  const removeVariantOption = (optionId: string) => {
    const updatedOptions = localVariantOptions.filter(option => option.variantId !== optionId);
    setLocalVariantOptions(updatedOptions);
    onVariantsChange(localHasVariants === true, localVariants, updatedOptions);
  };

  // Bulk operations
  const toggleSelectOption = (optionId: string) => {
    setSelectedOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        newSet.add(optionId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedOptions.size === localVariantOptions.length) {
      setSelectedOptions(new Set());
    } else {
      setSelectedOptions(new Set(localVariantOptions.map(opt => opt.variantId)));
    }
  };

  const applyBulkEdit = () => {
    if (!bulkEditMode || !bulkValue || selectedOptions.size === 0) return;
    
    const updatedOptions = localVariantOptions.map(option => {
      if (selectedOptions.has(option.variantId)) {
        if (bulkEditMode === 'price') {
          return { ...option, price: parseFloat(bulkValue) || undefined };
        } else if (bulkEditMode === 'stock') {
          return { ...option, stockQuantity: parseInt(bulkValue) || 0 };
        }
      }
      return option;
    });
    
    setLocalVariantOptions(updatedOptions);
    onVariantsChange(localHasVariants === true, localVariants, updatedOptions);
    setBulkEditMode(null);
    setBulkValue('');
    setSelectedOptions(new Set());
    toast.success(`تم تحديث ${selectedOptions.size} خيار بنجاح`);
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Variants */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
            هل هناك متغيرات للمنتج؟
          </p>
          <Tooltip 
            content="المتغيرات تسمح لك بإنشاء خيارات متعددة للمنتج مثل الألوان والأحجام. سيتم توليد جميع التركيبات الممكنة تلقائياً."
            icon
          />
        </div>
        
        {/* Improved Radio Buttons as Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Yes Option */}
          <label 
            className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              localHasVariants === true
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-lg scale-105'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <input
              type="radio"
              name="hasVariants"
              checked={localHasVariants === true}
              onChange={() => handleHasVariantsChange(true)}
              className="sr-only"
            />
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              localHasVariants === true
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}>
              <CheckSquare className="w-6 h-6" />
            </div>
            <span className={`text-lg font-bold mb-2 ${
              localHasVariants === true
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              نعم
            </span>
            <p className={`text-xs text-center ${
              localHasVariants === true
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              المنتج له متغيرات مثل الألوان أو الأحجام
            </p>
            {localHasVariants === true && (
              <div className="absolute top-2 left-2">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </label>

          {/* No Option */}
          <label 
            className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              localHasVariants === false
                ? 'border-gray-500 bg-gray-50 dark:bg-gray-800 shadow-lg scale-105'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <input
              type="radio"
              name="hasVariants"
              checked={localHasVariants === false}
              onChange={() => handleHasVariantsChange(false)}
              className="sr-only"
            />
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              localHasVariants === false
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}>
              <Square className="w-6 h-6" />
            </div>
            <span className={`text-lg font-bold mb-2 ${
              localHasVariants === false
                ? 'text-gray-700 dark:text-gray-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              لا
            </span>
            <p className={`text-xs text-center ${
              localHasVariants === false
                ? 'text-gray-600 dark:text-gray-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              المنتج بدون متغيرات - منتج واحد فقط
            </p>
            {localHasVariants === false && (
              <div className="absolute top-2 left-2">
                <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </label>
        </div>

        {/* Simplified Help Text */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>نصيحة:</strong> المتغيرات مثل الألوان أو الأحجام. سيتم إنشاء جميع التركيبات تلقائياً.
          </p>
        </div>
      </div>

      {localHasVariants === true && (
        <div className="space-y-6">
          {/* Simple Summary - Always Visible */}
          {localVariants.length > 0 && (
            <div className="card bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-green-900 dark:text-green-100 mb-1">
                    ملخص المتغيرات
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-300">
                    {localVariants.length} متغير • {localVariantOptions.length} خيار • 
                    إجمالي المخزون: {localVariantOptions.reduce((sum, opt) => sum + (opt.stockQuantity || 0), 0)} قطعة
                  </p>
                </div>
                {localVariantOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'إخفاء' : 'عرض'} التفاصيل
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Add New Variant */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              إضافة متغير جديد
            </h3>
            
            <div className="mb-4">
              {/* Simplified Custom Variant */}
              <div className="space-y-4">
                {/* Variant Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم المتغير
                  </label>
                  <input
                    type="text"
                    value={newVariantName}
                    onChange={(e) => setNewVariantName(e.target.value)}
                    placeholder="مثل: اللون، الحجم، المادة"
                    className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[48px]"
                  />
                </div>
                
                {/* Value Fields - Simplified */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    قيم المتغير
                  </label>
                  {newVariantValues.map((valueItem, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={valueItem.value}
                          onChange={(e) => updateValueField(index, 'value', e.target.value)}
                          placeholder={`اسم القيمة ${index + 1}`}
                          className="flex-1 px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[48px]"
                        />
                        {newVariantValues.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeValueField(index)}
                            className="p-3 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-h-[48px]"
                            title="حذف القيمة"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            الكمية
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={valueItem.stockQuantity}
                            onChange={(e) => updateValueField(index, 'stockQuantity', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[48px]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            السعر (₪)
                            {marketerPrice > 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                                (افتراضي: {marketerPrice.toFixed(2)})
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valueItem.customPrice || marketerPrice || ''}
                            onChange={(e) => updateValueField(index, 'customPrice', e.target.value ? parseFloat(e.target.value) : (marketerPrice > 0 ? marketerPrice : 0))}
                            placeholder={marketerPrice > 0 ? marketerPrice.toFixed(2) : "السعر"}
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[48px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addValueField}
                    className="w-full px-4 py-3 text-base border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <Plus className="w-5 h-5" />
                    إضافة قيمة جديدة
                  </button>
                </div>

                {newVariantName && newVariantValues.some(v => v.value.trim()) && (
                  <button
                    onClick={addVariant}
                    className="w-full px-6 py-3 text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 font-medium min-h-[48px]"
                  >
                    إضافة المتغير
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Current Variants */}
          {localVariants.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                المتغيرات المضافة
              </h3>
              
              <div className="space-y-4">
                {localVariants.map((variant) => {
                  const isEditing = editingVariant === variant._id;
                  const variantValues = variant.valueDetails || variant.values.map(v => ({value: v, stockQuantity: 0, customPrice: undefined}));
                  
                  return (
                    <div key={variant._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {variant.name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingVariant(null);
                                // Regenerate variant options after editing
                                generateVariantOptions(localVariants);
                              } else {
                                setEditingVariant(variant._id);
                              }
                            }}
                            className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                            title={isEditing ? "حفظ التعديلات" : "تعديل المتغير"}
                          >
                            {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => removeVariant(variant._id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="حذف المتغير"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {variantValues.map((valueItem: any, index: number) => {
                          const value = valueItem.value || valueItem;
                          const valueDetail = variant.valueDetails?.find((vd: any) => vd.value === value) || valueItem;
                          
                          if (isEditing) {
                            return (
                              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md space-y-2">
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => {
                                    const updatedVariants = localVariants.map(v => {
                                      if (v._id === variant._id) {
                                        const updatedValueDetails = (v.valueDetails || v.values.map(val => ({value: val, stockQuantity: 0, customPrice: undefined}))).map((vd: any, idx: number) => 
                                          idx === index ? {...vd, value: e.target.value} : vd
                                        );
                                        return {
                                          ...v,
                                          valueDetails: updatedValueDetails,
                                          values: updatedValueDetails.map((vd: any) => vd.value)
                                        };
                                      }
                                      return v;
                                    });
                                    setLocalVariants(updatedVariants);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">الكمية</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={valueDetail.stockQuantity || 0}
                                      onChange={(e) => {
                                        const updatedVariants = localVariants.map(v => {
                                          if (v._id === variant._id) {
                                            const updatedValueDetails = (v.valueDetails || v.values.map(val => ({value: val, stockQuantity: 0, customPrice: undefined}))).map((vd: any, idx: number) => 
                                              idx === index ? {...vd, stockQuantity: parseInt(e.target.value) || 0} : vd
                                            );
                                            return {
                                              ...v,
                                              valueDetails: updatedValueDetails
                                            };
                                          }
                                          return v;
                                        });
                                        setLocalVariants(updatedVariants);
                                      }}
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">السعر (₪)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={valueDetail.customPrice || ''}
                                      onChange={(e) => {
                                        const updatedVariants = localVariants.map(v => {
                                          if (v._id === variant._id) {
                                            const updatedValueDetails = (v.valueDetails || v.values.map(val => ({value: val, stockQuantity: 0, customPrice: undefined}))).map((vd: any, idx: number) => 
                                              idx === index ? {...vd, customPrice: e.target.value ? parseFloat(e.target.value) : undefined} : vd
                                            );
                                            return {
                                              ...v,
                                              valueDetails: updatedValueDetails
                                            };
                                          }
                                          return v;
                                        });
                                        setLocalVariants(updatedVariants);
                                      }}
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium">
                                {value}
                              </span>
                              <div className="flex items-center gap-4 text-xs">
                                {valueDetail?.stockQuantity !== undefined && valueDetail.stockQuantity > 0 && (
                                  <span className="text-gray-600 dark:text-gray-400">
                                    الكمية: <span className="font-medium text-gray-900 dark:text-gray-100">{valueDetail.stockQuantity}</span>
                                  </span>
                                )}
                                {valueDetail?.customPrice !== undefined && (
                                  <span className="text-gray-600 dark:text-gray-400">
                                    السعر: <span className="font-medium text-gray-900 dark:text-gray-100">{valueDetail.customPrice} ₪</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Preview */}
          {showPreview && localVariantOptions.length > 0 && (
            <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                معاينة سريعة للخيارات
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {localVariantOptions.slice(0, 9).map((option, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{option.variantName}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">السعر:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {option.price ? `${option.price.toFixed(2)} ₪` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-gray-600 dark:text-gray-400">الكمية:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{option.stockQuantity}</span>
                    </div>
                  </div>
                ))}
                {localVariantOptions.length > 9 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700 flex items-center justify-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      +{localVariantOptions.length - 9} خيارات أخرى
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Variant Options */}
          {localVariantOptions.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  خيارات المتغيرات ({localVariantOptions.length} خيار)
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSimpleMode(!simpleMode)}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {simpleMode ? 'عرض الخيارات المتقدمة' : 'الوضع البسيط'}
                  </button>
                  {!simpleMode && selectedOptions.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedOptions.size} محدد
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkEditMode(bulkEditMode === 'price' ? null : 'price');
                          setBulkValue('');
                        }}
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        تعديل السعر
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkEditMode(bulkEditMode === 'stock' ? null : 'stock');
                          setBulkValue('');
                        }}
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        تعديل الكمية
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bulk Edit Bar - Hidden in Simple Mode */}
              {!simpleMode && bulkEditMode && selectedOptions.size > 0 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      تعديل {bulkEditMode === 'price' ? 'السعر' : 'الكمية'} لـ {selectedOptions.size} خيار:
                    </span>
                    <input
                      type="number"
                      step={bulkEditMode === 'price' ? '0.01' : '1'}
                      min="0"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      placeholder={bulkEditMode === 'price' ? 'السعر (₪)' : 'الكمية'}
                      className="input-field text-sm min-h-[36px] w-32"
                    />
                    <button
                      type="button"
                      onClick={applyBulkEdit}
                      className="btn-primary text-xs px-4 py-2"
                    >
                      تطبيق
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkEditMode(null);
                        setBulkValue('');
                      }}
                      className="btn-secondary text-xs px-4 py-2"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
              
              {/* Simple View - Show only essential info */}
              {simpleMode ? (
                <div className="space-y-3">
                  {localVariantOptions.map((option) => (
                    <div key={option.variantId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {option.variantName}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">السعر (₪)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={option.price || ''}
                            onChange={(e) => updateVariantOption(option.variantId, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">الكمية</label>
                          <input
                            type="number"
                            value={option.stockQuantity}
                            onChange={(e) => updateVariantOption(option.variantId, 'stockQuantity', parseInt(e.target.value) || 0)}
                            min="0"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100 w-12">
                          <button
                            type="button"
                            onClick={selectAll}
                            className="hover:text-primary-600 dark:hover:text-primary-400"
                          >
                            {selectedOptions.size === localVariantOptions.length ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          الخيار
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          السعر الكامل (₪)
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          الكمية المتوفرة
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          رمز المنتج (SKU)
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {localVariantOptions.map((option) => {
                        const isSelected = selectedOptions.has(option.variantId);
                        return (
                          <tr 
                            key={option.variantId} 
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => toggleSelectOption(option.variantId)}
                                className="hover:text-primary-600 dark:hover:text-primary-400"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {option.variantName}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={option.price || ''}
                                onChange={(e) => updateVariantOption(option.variantId, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="السعر الكامل"
                                className={`w-28 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                  isSelected ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600'
                                }`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={option.stockQuantity}
                                onChange={(e) => updateVariantOption(option.variantId, 'stockQuantity', parseInt(e.target.value) || 0)}
                                min="0"
                                className={`w-24 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                  isSelected ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600'
                                }`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                {option.sku || 'قيد التوليد...'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => removeVariantOption(option.variantId)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                title="حذف الخيار"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
