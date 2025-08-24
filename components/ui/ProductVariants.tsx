'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import { ProductVariant, ProductVariantOption } from '@/types';
import MediaUpload from './MediaUpload';

interface ProductVariantsProps {
  hasVariants: boolean;
  variants: ProductVariant[];
  variantOptions: ProductVariantOption[];
  onVariantsChange: (hasVariants: boolean, variants: ProductVariant[], variantOptions: ProductVariantOption[]) => void;
}

const PREDEFINED_VARIANTS = [
  { name: 'اللون', values: ['أحمر', 'أزرق', 'أخضر', 'أصفر', 'أسود', 'أبيض', 'رمادي', 'بني', 'برتقالي', 'بنفسجي'] },
  { name: 'المقاس', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
  { name: 'المادة', values: ['قطن', 'بوليستر', 'حرير', 'صوف', 'جلد', 'بلاستيك', 'معدن', 'خشب'] },
  { name: 'النمط', values: ['كلاسيكي', 'عصري', 'رياضي', 'أنيق', 'كاجوال', 'رسمي'] }
];

export default function ProductVariants({ 
  hasVariants, 
  variants, 
  variantOptions, 
  onVariantsChange 
}: ProductVariantsProps) {
  const [localHasVariants, setLocalHasVariants] = useState(hasVariants);
  const [localVariants, setLocalVariants] = useState<ProductVariant[]>(variants);
  const [localVariantOptions, setLocalVariantOptions] = useState<ProductVariantOption[]>(variantOptions);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantValues, setNewVariantValues] = useState('');
  const [selectedPredefinedVariant, setSelectedPredefinedVariant] = useState('');

  useEffect(() => {
    setLocalHasVariants(hasVariants);
    setLocalVariants(variants);
    setLocalVariantOptions(variantOptions);
  }, [hasVariants, variants, variantOptions]);

  const handleHasVariantsChange = (checked: boolean) => {
    setLocalHasVariants(checked);
    if (!checked) {
      setLocalVariants([]);
      setLocalVariantOptions([]);
      onVariantsChange(false, [], []);
    } else {
      onVariantsChange(true, localVariants, localVariantOptions);
    }
  };

  const addVariant = () => {
    if (!newVariantName.trim()) return;
    
    const values = newVariantValues.split(',').map(v => v.trim()).filter(v => v);
    if (values.length === 0) return;

    const newVariant: ProductVariant = {
      _id: `variant_${Date.now()}`,
      name: newVariantName.trim(),
      values,
      isRequired: true,
      order: localVariants.length
    };

    const updatedVariants = [...localVariants, newVariant];
    setLocalVariants(updatedVariants);
    
    // Generate variant options for all combinations
    generateVariantOptions(updatedVariants);
    
    setNewVariantName('');
    setNewVariantValues('');
  };

  const addPredefinedVariant = () => {
    if (!selectedPredefinedVariant) return;
    
    const predefined = PREDEFINED_VARIANTS.find(v => v.name === selectedPredefinedVariant);
    if (!predefined) return;

    const newVariant: ProductVariant = {
      _id: `variant_${Date.now()}`,
      name: predefined.name,
      values: predefined.values,
      isRequired: true,
      order: localVariants.length
    };

    const updatedVariants = [...localVariants, newVariant];
    setLocalVariants(updatedVariants);
    
    // Generate variant options for all combinations
    generateVariantOptions(updatedVariants);
    
    setSelectedPredefinedVariant('');
  };

  const generateVariantOptions = (variantsList: ProductVariant[]) => {
    if (variantsList.length === 0) {
      setLocalVariantOptions([]);
      onVariantsChange(localHasVariants, variantsList, []);
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
      
      return {
        variantId: `option_${Date.now()}_${index}`,
        variantName: optionValues.map(v => `${v.name}: ${v.value}`).join(' - '),
        value: optionValues.map(v => v.value).join(' - '),
        price: undefined,
        stockQuantity: 0,
        sku: '',
        images: []
      };
    });

    setLocalVariantOptions(newVariantOptions);
    onVariantsChange(localHasVariants, variantsList, newVariantOptions);
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
    onVariantsChange(localHasVariants, localVariants, updatedOptions);
  };

  const removeVariantOption = (optionId: string) => {
    const updatedOptions = localVariantOptions.filter(option => option.variantId !== optionId);
    setLocalVariantOptions(updatedOptions);
    onVariantsChange(localHasVariants, localVariants, updatedOptions);
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Variants */}
      <div className="flex items-center space-x-3 space-x-reverse">
        <input
          type="checkbox"
          id="hasVariants"
          checked={localHasVariants}
          onChange={(e) => handleHasVariantsChange(e.target.checked)}
          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
        />
        <label htmlFor="hasVariants" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          إضافة متغيرات للمنتج (لون، مقاس، إلخ)
        </label>
      </div>

      {localHasVariants && (
        <div className="space-y-6">
          {/* Add New Variant */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              إضافة متغير جديد
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Predefined Variants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  متغيرات جاهزة
                </label>
                <select
                  value={selectedPredefinedVariant}
                  onChange={(e) => setSelectedPredefinedVariant(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">اختر متغير جاهز</option>
                  {PREDEFINED_VARIANTS.map(variant => (
                    <option key={variant.name} value={variant.name}>
                      {variant.name}
                    </option>
                  ))}
                </select>
                {selectedPredefinedVariant && (
                  <button
                    onClick={addPredefinedVariant}
                    className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    إضافة
                  </button>
                )}
              </div>

              {/* Custom Variant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  متغير مخصص
                </label>
                <input
                  type="text"
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  placeholder="اسم المتغير (مثل: النمط)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  value={newVariantValues}
                  onChange={(e) => setNewVariantValues(e.target.value)}
                  placeholder="القيم مفصولة بفواصل (مثل: كلاسيكي، عصري، رياضي)"
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {newVariantName && newVariantValues && (
                  <button
                    onClick={addVariant}
                    className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    إضافة
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
                {localVariants.map((variant) => (
                  <div key={variant._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {variant.name}
                      </h4>
                      <button
                        onClick={() => removeVariant(variant._id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {variant.values.map((value, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variant Options */}
          {localVariantOptions.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                خيارات المتغيرات ({localVariantOptions.length} خيار)
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        الخيار
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        السعر الإضافي
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        الكمية المتوفرة
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        رمز المنتج
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        الصور
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        إجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {localVariantOptions.map((option) => (
                      <tr key={option.variantId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {option.variantName}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={option.price || ''}
                            onChange={(e) => updateVariantOption(option.variantId, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="0"
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={option.stockQuantity}
                            onChange={(e) => updateVariantOption(option.variantId, 'stockQuantity', parseInt(e.target.value) || 0)}
                            min="0"
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={option.sku || ''}
                            onChange={(e) => updateVariantOption(option.variantId, 'sku', e.target.value)}
                            placeholder="SKU"
                            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <span className="text-sm text-gray-500">
                              {option.images?.length || 0} صور
                            </span>
                            <button
                              onClick={() => {/* TODO: Add image upload modal */}}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeVariantOption(option.variantId)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
