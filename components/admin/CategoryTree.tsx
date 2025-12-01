'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Image as ImageIcon, Package, Edit, Trash2, Eye, EyeOff, Star } from 'lucide-react';
import LazyImage from '@/components/ui/LazyImage';

interface Category {
  _id: string;
  name: string;
  nameEn?: string;
  description?: string;
  image?: string;
  images?: string[];
  icon?: string;
  parentId?: string;
  isActive: boolean;
  featured?: boolean;
  order: number;
  slug?: string;
  productCount?: number;
  level?: number;
  showInMenu?: boolean;
  showInHome?: boolean;
  subcategories?: Category[];
}

interface CategoryTreeProps {
  categories: Category[];
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  onToggleActive?: (category: Category) => void;
  onToggleFeatured?: (category: Category) => void;
  expandedCategories?: Set<string>;
  onToggleExpand?: (categoryId: string) => void;
}

export default function CategoryTree({
  categories,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleFeatured,
  expandedCategories = new Set(),
  onToggleExpand
}: CategoryTreeProps) {
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(expandedCategories);

  const toggleExpand = (categoryId: string) => {
    if (onToggleExpand) {
      onToggleExpand(categoryId);
    } else {
      setLocalExpanded(prev => {
        const newSet = new Set(prev);
        if (newSet.has(categoryId)) {
          newSet.delete(categoryId);
        } else {
          newSet.add(categoryId);
        }
        return newSet;
      });
    }
  };

  const isExpanded = (categoryId: string) => {
    return onToggleExpand ? expandedCategories.has(categoryId) : localExpanded.has(categoryId);
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasSubcategories = category.subcategories && category.subcategories.length > 0;
    const expanded = isExpanded(category._id);
    const indent = level * 24;

    return (
      <div key={category._id} className="mb-2">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
            !category.isActive ? 'opacity-60' : ''
          }`}
          style={{ marginRight: `${indent}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleExpand(category._id)}
            className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              !hasSubcategories ? 'invisible' : ''
            }`}
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Category Icon/Image */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {category.image || (category.images && category.images.length > 0) ? (
              <LazyImage
                src={category.image || category.images![0]}
                alt={category.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                priority={level === 0}
              />
            ) : category.icon ? (
              <span className="text-2xl">{category.icon}</span>
            ) : (
              <Folder className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            )}
          </div>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {category.name}
              </h3>
              {category.featured && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              )}
              {!category.showInMenu && (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
              {category.showInHome && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                  الرئيسية
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
              {category.nameEn && (
                <span className="truncate">{category.nameEn}</span>
              )}
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {category.productCount || 0} منتج
              </span>
              {category.level !== undefined && (
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                  المستوى {category.level + 1}
                </span>
              )}
            </div>
            {category.description && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-1">
                {category.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onToggleFeatured && (
              <button
                onClick={() => onToggleFeatured(category)}
                className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                  category.featured ? 'text-yellow-500' : 'text-gray-400'
                }`}
                title={category.featured ? 'إزالة من المميزة' : 'إضافة للمميزة'}
              >
                <Star className={`w-4 h-4 ${category.featured ? 'fill-current' : ''}`} />
              </button>
            )}
            {onToggleActive && (
              <button
                onClick={() => onToggleActive(category)}
                className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                  category.isActive ? 'text-green-500' : 'text-gray-400'
                }`}
                title={category.isActive ? 'تعطيل' : 'تفعيل'}
              >
                {category.isActive ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(category)}
                className="p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition-colors"
                title="تعديل"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(category)}
                className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Subcategories */}
        {hasSubcategories && expanded && (
          <div className="mt-1">
            {category.subcategories!.map(sub => renderCategory(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {categories.map(category => renderCategory(category, 0))}
    </div>
  );
}

