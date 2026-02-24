'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { hasPermission } from '@/lib/permissions';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import {
  productFormSchema,
  productFormDefaultValues,
  type ProductFormData,
} from '@/lib/product-form-schema';
import type { ProductVariant, ProductVariantOption } from '@/types';

export interface Category {
  _id: string;
  name: string;
}

export interface Supplier {
  _id: string;
  name: string;
  companyName?: string;
  email: string;
}

export type ProductFormMode = 'create' | 'edit';

export interface UseProductFormOptions {
  mode: ProductFormMode;
  productId?: string;
  user: { role?: string } | null;
  onSuccess?: () => void;
}

function transliterateToEnglish(text: string): string {
  const arabicPattern = /[\u0600-\u06FF]/;
  if (arabicPattern.test(text)) {
    const englishChars = text.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase();
    return englishChars.length >= 3 ? englishChars : 'CAT';
  }
  return text.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase() || 'PROD';
}

export function useProductForm({ mode, productId, user, onSuccess }: UseProductFormOptions) {
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const isSupplier = user?.role === 'supplier';

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: productFormDefaultValues,
  });

  const { register, watch, setValue, getValues, reset, formState: { errors } } = form;

  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [hasVariants, setHasVariants] = useState<boolean | null>(mode === 'edit' ? false : null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantOptions, setVariantOptions] = useState<ProductVariantOption[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [suggestedSku, setSuggestedSku] = useState('');
  const [skuError, setSkuError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [isMarketerPriceAutoCalculated, setIsMarketerPriceAutoCalculated] = useState(false);
  const [isMarketerPriceManuallyAdjusted, setIsMarketerPriceManuallyAdjusted] = useState(false);
  const [adminProfitMargin, setAdminProfitMargin] = useState<number | null>(null);
  const [product, setProduct] = useState<any>(null);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const fetchProductAbortRef = useRef<AbortController | null>(null);
  const productIdRef = useRef<string | undefined>(productId);
  productIdRef.current = productId;
  // تتبع معرف الطلب الحالي لتجاهل استجابات قديمة عند التنقل السريع بين صفحات تعديل المنتجات
  const fetchForIdRef = useRef<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        const list = data.categories || [];
        setCategories(list);
        setFilteredCategories(list);
      }
    } catch {
      toast.error('فشل في جلب الفئات');
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    if (!isAdmin) return;
    // صلاحيات دقيقة: جلب قائمة الموردين يتطلب users.view
    if (user && !hasPermission(user as any, 'users.view')) return;
    try {
      const res = await fetch('/api/admin/users?role=supplier&status=active&limit=100');
      if (res.ok) {
        const data = await res.json();
        const list = data.users || [];
        setSuppliers(list);
        setFilteredSuppliers(list);
      }
    } catch {
      // silent
    }
  }, [isAdmin, user]);

  const fetchProduct = useCallback(async (isRetry = false) => {
    if (mode !== 'edit' || !productId) return;
    if (fetchProductAbortRef.current) fetchProductAbortRef.current.abort();
    const abort = new AbortController();
    fetchProductAbortRef.current = abort;
    fetchForIdRef.current = productId;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`, { signal: abort.signal, cache: 'no-store' });
      if (abort.signal.aborted) return;
      if (fetchForIdRef.current !== productId) return;
      if (!res.ok) {
        // إعادة محاولة مرة واحدة عند 404 أو 5xx (تجنب فشل مؤقت بسبب كاش أو توقيت)
        const isRetryable = (res.status === 404 || res.status >= 500) && !isRetry;
        if (isRetryable) {
          await new Promise(r => setTimeout(r, 400));
          if (abort.signal.aborted) return;
          if (fetchForIdRef.current !== productId) return;
          fetchProductAbortRef.current = null;
          await fetchProduct(true);
          return;
        }
        if (fetchForIdRef.current !== productId) return;
        if (res.status === 403) {
          toast.error('غير مصرح لك بالوصول لهذا المنتج');
        } else {
          toast.error('المنتج غير موجود');
        }
        router.push('/dashboard/products');
        return;
      }
      const data = await res.json();
      if (abort.signal.aborted) return;
      if (fetchForIdRef.current !== productId) return;
      const p = data.product;
      if (!p || p._id !== productId) return; // تجاهل استجابة لمنتج آخر (كاش أو تنقل سريع)
      setProduct(p);
      setImages(p.images || []);
      setPrimaryImageIndex(0);
      setValue('name', p.name);
      setValue('description', p.description || '');
      setValue('categoryId', p.categoryId || '');
      setValue('supplierPrice', p.supplierPrice || 0);
      setValue('marketerPrice', p.marketerPrice);
      setValue('wholesalerPrice', p.wholesalerPrice);
      setValue('minimumSellingPrice', p.minimumSellingPrice || 0);
      setValue('isMinimumPriceMandatory', p.isMinimumPriceMandatory || false);
      setValue('stockQuantity', p.stockQuantity);
      setValue('sku', p.sku || '');
      // إذا كان للمنتج متغيرات (حسب العلم أو وجود خيارات) فعطّل تعديل الكمية الرئيسية
      const hasVariantsData = p.hasVariants === true || (Array.isArray(p.variantOptions) && p.variantOptions.length > 0) || (Array.isArray(p.variants) && p.variants.length > 0);
      setHasVariants(hasVariantsData ? true : (p.hasVariants === false ? false : null));
      setVariants(p.variants || []);
      setVariantOptions(p.variantOptions || []);
      if (p.isMarketerPriceManuallyAdjusted) {
        setIsMarketerPriceManuallyAdjusted(true);
        setIsMarketerPriceAutoCalculated(false);
      }
      if (isAdmin && p.supplierId) setSelectedSupplierId(p.supplierId);
      if (p.categoryId) {
        const cat = (data.categories || categories).find((c: Category) => c._id === p.categoryId);
        setCategorySearch(cat?.name || '');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // إعادة محاولة مرة واحدة عند فشل الشبكة (تنقل سريع بين المنتجات قد يسبب إلغاء أو فشل مؤقت)
      if (!isRetry && fetchForIdRef.current === productId) {
        fetchProductAbortRef.current = null;
        await new Promise(r => setTimeout(r, 400));
        if (fetchForIdRef.current !== productId) return;
        await fetchProduct(true);
        return;
      }
      if (fetchForIdRef.current !== productId) return;
      toast.error('حدث خطأ أثناء جلب المنتج');
      router.push('/dashboard/products');
    } finally {
      if (!abort.signal.aborted && fetchForIdRef.current === productId) {
        setLoading(false);
        fetchProductAbortRef.current = null;
      }
    }
  }, [mode, productId, router, setValue, isAdmin, categories]);

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, [fetchCategories, fetchSuppliers]);

  useEffect(() => {
    if (mode !== 'edit' || !productId) return;
    fetchForIdRef.current = productId;
    setProduct(null);
    setLoading(true);
    fetchProduct();
    return () => {
      fetchForIdRef.current = null;
      if (fetchProductAbortRef.current) fetchProductAbortRef.current.abort();
    };
  }, [mode, productId, fetchProduct]);

  useEffect(() => {
    if (categorySearch.trim() === '') {
      setFilteredCategories(categories);
    } else {
      setFilteredCategories(categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())));
    }
  }, [categorySearch, categories]);

  // When categories load in edit mode, show selected category name in search field
  useEffect(() => {
    if (mode === 'edit' && categories.length > 0) {
      const categoryId = getValues('categoryId');
      if (categoryId) {
        const cat = categories.find(c => c._id === categoryId);
        if (cat) setCategorySearch(cat.name);
      }
    }
  }, [mode, categories, getValues]);

  useEffect(() => {
    if (supplierSearch.trim() === '') {
      setFilteredSuppliers(suppliers);
      setShowSupplierDropdown(false);
    } else {
      setFilteredSuppliers(suppliers.filter(s =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.companyName?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(supplierSearch.toLowerCase())
      ));
      setShowSupplierDropdown(true);
    }
  }, [supplierSearch, suppliers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) setShowCategoryDropdown(false);
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) setShowSupplierDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const supplierPrice = watch('supplierPrice') || 0;
  const marketerPrice = watch('marketerPrice') || 0;
  const wholesalerPrice = watch('wholesalerPrice') || undefined;
  const minimumSellingPrice = watch('minimumSellingPrice') || 0;
  const isMinimumPriceMandatory = watch('isMinimumPriceMandatory') || false;

  useEffect(() => {
    if ((isMarketerPriceManuallyAdjusted && isAdmin) || supplierPrice <= 0) {
      if (supplierPrice <= 0) {
        setIsMarketerPriceAutoCalculated(false);
        setAdminProfitMargin(null);
      }
      return;
    }
    const run = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        let margin = 5;
        if (data.success && data.settings?.adminProfitMargins?.length) {
          const sorted = [...data.settings.adminProfitMargins].sort((a: any, b: any) => a.minPrice - b.minPrice);
          for (const m of sorted) {
            if (supplierPrice >= m.minPrice && supplierPrice <= m.maxPrice) {
              margin = m.margin;
              break;
            }
          }
        }
        setAdminProfitMargin(margin);
        const calculated = supplierPrice + (supplierPrice * margin) / 100;
        setValue('marketerPrice', Number(calculated.toFixed(2)), { shouldDirty: true });
        setIsMarketerPriceAutoCalculated(true);
      } catch {
        const calculated = supplierPrice + (supplierPrice * 5) / 100;
        setValue('marketerPrice', Number(calculated.toFixed(2)), { shouldDirty: true });
        setIsMarketerPriceAutoCalculated(true);
      }
    };
    run();
  }, [supplierPrice, setValue, isMarketerPriceManuallyAdjusted, isAdmin]);

  const generateSKU = useCallback(() => {
    const name = watch('name') || '';
    const categoryId = watch('categoryId');
    const category = categories.find(c => c._id === categoryId);
    let prefix = 'PROD';
    if (category) prefix = transliterateToEnglish(category.name);
    else if (name.length >= 3) prefix = transliterateToEnglish(name);
    const sku = `${prefix}-${Date.now().toString().slice(-6)}`;
    setSuggestedSku(sku);
    setValue('sku', sku, { shouldDirty: false });
    setSkuError('');
  }, [watch, categories, setValue]);

  const checkSKU = useCallback(async (sku: string) => {
    if (!sku?.trim()) {
      setSkuError('');
      return;
    }
    try {
      const url = mode === 'edit' && productId
        ? `/api/products/check-sku?sku=${encodeURIComponent(sku)}&excludeId=${productId}`
        : `/api/products/check-sku?sku=${encodeURIComponent(sku)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSkuError(data.exists ? 'هذا SKU مستخدم بالفعل' : '');
      }
    } catch {
      // silent
    }
  }, [mode, productId]);

  useEffect(() => {
    const sub = watch((value, { name }) => {
      const productName = value.name;
      if (productName && productName.length >= 3) {
        const t = setTimeout(async () => {
          try {
            const url = mode === 'edit' && productId
              ? `/api/products/check-name?name=${encodeURIComponent(productName)}&excludeId=${productId}`
              : `/api/products/check-name?name=${encodeURIComponent(productName)}`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              if (data.exists) setDuplicateWarning('يوجد منتج بنفس الاسم');
              else if (data.similar?.length) {
                setSimilarProducts(data.similar);
                setDuplicateWarning(`تم العثور على ${data.similar.length} منتج مشابه`);
              } else {
                setDuplicateWarning('');
                setSimilarProducts([]);
              }
            }
          } catch {
            // silent
          }
        }, 500);
        return () => clearTimeout(t);
      } else {
        setDuplicateWarning('');
        setSimilarProducts([]);
      }
    });
    return () => sub.unsubscribe();
  }, [watch, mode, productId]);

  useEffect(() => {
    const sub = watch((value) => {
      const currentSku = value.sku;
      const productName = value.name;
      const categoryId = value.categoryId;
      if (!currentSku && productName && productName.length >= 3) {
        const category = categories.find(c => c._id === categoryId);
        let prefix = 'PROD';
        if (category) prefix = transliterateToEnglish(category.name);
        else if (productName.length >= 3) prefix = transliterateToEnglish(productName);
        const sku = `${prefix}-${Date.now().toString().slice(-6)}`;
        setSuggestedSku(sku);
        setValue('sku', sku, { shouldDirty: false });
        setSkuError('');
      }
    });
    return () => sub.unsubscribe();
  }, [watch, categories, setValue]);

  const handleVariantsChange = useCallback((newHasVariants: boolean, newVariants: ProductVariant[], newVariantOptions: ProductVariantOption[]) => {
    setHasVariants(newHasVariants);
    setVariants(newVariants);
    setVariantOptions(newVariantOptions);
    if (newHasVariants && newVariantOptions.length > 0) {
      const total = newVariantOptions.reduce((sum, o) => sum + (o.stockQuantity || 0), 0);
      setValue('stockQuantity', total, { shouldDirty: false });
    }
  }, [setValue]);

  useEffect(() => {
    if (hasVariants === true && variantOptions.length > 0) {
      const total = variantOptions.reduce((sum, o) => sum + (o.stockQuantity || 0), 0);
      setValue('stockQuantity', total, { shouldDirty: false });
    }
  }, [variantOptions, hasVariants, setValue]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (primaryImageIndex >= next.length && next.length > 0) setPrimaryImageIndex(next.length - 1);
      else if (index < primaryImageIndex) setPrimaryImageIndex(p => p - 1);
      return next;
    });
  }, [primaryImageIndex]);

  const handleImageReorder = useCallback((reordered: string[]) => {
    setImages(reordered);
    if (primaryImageIndex >= reordered.length) setPrimaryImageIndex(0);
  }, [primaryImageIndex]);

  const draftKey = mode === 'edit' && productId ? `product-edit-draft-${productId}` : 'product-draft';

  const saveDraft = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    setIsSaving(true);
    try {
      const formData = getValues();
      const draft = {
        ...formData,
        images,
        hasVariants,
        variants,
        variantOptions,
        selectedSupplierId,
        primaryImageIndex,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setHasUnsavedChanges(false);
      toast.success('تم حفظ المسودة تلقائياً', { duration: 2000, icon: '💾' });
    } catch {
      // silent
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, getValues, images, hasVariants, variants, variantOptions, selectedSupplierId, primaryImageIndex, draftKey]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [hasUnsavedChanges, saveDraft]);

  useEffect(() => {
    if (mode === 'create') {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          reset(parsed);
          setImages(parsed.images || []);
          setHasVariants(parsed.hasVariants ?? null);
          setVariants(parsed.variants || []);
          setVariantOptions(parsed.variantOptions || []);
          setSelectedSupplierId(parsed.selectedSupplierId || '');
          setPrimaryImageIndex(parsed.primaryImageIndex ?? 0);
          setHasUnsavedChanges(false);
          toast.success('تم استعادة المسودة تلقائياً', { duration: 2000 });
        } catch {
          localStorage.removeItem(draftKey);
        }
      }
    }
  }, [mode, draftKey, reset]);

  useEffect(() => {
    const sub = watch(() => setHasUnsavedChanges(true));
    return () => sub.unsubscribe();
  }, [watch]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        (e as any).returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [hasUnsavedChanges]);

  const onError = useCallback((errs: FieldErrors<ProductFormData>) => {
    setShowErrors(true);
    const first = Object.values(errs)[0];
    if (first && 'message' in first && first.message) {
      toast.error(first.message as string);
    } else {
      toast.error('يرجى التحقق من البيانات المدخلة');
    }
  }, []);

  const onSubmit = useCallback(async (data: ProductFormData) => {
    if (hasVariants === null) {
      toast.error('يرجى تحديد ما إذا كان المنتج يحتوي على متغيرات أم لا', { duration: 4000 });
      return;
    }
    if (images.length === 0) {
      toast.error('يجب إضافة صورة واحدة على الأقل', { duration: 4000 });
      return;
    }
    if (data.wholesalerPrice != null && data.marketerPrice != null && data.marketerPrice > 0 && data.wholesalerPrice >= data.marketerPrice) {
      toast.error('سعر المسوق يجب أن يكون أكبر من سعر الجملة', { duration: 4000 });
      return;
    }
    // التحقق من السعر الأدنى فقط عند إدخال قيمة أكبر من 0 (الحقل اختياري)
    if (data.minimumSellingPrice != null && data.minimumSellingPrice > 0 && data.marketerPrice != null && data.marketerPrice > 0 && data.marketerPrice >= data.minimumSellingPrice) {
      toast.error('إذا أدخلت سعراً أدنى فيجب أن يكون أكبر من سعر المسوق', { duration: 4000 });
      return;
    }
    if (hasVariants === true) {
      if (variantOptions.length === 0) {
        toast.error('يجب إضافة متغيرات مع خيارات عند تفعيل المتغيرات', { duration: 4000 });
        return;
      }
      const totalStock = variantOptions.reduce((s, o) => s + (o.stockQuantity || 0), 0);
      if (totalStock === 0) {
        toast.error('يجب إضافة مخزون لخيارات المتغيرات على الأقل', { duration: 4000 });
        return;
      }
    } else if (hasVariants === false && data.stockQuantity < 0) {
      toast.error('الكمية المتوفرة يجب أن تكون 0 أو أكثر', { duration: 4000 });
      return;
    }

    const supplierPriceNum = Number(data.supplierPrice);
    if (isNaN(supplierPriceNum) || supplierPriceNum <= 0) {
      toast.error('يجب إدخال سعر مورد صحيح (أكبر من 0)', { duration: 4000 });
      return;
    }

    setSaving(true);
    try {
      const productData: any = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        ...(!isSupplier && { categoryId: data.categoryId && data.categoryId !== '' ? data.categoryId : null }),
        supplierPrice: supplierPriceNum,
        marketerPrice: data.marketerPrice && data.marketerPrice > 0 ? Number(data.marketerPrice) : undefined,
        wholesalerPrice: data.wholesalerPrice != null && !isNaN(Number(data.wholesalerPrice)) ? Number(data.wholesalerPrice) : undefined,
        minimumSellingPrice: data.minimumSellingPrice && data.minimumSellingPrice > 0 ? Number(data.minimumSellingPrice) : null,
        isMinimumPriceMandatory: data.isMinimumPriceMandatory,
        stockQuantity: hasVariants === true && variantOptions.length > 0
          ? variantOptions.reduce((s, o) => s + (o.stockQuantity || 0), 0)
          : Number(data.stockQuantity),
        images,
        ...(!isSupplier && { sku: data.sku?.trim() || '' }),
        tags: [],
        specifications: {},
        hasVariants: hasVariants === true,
        variants: hasVariants === true ? variants : [],
        variantOptions: hasVariants === true ? variantOptions : [],
        ...(isAdmin && selectedSupplierId ? { supplierId: selectedSupplierId } : {}),
        ...(isAdmin ? { isMarketerPriceManuallyAdjusted: isMarketerPriceManuallyAdjusted } : {}),
      };

      if (mode === 'edit' && productId) {
        Object.assign(productData, {
          isActive: product?.isActive,
          isApproved: product?.isApproved,
        });
      }

      const url = mode === 'edit' && productId ? `/api/products/${productId}` : '/api/products';
      const method = mode === 'edit' && productId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.removeItem(draftKey);
        setHasUnsavedChanges(false);
        toast.success(mode === 'edit' ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح', {
          duration: 4000,
          style: { background: '#10b981', color: '#fff', padding: '16px', borderRadius: '8px' },
        });
        if (typeof window !== 'undefined') sessionStorage.setItem('refresh-products', 'true');
        window.dispatchEvent(new CustomEvent('refresh-products'));
        onSuccess?.();
        setTimeout(() => {
          router.push('/dashboard/products');
          router.refresh();
        }, 1000);
      } else {
        toast.error(result.message || (mode === 'edit' ? 'حدث خطأ أثناء تحديث المنتج' : 'حدث خطأ أثناء إضافة المنتج'), {
          duration: 6000,
          style: { background: '#ef4444', color: '#fff' },
        });
        if (result.errors?.length) {
          result.errors.forEach((err: any, i: number) => {
            setTimeout(() => toast.error(`${err.path}: ${err.message}`), i * 300);
          });
        }
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم', { duration: 5000 });
    } finally {
      setSaving(false);
    }
  }, [
    mode, productId, hasVariants, variantOptions, images, variants, selectedSupplierId, product,
    isSupplier, isAdmin, isMarketerPriceManuallyAdjusted, draftKey, onSuccess, router,
  ]);

  return {
    form: {
      register,
      watch,
      setValue,
      getValues,
      handleSubmit: form.handleSubmit,
      errors,
      reset,
    },
    state: {
      categories,
      filteredCategories,
      categorySearch,
      setCategorySearch,
      showCategoryDropdown,
      setShowCategoryDropdown,
      suppliers,
      filteredSuppliers,
      supplierSearch,
      setSupplierSearch,
      showSupplierDropdown,
      setShowSupplierDropdown,
      selectedSupplierId,
      setSelectedSupplierId,
      images,
      setImages,
      primaryImageIndex,
      setPrimaryImageIndex,
      uploading,
      setUploading,
      loading,
      saving,
      hasVariants,
      setHasVariants,
      variants,
      setVariants,
      variantOptions,
      setVariantOptions,
      hasUnsavedChanges,
      setHasUnsavedChanges,
      showErrors,
      setShowErrors,
      suggestedSku,
      skuError,
      duplicateWarning,
      similarProducts,
      isMarketerPriceAutoCalculated,
      isMarketerPriceManuallyAdjusted,
      setIsMarketerPriceManuallyAdjusted,
      setIsMarketerPriceAutoCalculated,
      adminProfitMargin,
      isSaving,
      product,
    },
    refs: { categoryDropdownRef, supplierDropdownRef },
    handlers: {
      generateSKU,
      checkSKU,
      handleVariantsChange,
      removeImage,
      handleImageReorder,
      handleSetPrimaryImage: setPrimaryImageIndex,
      saveDraft,
      onError,
      onSubmit,
    },
    isAdmin,
    isSupplier,
  };
}
