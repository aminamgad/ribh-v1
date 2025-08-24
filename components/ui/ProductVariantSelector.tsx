'use client';

import { useState, useEffect } from 'react';
import { ProductVariant, ProductVariantOption } from '@/types';

interface ProductVariantSelectorProps {
  variants: ProductVariant[];
  variantOptions: ProductVariantOption[];
  onVariantChange: (selectedOptions: Record<string, string>) => void;
  selectedVariants?: Record<string, string>;
  disabled?: boolean;
}

export default function ProductVariantSelector({
  variants,
  variantOptions,
  onVariantChange,
  selectedVariants = {},
  disabled = false
}: ProductVariantSelectorProps) {
  const [localSelectedVariants, setLocalSelectedVariants] = useState<Record<string, string>>(selectedVariants);

  useEffect(() => {
    setLocalSelectedVariants(selectedVariants);
  }, [selectedVariants]);

  const handleVariantChange = (variantName: string, value: string) => {
    const newSelectedVariants = {
      ...localSelectedVariants,
      [variantName]: value
    };
    
    setLocalSelectedVariants(newSelectedVariants);
    onVariantChange(newSelectedVariants);
  };

  const getAvailableOptions = (variantName: string, value: string) => {
    // Check if this combination is available in variantOptions
    return variantOptions.some(option => {
      const optionVariants = option.variantName.split(' - ');
      const hasMatchingVariants = optionVariants.every(opt => {
        const [name, val] = opt.split(': ');
        return !localSelectedVariants[name] || localSelectedVariants[name] === val;
      });
      return hasMatchingVariants && option.stockQuantity > 0;
    });
  };

  const getSelectedVariantOption = () => {
    if (Object.keys(localSelectedVariants).length === 0) return null;
    
    return variantOptions.find(option => {
      const optionVariants = option.variantName.split(' - ');
      return optionVariants.every(opt => {
        const [name, val] = opt.split(': ');
        return localSelectedVariants[name] === val;
      });
    });
  };

  const selectedOption = getSelectedVariantOption();

  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        خيارات المنتج
      </h3>
      
      {variants.map((variant) => (
        <div key={variant._id} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {variant.name}
            {variant.isRequired && <span className="text-red-500 mr-1">*</span>}
          </label>
          
          <div className="flex flex-wrap gap-2">
            {variant.values.map((value) => {
              const isSelected = localSelectedVariants[variant.name] === value;
              const isAvailable = getAvailableOptions(variant.name, value);
              
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => !disabled && handleVariantChange(variant.name, value)}
                  disabled={disabled || !isAvailable}
                  className={`
                    px-3 py-2 rounded-md text-sm font-medium border transition-all duration-200
                    ${isSelected 
                      ? 'bg-primary-600 text-white border-primary-600 shadow-md' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400'
                    }
                    ${!isAvailable 
                      ? 'opacity-50 cursor-not-allowed line-through' 
                      : 'hover:shadow-sm cursor-pointer'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selected Variant Info */}
      {selectedOption && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                الخيار المحدد
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedOption.variantName}
              </p>
            </div>
            <div className="text-right">
              {selectedOption.price && selectedOption.price > 0 && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  +{selectedOption.price.toFixed(2)} ₪
                </p>
              )}
              <p className="text-sm text-gray-500">
                الكمية: {selectedOption.stockQuantity}
              </p>
            </div>
          </div>
          
          {/* Variant Images */}
          {selectedOption.images && selectedOption.images.length > 0 && (
            <div className="mt-3">
              <div className="flex space-x-2 space-x-reverse">
                {selectedOption.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${selectedOption.variantName} - ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-md border border-gray-200 dark:border-gray-600"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stock Warning */}
      {selectedOption && selectedOption.stockQuantity <= 5 && selectedOption.stockQuantity > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ الكمية المتبقية: {selectedOption.stockQuantity} فقط
          </p>
        </div>
      )}

      {selectedOption && selectedOption.stockQuantity === 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            ❌ نفذت الكمية
          </p>
        </div>
      )}
    </div>
  );
}
