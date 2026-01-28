'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Maximize2, Minimize2, Package, ImageIcon, DollarSign, Warehouse, Layers, Eye, FileText, Cloud, CloudOff, ChevronLeft, ChevronRight, X, AlertCircle, CheckCircle2, Info, AlertTriangle, Lightbulb, Sparkles, Zap, BarChart2, Clock, Star, Search, Plus, Trash2, Tag, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import MediaUpload from '@/components/ui/MediaUpload';
import ProductVariants from '@/components/ui/ProductVariants';
import Tooltip from '@/components/ui/Tooltip';
import DraftRestoreModal from '@/components/ui/DraftRestoreModal';
import TemplateNameModal from '@/components/ui/TemplateNameModal';
import TemplateLoadConfirmModal from '@/components/ui/TemplateLoadConfirmModal';
import TemplateDeleteConfirmModal from '@/components/ui/TemplateDeleteConfirmModal';
import UnsavedChangesModal from '@/components/ui/UnsavedChangesModal';
import { ProductVariant, ProductVariantOption } from '@/types';

const productSchema = z.object({
  name: z.string().min(3, 'اسم المنتج يجب أن يكون 3 أحرف على الأقل'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  marketerPrice: z.number().min(0.01, 'سعر المسوق يجب أن يكون أكبر من 0'),
  wholesalerPrice: z.number().min(0.01, 'سعر الجملة يجب أن يكون أكبر من 0').nullish(),
  minimumSellingPrice: z.number().min(0.01, 'السعر الأدنى للبيع يجب أن يكون أكبر من 0').optional(),
  isMinimumPriceMandatory: z.boolean().default(false),
  stockQuantity: z.number().min(0, 'الكمية يجب أن تكون 0 أو أكثر'),
  sku: z.string().optional()
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  _id: string;
  name: string;
}

interface Supplier {
  _id: string;
  name: string;
  companyName?: string;
  email: string;
}

// Steps configuration
const STEPS = [
  { id: 1, name: 'المعلومات الأساسية', icon: Package, key: 'basic' },
  { id: 2, name: 'الوسائط', icon: ImageIcon, key: 'media' },
  { id: 3, name: 'الأسعار', icon: DollarSign, key: 'pricing' },
  { id: 4, name: 'المخزون', icon: Warehouse, key: 'inventory' },
  { id: 5, name: 'المتغيرات', icon: Layers, key: 'variants' },
  { id: 6, name: 'المراجعة', icon: Eye, key: 'review' },
];

export default function NewProductPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
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
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  // Product variants state
  const [hasVariants, setHasVariants] = useState<boolean | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantOptions, setVariantOptions] = useState<ProductVariantOption[]>([]);
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  // Auto-save state
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Tags and Specifications
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [specifications, setSpecifications] = useState<Array<{key: string, value: string}>>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [suggestedSku, setSuggestedSku] = useState<string>('');
  const [skuError, setSkuError] = useState<string>('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickEditMode, setQuickEditMode] = useState(false);
  // Draft restore modal
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);
  // Template modals
  const [showTemplateNameModal, setShowTemplateNameModal] = useState(false);
  const [showTemplateLoadModal, setShowTemplateLoadModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateDeleteModal, setShowTemplateDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  // Unsaved changes modal
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [unsavedChangesAction, setUnsavedChangesAction] = useState<(() => void) | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: formIsDirty },
    watch,
    setValue,
    reset,
    getValues
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: '',
      stockQuantity: 0,
      marketerPrice: 0,
      wholesalerPrice: undefined,
      minimumSellingPrice: 0,
      isMinimumPriceMandatory: false,
      sku: ''
    }
  });

  // Handle form submission errors
  const onError = useCallback((errors: FieldErrors<ProductFormData>) => {
    console.log('Form validation errors:', errors);
    setShowErrors(true);
    // Show first error
    const firstError = Object.values(errors)[0];
    if (firstError && 'message' in firstError && firstError.message) {
      toast.error(firstError.message as string);
    } else {
      toast.error('يرجى التحقق من البيانات المدخلة');
    }
  }, []);

  // Generate tag suggestions based on product name and category
  const generateTagSuggestions = (): string[] => {
    const suggestions: string[] = [];
    const productName = watch('name') || '';
    const categoryName = categories.find(c => c._id === watch('categoryId'))?.name || '';
    
    if (productName) {
      const words = productName.split(' ').filter(w => w.length > 2);
      suggestions.push(...words);
    }
    
    if (categoryName) {
      suggestions.push(categoryName);
    }
    
    // Common tags
    const commonTags = ['جديد', 'عرض خاص', 'الأكثر مبيعاً', 'مميز', 'عالي الجودة'];
    suggestions.push(...commonTags);
    
    return Array.from(new Set(suggestions)).slice(0, 10);
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addSpecification = () => {
    setSpecifications([...specifications, { key: '', value: '' }]);
  };

  const updateSpecification = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...specifications];
    updated[index] = { ...updated[index], [field]: value };
    setSpecifications(updated);
  };

  const removeSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  // Scroll to error field
  const scrollToError = (fieldName: string) => {
    const element = document.querySelector(`[name="${fieldName}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (element as HTMLElement).focus();
    }
  };

  // Convert Arabic text to English for SKU (simple transliteration)
  const transliterateToEnglish = (text: string): string => {
    // Remove Arabic characters and keep only English letters and numbers
    // If text contains Arabic, use a simple mapping or fallback to 'CAT'
    const arabicPattern = /[\u0600-\u06FF]/;
    if (arabicPattern.test(text)) {
      // Use first 3 English letters if available, otherwise use 'CAT'
      const englishChars = text.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase();
      return englishChars.length >= 3 ? englishChars : 'CAT';
    }
    // If already English, use first 3 characters
    return text.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase() || 'PROD';
  };

  // Generate SKU
  const generateSKU = () => {
    const productName = watch('name') || '';
    const category = categories.find(c => c._id === watch('categoryId'));
    
    // Use category prefix if available, otherwise use product name, otherwise use 'PROD'
    let prefix = 'PROD';
    if (category) {
      prefix = transliterateToEnglish(category.name);
    } else if (productName && productName.length >= 3) {
      prefix = transliterateToEnglish(productName);
    }
    
    const timestamp = Date.now().toString().slice(-6);
    const sku = `${prefix}-${timestamp}`;
    setSuggestedSku(sku);
    setValue('sku', sku, { shouldDirty: false });
    setSkuError('');
  };

  // Check SKU availability
  const checkSKU = async (sku: string) => {
    if (!sku || sku.trim() === '') {
      setSkuError('');
      return;
    }
    
    try {
      const response = await fetch(`/api/products/check-sku?sku=${encodeURIComponent(sku)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          setSkuError('هذا SKU مستخدم بالفعل');
        } else {
          setSkuError('');
        }
      }
    } catch (error) {
      console.error('Failed to check SKU:', error);
    }
  };

  // Smart validation: Check duplicate product name
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      const productName = value.name;
      if (productName && productName.length >= 3) {
        const timeoutId = setTimeout(async () => {
          try {
            const response = await fetch(`/api/products/check-name?name=${encodeURIComponent(productName)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.exists) {
                setDuplicateWarning('يوجد منتج بنفس الاسم');
              } else if (data.similar && data.similar.length > 0) {
                setSimilarProducts(data.similar);
                setDuplicateWarning(`تم العثور على ${data.similar.length} منتج مشابه`);
              } else {
                setDuplicateWarning('');
                setSimilarProducts([]);
              }
            }
          } catch (error) {
            console.error('Failed to check product name:', error);
          }
        }, 500); // Debounce

        return () => clearTimeout(timeoutId);
      } else {
        setDuplicateWarning('');
        setSimilarProducts([]);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [watch]);


  useEffect(() => {
    fetchCategories();
    // Fetch suppliers if user is admin
    if (user?.role === 'admin') {
      fetchSuppliers();
    }
  }, [user]);

  // Auto-generate SKU when name is available (category is optional)
  // Works for all users including suppliers, but SKU field is hidden from suppliers in UI
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      const productName = value.name;
      const categoryId = value.categoryId;
      const currentSku = value.sku;
      
      // Generate SKU if it's empty and we have product name (at least 3 characters)
      if (!currentSku && productName && productName.length >= 3) {
        const category = categoryId && categories.length > 0 
          ? categories.find(c => c._id === categoryId) 
          : null;
        
        // Use category prefix if available, otherwise use product name, otherwise use 'PROD'
        let prefix = 'PROD';
        if (category) {
          prefix = transliterateToEnglish(category.name);
        } else if (productName && productName.length >= 3) {
          prefix = transliterateToEnglish(productName);
        }
        
        const timestamp = Date.now().toString().slice(-6);
        const sku = `${prefix}-${timestamp}`;
        setSuggestedSku(sku);
        setValue('sku', sku, { shouldDirty: false });
        setSkuError('');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [watch, setValue, categories]);

  useEffect(() => {
    if (user?.role !== 'supplier' && user?.role !== 'admin') {
      toast.error('غير مصرح لك بإضافة منتجات');
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
        setFilteredCategories(data.categories || []);
      } else {
        toast.error('فشل في جلب الفئات');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب الفئات');
    }
  };

  // Filter categories
  useEffect(() => {
    if (categorySearch.trim() === '') {
      setFilteredCategories(categories);
    } else {
      setFilteredCategories(
        categories.filter(cat => 
          cat.name.toLowerCase().includes(categorySearch.toLowerCase())
        )
      );
    }
  }, [categorySearch, categories]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=supplier&status=active&limit=100');
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.users || []);
        setFilteredSuppliers(data.users || []);
      }
    } catch (error) {
      // Silently handle errors
    }
  };

  // Filter suppliers
  useEffect(() => {
    if (supplierSearch.trim() === '') {
      setFilteredSuppliers(suppliers);
      setShowSupplierDropdown(false);
    } else {
      setFilteredSuppliers(
        suppliers.filter(supplier => 
          supplier.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
          supplier.companyName?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
          supplier.email.toLowerCase().includes(supplierSearch.toLowerCase())
        )
      );
      setShowSupplierDropdown(true);
    }
  }, [supplierSearch, suppliers]);

  const handleVariantsChange = (newHasVariants: boolean, newVariants: ProductVariant[], newVariantOptions: ProductVariantOption[]) => {
    setHasVariants(newHasVariants);
    setVariants(newVariants);
    setVariantOptions(newVariantOptions);
    
    // Calculate total stock from variants if product has variants
    if (newHasVariants && newVariantOptions.length > 0) {
      const totalStock = newVariantOptions.reduce((sum, option) => sum + (option.stockQuantity || 0), 0);
      setValue('stockQuantity', totalStock, { shouldDirty: false });
    }
  };

  // Calculate total stock from variants when variantOptions change
  useEffect(() => {
    if (hasVariants === true && variantOptions.length > 0) {
      const totalStock = variantOptions.reduce((sum, option) => sum + (option.stockQuantity || 0), 0);
      setValue('stockQuantity', totalStock, { shouldDirty: false });
    }
  }, [variantOptions, hasVariants, setValue]);

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      // Adjust primary index if needed
      if (primaryImageIndex >= newImages.length && newImages.length > 0) {
        setPrimaryImageIndex(newImages.length - 1);
      } else if (index < primaryImageIndex) {
        setPrimaryImageIndex(primaryImageIndex - 1);
      }
      return newImages;
    });
  };

  const handleImageReorder = (reorderedImages: string[]) => {
    setImages(reorderedImages);
    // Keep primary index if still valid
    if (primaryImageIndex >= reorderedImages.length) {
      setPrimaryImageIndex(0);
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    setPrimaryImageIndex(index);
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    const totalSteps = STEPS.length;
    const completed = completedSteps.size;
    return Math.round((completed / totalSteps) * 100);
  };

  // Check if step is completed
  const isStepCompleted = useCallback((stepId: number) => {
    return completedSteps.has(stepId);
  }, [completedSteps]);

  // Check if step can be accessed
  const canAccessStep = useCallback((stepId: number) => {
    if (stepId === 1) return true;
    // Can access if previous step is completed or current step
    return completedSteps.has(stepId - 1) || stepId <= currentStep;
  }, [completedSteps, currentStep]);

  // Validate current step
  const validateStep = useCallback((stepId: number): boolean => {
    const formData = getValues();
    
    switch (stepId) {
      case 1: // Basic Info
        return !!(formData.name && formData.name.length >= 3);
      case 2: // Media
        return images.length > 0;
      case 3: // Pricing
        return !!(formData.marketerPrice && formData.marketerPrice > 0);
      case 4: // Inventory
        // If product has variants, check that variant options have stock
        if (hasVariants === true) {
          return variantOptions.length > 0 && variantOptions.some(option => (option.stockQuantity || 0) > 0);
        }
        // If no variants, check main stock quantity
        return formData.stockQuantity >= 0;
      case 5: // Variants
        if (hasVariants === true) {
          // If variants enabled, must have at least one variant with options
          return variants.length > 0 && variantOptions.length > 0;
        }
        return hasVariants !== null;
      case 6: // Review
        return true;
      default:
        return false;
    }
  }, [getValues, images, hasVariants, variants, variantOptions]);

  // Mark step as completed
  const markStepCompleted = useCallback((stepId: number) => {
    if (validateStep(stepId)) {
      setCompletedSteps(prev => new Set([...Array.from(prev), stepId]));
    }
  }, [validateStep]);

  // Navigate to step
  const goToStep = useCallback((stepId: number) => {
    if (canAccessStep(stepId)) {
      setCurrentStep(stepId);
      // Mark previous steps as completed
      for (let i = 1; i < stepId; i++) {
        if (validateStep(i)) {
          setCompletedSteps(prev => new Set([...Array.from(prev), i]));
        }
      }
    }
  }, [canAccessStep, validateStep]);

  // Go to next step
  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length) {
      markStepCompleted(currentStep);
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  }, [currentStep, markStepCompleted]);

  // Go to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Auto-validate steps on form change
  useEffect(() => {
    const subscription = watch(() => {
      // Validate all previous steps
      for (let i = 1; i <= currentStep; i++) {
        if (validateStep(i)) {
          setCompletedSteps(prev => new Set([...Array.from(prev), i]));
        }
      }
      // Mark as dirty
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [currentStep, images, hasVariants, validateStep, watch]);

  // Auto-save functionality
  const saveDraft = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    setIsSaving(true);
    try {
      const formData = getValues();
      const draftData = {
        ...formData,
        images,
        hasVariants,
        variants,
        variantOptions,
        selectedSupplierId,
        primaryImageIndex,
        currentStep,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('product-draft', JSON.stringify(draftData));
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast.success('تم حفظ المسودة تلقائياً', { duration: 2000, icon: '💾' });
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, getValues, images, hasVariants, variants, variantOptions, selectedSupplierId, primaryImageIndex, currentStep]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const interval = setInterval(() => {
      saveDraft();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [hasUnsavedChanges, saveDraft]);

  // Load saved templates
  useEffect(() => {
    const templates = localStorage.getItem('product-templates');
    if (templates) {
      try {
        setSavedTemplates(JSON.parse(templates));
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    }
  }, []);

  // Load draft or duplicate on mount
  useEffect(() => {
    // Check for duplicate first (higher priority)
    const duplicate = localStorage.getItem('product-duplicate');
    if (duplicate) {
      try {
        const duplicateData = JSON.parse(duplicate);
        reset(duplicateData);
        setImages(duplicateData.images || []);
        setHasVariants(duplicateData.hasVariants || null);
        setVariants(duplicateData.variants || []);
        setVariantOptions(duplicateData.variantOptions || []);
        setSelectedSupplierId(duplicateData.selectedSupplierId || '');
        setPrimaryImageIndex(duplicateData.primaryImageIndex || 0);
        setCurrentStep(duplicateData.currentStep || 1);
        setTags(duplicateData.tags || []);
        setSpecifications(duplicateData.specifications || []);
        localStorage.removeItem('product-duplicate');
        toast.success('تم تحميل نسخة المنتج');
        return;
      } catch (error) {
        console.error('Failed to load duplicate:', error);
        localStorage.removeItem('product-duplicate');
      }
    }
    
    // Check for draft
    const savedDraft = localStorage.getItem('product-draft');
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        // Check if user has set "don't ask again"
        const dontAsk = localStorage.getItem('draft-restore-dont-ask');
        if (dontAsk === 'true') {
          // Auto-dismiss if user chose not to be asked
          localStorage.removeItem('product-draft');
          return;
        }
        // Show modal with draft data
        setDraftData(parsedDraft);
        setShowDraftModal(true);
      } catch (error) {
        console.error('Failed to load draft:', error);
        localStorage.removeItem('product-draft');
      }
    }
  }, []);

  // Handle draft restore
  const handleRestoreDraft = useCallback(() => {
    if (!draftData) return;
    
    setIsRestoringDraft(true);
    try {
      reset(draftData);
      setImages(draftData.images || []);
      setHasVariants(draftData.hasVariants || null);
      setVariants(draftData.variants || []);
      setVariantOptions(draftData.variantOptions || []);
      setSelectedSupplierId(draftData.selectedSupplierId || '');
      setPrimaryImageIndex(draftData.primaryImageIndex || 0);
      setCurrentStep(draftData.currentStep || 1);
      setTags(draftData.tags || []);
      setSpecifications(draftData.specifications || []);
      setHasUnsavedChanges(false);
      
      // Small delay to show loading state
      setTimeout(() => {
        setIsRestoringDraft(false);
        setShowDraftModal(false);
        setDraftData(null);
        toast.success('تم استعادة المسودة بنجاح', {
          duration: 3000,
          icon: '✅'
        });
      }, 500);
    } catch (error) {
      console.error('Failed to restore draft:', error);
      setIsRestoringDraft(false);
      toast.error('فشل في استعادة المسودة');
    }
  }, [draftData, reset]);

  // Handle draft dismiss
  const handleDismissDraft = useCallback(() => {
    setShowDraftModal(false);
    setDraftData(null);
    localStorage.removeItem('product-draft');
  }, []);

  // Handle draft delete
  const handleDeleteDraft = useCallback(() => {
    localStorage.removeItem('product-draft');
    setShowDraftModal(false);
    setDraftData(null);
    toast.success('تم حذف المسودة', { duration: 2000 });
  }, []);

  // Save as template
  const saveAsTemplate = () => {
    setShowTemplateNameModal(true);
  };

  const handleTemplateNameConfirm = (templateName: string) => {
    const formData = getValues();
    const template = {
      id: `template_${Date.now()}`,
      name: templateName,
      createdAt: new Date().toISOString(),
      data: {
        ...formData,
        images: images,
        hasVariants,
        variants,
        variantOptions,
        selectedSupplierId,
        tags,
        specifications
      }
    };

    const templates = [...savedTemplates, template];
    localStorage.setItem('product-templates', JSON.stringify(templates));
    setSavedTemplates(templates);
    setShowTemplateNameModal(false);
    toast.success('تم حفظ القالب بنجاح', { duration: 3000, icon: '✅' });
  };

  // Load template
  const loadTemplate = (template: any) => {
    setSelectedTemplate(template);
    setShowTemplateLoadModal(true);
  };

  const handleTemplateLoadConfirm = () => {
    if (!selectedTemplate) return;
    
    reset(selectedTemplate.data);
    setImages(selectedTemplate.data.images || []);
    setHasVariants(selectedTemplate.data.hasVariants || null);
    setVariants(selectedTemplate.data.variants || []);
    setVariantOptions(selectedTemplate.data.variantOptions || []);
    setSelectedSupplierId(selectedTemplate.data.selectedSupplierId || '');
    setPrimaryImageIndex(selectedTemplate.data.primaryImageIndex || 0);
    setCurrentStep(selectedTemplate.data.currentStep || 1);
    setTags(selectedTemplate.data.tags || []);
    setSpecifications(selectedTemplate.data.specifications || []);
    setShowTemplateModal(false);
    setShowTemplateLoadModal(false);
    setSelectedTemplate(null);
    toast.success(`تم تحميل القالب "${selectedTemplate.name}"`, { duration: 3000, icon: '✅' });
  };

  // Delete template
  const deleteTemplate = (templateId: string) => {
    const template = savedTemplates.find(t => t.id === templateId);
    if (template) {
      setTemplateToDelete(templateId);
      setSelectedTemplate(template);
      setShowTemplateDeleteModal(true);
    }
  };

  const handleTemplateDeleteConfirm = () => {
    if (!templateToDelete) return;
    
    const updated = savedTemplates.filter(t => t.id !== templateToDelete);
    setSavedTemplates(updated);
    localStorage.setItem('product-templates', JSON.stringify(updated));
    setShowTemplateDeleteModal(false);
    setTemplateToDelete(null);
    setSelectedTemplate(null);
    toast.success('تم حذف القالب', { duration: 2000, icon: '✅' });
  };

  // Predefined templates
  const predefinedTemplates = [
    {
      id: 'electronics',
      name: 'إلكترونيات',
      description: 'قالب جاهز للمنتجات الإلكترونية',
      data: {
        categoryId: '',
        marketerPrice: 0,
        stockQuantity: 0,
        tags: ['إلكترونيات', 'جديد', 'عالي الجودة'],
        specifications: [
          { key: 'الضمان', value: 'سنة واحدة' },
          { key: 'الجهد', value: '220 فولت' }
        ]
      }
    },
    {
      id: 'clothing',
      name: 'ملابس',
      description: 'قالب جاهز للملابس',
      data: {
        categoryId: '',
        marketerPrice: 0,
        stockQuantity: 0,
        tags: ['ملابس', 'موضة', 'أنيق'],
        specifications: [
          { key: 'المادة', value: 'قطن' },
          { key: 'العناية', value: 'غسيل آمن' }
        ]
      }
    },
    {
      id: 'food',
      name: 'أطعمة',
      description: 'قالب جاهز للمنتجات الغذائية',
      data: {
        categoryId: '',
        marketerPrice: 0,
        stockQuantity: 0,
        tags: ['طعام', 'طبيعي', 'صحي'],
        specifications: [
          { key: 'تاريخ الصلاحية', value: '6 أشهر' },
          { key: 'التخزين', value: 'مكان جاف وبارد' }
        ]
      }
    }
  ];

  // Clear draft on successful submit
  const handleSuccessfulSubmit = () => {
    localStorage.removeItem('product-draft');
    setHasUnsavedChanges(false);
  };

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);


  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Calculate statistics
  const calculateStatistics = useCallback(() => {
    const formData = getValues();
    const isSupplier = user?.role === 'supplier';
    
    // Calculate total fields based on user role
    // For suppliers: exclude category and SKU (2 fields less)
    const totalFields = isSupplier ? 13 : 15;
    let completedFields = 0;
    
    // Basic info
    if (formData.name && formData.name.length >= 3) completedFields++;
    // Category - only for non-suppliers
    if (!isSupplier && formData.categoryId) completedFields++;
    if (formData.description) completedFields++;
    
    // Media
    if (images.length > 0) completedFields++;
    
    // Pricing
    if (formData.marketerPrice > 0) completedFields++;
    if (formData.minimumSellingPrice && formData.minimumSellingPrice > 0) completedFields++;
    
    // Inventory
    if (formData.stockQuantity >= 0) completedFields++;
    // SKU - only for non-suppliers
    if (!isSupplier && formData.sku) completedFields++;
    
    // Variants
    if (hasVariants !== null) completedFields++;
    if (hasVariants === true && variants.length > 0) completedFields++;
    
    // Tags & Specs
    if (tags.length > 0) completedFields++;
    if (specifications.length > 0) completedFields++;
    
    const completionRate = Math.round((completedFields / totalFields) * 100);
    
    // Estimate time to complete (rough estimate)
    const remainingFields = totalFields - completedFields;
    const estimatedMinutes = Math.ceil(remainingFields * 0.5); // ~30 seconds per field
    
    return {
      completedFields,
      totalFields,
      completionRate,
      estimatedMinutes,
      quality: completionRate >= 80 ? 'ممتاز' : completionRate >= 60 ? 'جيد' : completionRate >= 40 ? 'متوسط' : 'يحتاج تحسين'
    };
  }, [getValues, images, hasVariants, variants, tags, specifications, user?.role]);

  const onSubmit = async (data: ProductFormData) => {
    console.log('Form submitted', { data, images, hasVariants, variants, variantOptions });
    
    // Validate hasVariants
    if (hasVariants === null) {
      toast.error('⚠️ يرجى تحديد ما إذا كان المنتج يحتوي على متغيرات أم لا', {
        duration: 4000,
        style: {
          background: '#f59e0b',
          color: '#fff'
        }
      });
      setCurrentStep(5); // Go to variants step
      return;
    }
    
    if (images.length === 0) {
      toast.error('⚠️ يجب إضافة صورة واحدة على الأقل', {
        duration: 4000,
        style: {
          background: '#f59e0b',
          color: '#fff'
        }
      });
      setCurrentStep(2); // Go to media step
      return;
    }

    // Validate pricing logic
    if (data.wholesalerPrice && data.wholesalerPrice >= data.marketerPrice) {
      toast.error('⚠️ سعر المسوق يجب أن يكون أكبر من سعر الجملة', {
        duration: 4000,
        style: {
          background: '#f59e0b',
          color: '#fff'
        }
      });
      setCurrentStep(3); // Go to pricing step
      return;
    }

    if (data.minimumSellingPrice && data.marketerPrice >= data.minimumSellingPrice) {
      toast.error('⚠️ السعر الأدنى للبيع يجب أن يكون أكبر من سعر المسوق', {
        duration: 4000,
        style: {
          background: '#f59e0b',
          color: '#fff'
        }
      });
      setCurrentStep(3); // Go to pricing step
      return;
    }

    // Validate stock quantity based on variants
    if (hasVariants === true) {
      if (variantOptions.length === 0) {
        toast.error('⚠️ يجب إضافة متغيرات مع خيارات عند تفعيل المتغيرات', {
          duration: 4000,
          style: {
            background: '#f59e0b',
            color: '#fff'
          }
        });
        setCurrentStep(5); // Go to variants step
        return;
      }
      const totalVariantStock = variantOptions.reduce((sum, option) => sum + (option.stockQuantity || 0), 0);
      if (totalVariantStock === 0) {
        toast.error('⚠️ يجب إضافة مخزون لخيارات المتغيرات على الأقل', {
          duration: 4000,
          style: {
            background: '#f59e0b',
            color: '#fff'
          }
        });
        setCurrentStep(5); // Go to variants step
        return;
      }
    } else if (hasVariants === false) {
      // If no variants, check main stock quantity
      if (data.stockQuantity < 0) {
        toast.error('⚠️ الكمية المتوفرة يجب أن تكون 0 أو أكثر', {
          duration: 4000,
          style: {
            background: '#f59e0b',
            color: '#fff'
          }
        });
        setCurrentStep(4); // Go to inventory step
        return;
      }
    }

    setLoading(true);
    try {
      // Prepare clean data
      const isSupplier = user?.role === 'supplier';
      const productData: any = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        // Category - only for non-suppliers
        ...(!isSupplier && { categoryId: data.categoryId && data.categoryId !== '' ? data.categoryId : null }),
        marketerPrice: Number(data.marketerPrice),
        wholesalerPrice: data.wholesalerPrice && !isNaN(Number(data.wholesalerPrice)) 
          ? Number(data.wholesalerPrice) 
          : undefined,
        minimumSellingPrice: data.minimumSellingPrice && data.minimumSellingPrice > 0 ? Number(data.minimumSellingPrice) : null,
        isMinimumPriceMandatory: data.isMinimumPriceMandatory,
        // Calculate stock quantity: if product has variants, sum all variant stock quantities
        stockQuantity: hasVariants === true && variantOptions.length > 0
          ? variantOptions.reduce((sum, option) => sum + (option.stockQuantity || 0), 0)
          : Number(data.stockQuantity),
        images: images,
        // SKU - only for non-suppliers
        ...(!isSupplier && { sku: data.sku?.trim() || '' }),
        tags: tags,
        specifications: specifications.reduce((acc, spec) => {
          if (spec.key && spec.value) {
            acc[spec.key] = spec.value;
          }
          return acc;
        }, {} as Record<string, string>),
        // Product variants
        hasVariants: hasVariants === true,
        variants: hasVariants === true ? variants : [],
        variantOptions: hasVariants === true ? variantOptions : [],
        // Supplier selection for admin
        ...(user?.role === 'admin' && selectedSupplierId ? { supplierId: selectedSupplierId } : {})
      };

      console.log('Sending product data:', productData);

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();
      console.log('API response:', { status: response.status, result });
      
      if (response.ok) {
        handleSuccessfulSubmit();
        toast.success(result.message || '✅ تم إضافة المنتج بنجاح', {
          duration: 4000,
          style: {
            background: '#10b981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600'
          }
        });
        // Small delay before redirect to show success message
        setTimeout(() => {
          router.push('/dashboard/products');
        }, 1000);
      } else {
        toast.error(`❌ ${result.message || 'حدث خطأ أثناء إضافة المنتج'}`, {
          duration: 6000,
          style: {
            background: '#ef4444',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px'
          }
        });
        
        // Show validation errors if available
        if (result.errors) {
          result.errors.forEach((error: any, index: number) => {
            setTimeout(() => {
              toast.error(`⚠️ ${error.path}: ${error.message}`, {
                duration: 5000
              });
            }, index * 300); // Stagger error messages
          });
        }
      }
    } catch (error) {
      toast.error('❌ حدث خطأ في الاتصال بالخادم', {
        duration: 5000,
        style: {
          background: '#ef4444',
          color: '#fff'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentStep === STEPS.length) {
          handleSubmit(onSubmit, onError)();
        } else {
          saveDraft();
        }
      }
      
      // Esc to cancel
      if (e.key === 'Escape') {
        if (hasUnsavedChanges) {
          setUnsavedChangesAction(() => () => router.back());
          setShowUnsavedChangesModal(true);
        } else {
          router.back();
        }
      }
      
      // Arrow keys for navigation (when not in input)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (currentStep < STEPS.length) {
          nextStep();
        }
      }
      
      if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (currentStep > 1) {
          prevStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, hasUnsavedChanges, handleSubmit, onSubmit, onError, saveDraft, router, nextStep, prevStep]);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const marketerPrice = watch('marketerPrice') || 0;
  const wholesalerPrice = watch('wholesalerPrice') || undefined;
  const minimumSellingPrice = watch('minimumSellingPrice') || 0;
  const isMinimumPriceMandatory = watch('isMinimumPriceMandatory') || false;

  const progress = calculateProgress();
  const stats = useMemo(() => calculateStatistics(), [calculateStatistics]);

  // Close dropdowns when clicking outside
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 transition-all duration-300 ${isFullscreen ? 'fixed inset-0 bg-white dark:bg-slate-900 z-50 overflow-y-auto p-4' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">إضافة منتج جديد</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">أضف منتجك الجديد إلى المنصة</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Edit Mode Toggle */}
          <button
            type="button"
            onClick={() => setQuickEditMode(!quickEditMode)}
            className={`text-sm px-3 py-2 flex items-center gap-2 transition-colors ${
              quickEditMode 
                ? 'bg-primary-600 text-white hover:bg-primary-700' 
                : 'btn-secondary'
            }`}
            title={quickEditMode ? 'الوضع العادي' : 'التحرير السريع'}
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">{quickEditMode ? 'الوضع العادي' : 'التحرير السريع'}</span>
          </button>
          
          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="btn-secondary text-sm px-3 py-2 flex items-center gap-2"
            title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
          </button>
          
          {/* Templates Button */}
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="btn-secondary text-sm px-3 py-2 flex items-center gap-2"
            title="القوالب"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">القوالب</span>
          </button>
          
          {/* Auto-save indicator */}
          {isSaving ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="loading-spinner w-4 h-4"></div>
              <span className="hidden sm:inline">جاري الحفظ...</span>
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Cloud className="w-4 h-4" />
              <span className="hidden sm:inline">آخر حفظ: {lastSaved.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ) : hasUnsavedChanges ? (
            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
              <CloudOff className="w-4 h-4" />
              <span className="hidden sm:inline">غير محفوظ</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  القوالب
                </h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Save Current as Template */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">حفظ كقالب</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">احفظ المنتج الحالي كقالب للاستخدام لاحقاً</p>
                  </div>
                  <button
                    onClick={saveAsTemplate}
                    className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    حفظ
                  </button>
                </div>
              </div>

              {/* Predefined Templates */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">قوالب جاهزة</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {predefinedTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        reset(template.data);
                        setTags(template.data.tags || []);
                        setSpecifications(template.data.specifications || []);
                        setShowTemplateModal(false);
                        toast.success(`تم تحميل القالب "${template.name}"`);
                      }}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-right"
                    >
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{template.name}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved Templates */}
              {savedTemplates.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">القوالب المحفوظة</h3>
                  <div className="space-y-2">
                    {savedTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{template.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(template.createdAt).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => loadTemplate(template)}
                            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" />
                            تحميل
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="btn-secondary text-xs px-3 py-1.5 text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Errors Summary */}
      {showErrors && Object.keys(errors).length > 0 && (
        <div className="card p-4 sm:p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                يوجد {Object.keys(errors).length} خطأ في النموذج
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowErrors(false)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(errors).map(([field, error]: [string, any]) => (
              <div
                key={field}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{field}:</span> {error?.message || 'خطأ في هذا الحقل'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToError(field)}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 underline"
                >
                  الانتقال للحقل
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar & Statistics */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{progress}%</span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">التقدم: {progress}%</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            الخطوة {currentStep} من {STEPS.length}
          </div>
        </div>
        
        {/* Quick Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">الحقول المكتملة</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {stats.completedFields}/{stats.totalFields}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">نسبة الإكمال</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {stats.completionRate}%
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">الوقت المقدر</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {stats.estimatedMinutes} دقيقة
            </p>
          </div>
          <div className={`rounded-lg p-3 border ${
            stats.quality === 'ممتاز' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : stats.quality === 'جيد'
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : stats.quality === 'متوسط'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">الجودة</p>
            <p className={`text-lg font-bold ${
              stats.quality === 'ممتاز' 
                ? 'text-green-600 dark:text-green-400'
                : stats.quality === 'جيد'
                ? 'text-blue-600 dark:text-blue-400'
                : stats.quality === 'متوسط'
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {stats.quality}
            </p>
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
          <div 
            className="bg-primary-600 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps Navigation */}
        <div className="flex flex-wrap gap-2 sm:gap-4 justify-center sm:justify-between">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = isStepCompleted(step.id);
            const canAccess = canAccessStep(step.id);
            
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => canAccess && goToStep(step.id)}
                disabled={!canAccess}
                className={`
                  flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-primary-600 text-white shadow-lg scale-105' 
                    : isCompleted 
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30' 
                      : canAccess
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                  }
                  ${canAccess ? 'cursor-pointer' : 'cursor-not-allowed'}
                `}
              >
                {isCompleted && !isActive ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                ) : (
                  <StepIcon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                )}
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">{step.name}</span>
                <span className="text-xs sm:text-sm font-medium sm:hidden">{step.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4 sm:space-y-6">
        {/* Quick Edit Mode */}
        {quickEditMode ? (
          <div className="card p-4 sm:p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">التحرير السريع</h2>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                وضع مبسط للمستخدمين المتقدمين
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Essential Fields Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="text-red-500 mr-1">*</span>
                  اسم المنتج
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="اسم المنتج"
                />
                {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="text-red-500 mr-1">*</span>
                  سعر المسوق
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('marketerPrice', { valueAsNumber: true })}
                  className={`input-field ${errors.marketerPrice ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                />
                {errors.marketerPrice && <p className="text-red-600 text-xs mt-1">{errors.marketerPrice.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الكمية
                </label>
                <input
                  type="number"
                  {...register('stockQuantity', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="0"
                />
              </div>
              
              {user?.role !== 'supplier' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الفئة
                  </label>
                  <select {...register('categoryId')} className="input-field">
                    <option value="">اختر الفئة</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الوصف
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="input-field"
                  placeholder="وصف المنتج (اختياري)"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الصور
                </label>
                <MediaUpload
                  onUpload={(urls) => setImages(urls)}
                  uploadedMedia={images}
                  onRemove={(index) => setImages(images.filter((_, i) => i !== index))}
                  uploading={uploading}
                  setUploading={setUploading}
                  accept="images"
                  maxFiles={10}
                  onReorder={(reordered) => setImages(reordered)}
                  onSetPrimary={setPrimaryImageIndex}
                  primaryIndex={primaryImageIndex}
                  showPrimaryOption={true}
                />
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 في وضع التحرير السريع، يمكنك إضافة المنتج بسرعة باستخدام الحقول الأساسية فقط
                </p>
                <button
                  type="submit"
                  disabled={loading || uploading || images.length === 0}
                  className="btn-primary px-6 py-2"
                >
                  {loading ? 'جاري الإضافة...' : 'إضافة المنتج'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step Content */
          <div className="transition-all duration-300 ease-in-out">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
            <div className="card p-4 sm:p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">المعلومات الأساسية</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    <span className="text-red-500 dark:text-red-400 mr-1">*</span>
                    اسم المنتج
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">(مطلوب)</span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className={`input-field text-sm sm:text-base min-h-[44px] ${
                      errors.name ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : 
                      watch('name') && watch('name').length >= 3 ? 'border-green-500 dark:border-green-500' : ''
                    }`}
                    placeholder="أدخل اسم المنتج"
                  />
                  {errors.name && (
                    <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.name.message}
                    </p>
                  )}
                  {watch('name') && watch('name').length > 0 && watch('name').length < 3 && !errors.name && (
                    <p className="text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      يجب أن يكون اسم المنتج 3 أحرف على الأقل ({watch('name').length}/3)
                    </p>
                  )}
                  {watch('name') && watch('name').length >= 3 && !duplicateWarning && (
                    <p className="text-green-600 dark:text-green-400 text-xs sm:text-sm mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      اسم المنتج صحيح
                    </p>
                  )}
                  {duplicateWarning && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-yellow-800 dark:text-yellow-300 text-xs sm:text-sm flex items-center gap-1 mb-1">
                        <AlertCircle className="w-3 h-3" />
                        {duplicateWarning}
                      </p>
                      {similarProducts.length > 0 && (
                        <div className="text-xs text-yellow-700 dark:text-yellow-400">
                          <p className="mb-1">منتجات مشابهة:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {similarProducts.slice(0, 3).map((product: any, idx: number) => (
                              <li key={idx}>{product.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {user?.role !== 'supplier' && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        الفئة
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">(اختياري)</span>
                      </label>
                      <Tooltip 
                        content="اختر فئة المنتج لتسهيل البحث والتصنيف. يمكنك البحث في الفئات باستخدام حقل البحث أدناه."
                        icon
                      />
                    </div>
                    <div className="relative" ref={categoryDropdownRef}>
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 z-10" />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => {
                          setCategorySearch(e.target.value);
                          if (e.target.value.trim()) {
                            setShowCategoryDropdown(true);
                          }
                        }}
                        onFocus={() => {
                          if (categorySearch && filteredCategories.length > 0) {
                            setShowCategoryDropdown(true);
                          }
                        }}
                        placeholder="ابحث عن فئة..."
                        className="input-field text-sm sm:text-base min-h-[44px] pr-10 mb-2"
                      />
                      {showCategoryDropdown && filteredCategories.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                          {filteredCategories.map((category) => (
                            <button
                              key={category._id}
                              type="button"
                              onClick={() => {
                                setValue('categoryId', category._id);
                                setCategorySearch(category.name);
                                setShowCategoryDropdown(false);
                              }}
                              className="w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <select {...register('categoryId')} className="input-field text-sm sm:text-base min-h-[44px]">
                      <option value="">اختر الفئة</option>
                      {filteredCategories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {categorySearch && filteredCategories.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">لم يتم العثور على فئات مطابقة</p>
                    )}
                    {errors.categoryId && (
                      <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.categoryId.message}</p>
                    )}
                  </div>
                )}

                {/* Supplier Selection - Only for Admin */}
                {user?.role === 'admin' && (
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        المورد
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">(اختياري)</span>
                      </label>
                      <Tooltip 
                        content="اختر مورد محدد لإضافة المنتج باسمه. يمكنك البحث في الموردين باستخدام الاسم أو البريد الإلكتروني."
                        icon
                      />
                    </div>
                    
                    {/* Supplier Search */}
                    <div className="relative mb-2" ref={supplierDropdownRef}>
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 z-10" />
                      <input
                        type="text"
                        value={supplierSearch}
                        onChange={(e) => {
                          setSupplierSearch(e.target.value);
                          if (e.target.value.trim()) {
                            setShowSupplierDropdown(true);
                          }
                        }}
                        onFocus={() => {
                          if (supplierSearch && filteredSuppliers.length > 0) {
                            setShowSupplierDropdown(true);
                          }
                        }}
                        placeholder="ابحث عن مورد..."
                        className="input-field text-sm sm:text-base min-h-[44px] pr-10"
                      />
                      {showSupplierDropdown && filteredSuppliers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                          {filteredSuppliers.map((supplier) => (
                            <button
                              key={supplier._id}
                              type="button"
                              onClick={() => {
                                setSelectedSupplierId(supplier._id);
                                setSupplierSearch(supplier.companyName || supplier.name);
                                setShowSupplierDropdown(false);
                              }}
                              className="w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                            >
                              {supplier.companyName || supplier.name} {supplier.email ? `(${supplier.email})` : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="input-field text-sm sm:text-base min-h-[44px]"
                    >
                      <option value="">اختر المورد (اختياري - سيتم إضافة المنتج باسمك إذا لم تختر)</option>
                      {filteredSuppliers.map((supplier) => (
                        <option key={supplier._id} value={supplier._id}>
                          {supplier.companyName || supplier.name} {supplier.email ? `(${supplier.email})` : ''}
                        </option>
                      ))}
                    </select>
                    
                    {supplierSearch && filteredSuppliers.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">لم يتم العثور على موردين مطابقين</p>
                    )}
                    
                    {/* Selected Supplier Info */}
                    {selectedSupplierId && (
                      <div className="mt-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                        <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">المورد المختار:</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {suppliers.find(s => s._id === selectedSupplierId)?.companyName || suppliers.find(s => s._id === selectedSupplierId)?.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {suppliers.find(s => s._id === selectedSupplierId)?.email}
                        </p>
                      </div>
                    )}
                    
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                      يمكنك اختيار مورد محدد لإضافة المنتج باسمه. إذا لم تختر، سيتم إضافة المنتج باسمك كإدارة.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 sm:mt-4">
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    وصف المنتج
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">(اختياري)</span>
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {watch('description')?.length || 0} / 2000 حرف
                  </span>
                </div>
                <textarea
                  {...register('description')}
                  rows={4}
                  maxLength={2000}
                  className="input-field text-sm sm:text-base min-h-[120px]"
                  placeholder="أدخل وصف المنتج (حد أقصى 2000 حرف)"
                />
                {errors.description && (
                  <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.description.message}</p>
                )}
                {(watch('description')?.length || 0) > 1800 && (
                  <p className="text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm mt-1">
                    قربت من الحد الأقصى للأحرف
                  </p>
                )}
              </div>

              {/* Tags Section */}
              <div className="mt-4 sm:mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    العلامات (Tags)
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">(اختياري)</span>
                  </label>
                  <Tooltip 
                    content="العلامات تساعد في تحسين البحث والتصنيف. يمكنك إضافة حتى 10 علامات."
                    icon
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      placeholder="أدخل علامة واضغط Enter"
                      className="input-field text-sm sm:text-base min-h-[44px] flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => addTag(tagInput)}
                      className="btn-secondary min-h-[44px] px-4"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Tag Suggestions */}
                  {tagInput.length === 0 && generateTagSuggestions().length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">اقتراحات:</span>
                      {generateTagSuggestions().slice(0, 5).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => addTag(suggestion)}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Tags Display */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-primary-900 dark:hover:text-primary-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Specifications Section */}
              <div className="mt-4 sm:mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      المواصفات الإضافية
                      <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">(اختياري)</span>
                    </label>
                    <Tooltip 
                      content="أضف مواصفات إضافية للمنتج مثل الأبعاد، الوزن، المادة، إلخ."
                      icon
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addSpecification}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    إضافة مواصفة
                  </button>
                </div>
                
                {specifications.length > 0 && (
                  <div className="space-y-2">
                    {specifications.map((spec, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                        <input
                          type="text"
                          value={spec.key}
                          onChange={(e) => updateSpecification(index, 'key', e.target.value)}
                          placeholder="اسم المواصفة (مثل: الوزن)"
                          className="input-field text-sm sm:text-base min-h-[44px] sm:col-span-2"
                        />
                        <input
                          type="text"
                          value={spec.value}
                          onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                          placeholder="القيمة (مثل: 500 جرام)"
                          className="input-field text-sm sm:text-base min-h-[44px] sm:col-span-2"
                        />
                        <button
                          type="button"
                          onClick={() => removeSpecification(index)}
                          className="btn-secondary min-h-[44px] px-3 flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Step 2: Media */}
          {currentStep === 2 && (
            <div className="card p-4 sm:p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <ImageIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">وسائط المنتج</h2>
              </div>
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">نصيحة:</p>
                    <p>أضف صورة واحدة على الأقل للمنتج. يمكنك رفع صور وفيديوهات بحد أقصى 10 ملفات.</p>
                  </div>
                </div>
              </div>
              <MediaUpload
                onUpload={(urls) => setImages(prev => [...prev, ...urls])}
                uploadedMedia={images}
                onRemove={removeImage}
                uploading={uploading}
                setUploading={setUploading}
                accept="both"
                maxFiles={10}
                maxSize={100}
                title=""
                onReorder={handleImageReorder}
                onSetPrimary={handleSetPrimaryImage}
                primaryIndex={primaryImageIndex}
                showPrimaryOption={true}
              />
            </div>
          )}

          {/* Step 3: Pricing */}
          {currentStep === 3 && (
            <div className="card p-4 sm:p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">الأسعار</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      <span className="text-red-500 dark:text-red-400 mr-1">*</span>
                      سعر المسوق (السعر الأساسي)
                      <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">(مطلوب)</span>
                    </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register('marketerPrice', { valueAsNumber: true })}
                      className={`input-field text-sm sm:text-base pr-8 min-h-[44px] ${
                        errors.marketerPrice || (wholesalerPrice && marketerPrice <= wholesalerPrice && marketerPrice > 0) 
                          ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : 
                          marketerPrice > 0 && (!wholesalerPrice || marketerPrice > wholesalerPrice) 
                            ? 'border-green-500 dark:border-green-500' : ''
                      }`}
                      placeholder="0.00"
                    />
                    <span className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">₪</span>
                  </div>
                  {errors.marketerPrice && (
                    <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.marketerPrice.message}
                    </p>
                  )}
                  {wholesalerPrice && marketerPrice <= wholesalerPrice && marketerPrice > 0 && (
                    <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      يجب أن يكون سعر المسوق أكبر من سعر الجملة
                    </p>
                  )}
                  {marketerPrice > 0 && (!wholesalerPrice || marketerPrice > wholesalerPrice) && !errors.marketerPrice && (
                    <p className="text-green-600 dark:text-green-400 text-xs sm:text-sm mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      السعر صحيح
                    </p>
                  )}
                    <div className="flex items-center gap-1 mt-1">
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        السعر الأساسي للمسوق - يحدد ربحه عند الطلب
                      </p>
                      <Tooltip 
                        content="هذا هو السعر الذي يدفعه المسوق عند الطلب. المسوق يحدد سعر البيع للمستهلك النهائي وربحه هو الفرق بين السعرين."
                        icon
                      />
                    </div>
                </div>
              </div>

              {/* Profit Calculator */}
              {marketerPrice > 0 && (
                <div className="mt-4 sm:mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    حاسبة الأرباح
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">سعر المسوق</p>
                      </div>
                      <p className={`text-lg font-bold ${
                        isMinimumPriceMandatory && minimumSellingPrice > 0
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>{marketerPrice.toFixed(2)} ₪</p>
                    </div>
                    {minimumSellingPrice > 0 && marketerPrice < minimumSellingPrice && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">السعر الأدنى للبيع</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{minimumSellingPrice.toFixed(2)} ₪</p>
                      </div>
                    )}
                    {minimumSellingPrice > 0 && marketerPrice < minimumSellingPrice && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">هامش الربح المحتمل</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {((minimumSellingPrice - marketerPrice) / marketerPrice * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(minimumSellingPrice - marketerPrice).toFixed(2)} ₪ لكل منتج
                        </p>
                      </div>
                    )}
                  </div>
                  {minimumSellingPrice === 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                      <Info className="w-4 h-4 inline ml-1" />
                      المسوق يحدد ربحه بحرية عند الطلب
                    </p>
                  )}
                </div>
              )}

              {/* Minimum Selling Price Section */}
              <div className="mt-4 sm:mt-6 p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Info className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">السعر الأدنى للبيع</h3>
                </div>
                
                <div className="space-y-4 sm:space-y-5">
                  {/* Checkbox Section - Improved Spacing */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-0.5">
                        <input
                          type="checkbox"
                          id="isMinimumPriceMandatory"
                          {...register('isMinimumPriceMandatory')}
                          className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer transition-all"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="isMinimumPriceMandatory" className="block text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 cursor-pointer mb-1">
                          جعل السعر الأدنى للبيع إلزامياً
                        </label>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          عند تفعيل هذا الخيار، لن يتمكن المسوق من بيع المنتج بسعر أقل من السعر المحدد أدناه.
                        </p>
                        {watch('isMinimumPriceMandatory') && (
                          <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                            السعر الأدنى أصبح إلزامياً
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Price Input Section */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                      السعر الأدنى للبيع
                      <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">(اختياري)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...register('minimumSellingPrice', { valueAsNumber: true })}
                        className={`input-field text-sm sm:text-base pr-10 min-h-[48px] ${
                          errors.minimumSellingPrice || (minimumSellingPrice > 0 && marketerPrice >= minimumSellingPrice)
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : 
                            minimumSellingPrice > 0 && marketerPrice < minimumSellingPrice
                              ? 'border-green-500 dark:border-green-500 focus:ring-green-500' : ''
                        }`}
                        placeholder="0.00"
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-base font-medium">₪</span>
                    </div>
                    
                    {/* Validation Messages */}
                    <div className="mt-2 space-y-1">
                      {errors.minimumSellingPrice && (
                        <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {errors.minimumSellingPrice.message}
                        </p>
                      )}
                      {minimumSellingPrice > 0 && marketerPrice >= minimumSellingPrice && !errors.minimumSellingPrice && (
                        <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          يجب أن يكون السعر الأدنى للبيع أكبر من سعر المسوق
                        </p>
                      )}
                      {minimumSellingPrice > 0 && marketerPrice < minimumSellingPrice && !errors.minimumSellingPrice && (
                        <p className="text-green-600 dark:text-green-400 text-xs sm:text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                          السعر الأدنى للبيع صحيح
                        </p>
                      )}
                    </div>
                    
                    {/* Help Text */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {watch('isMinimumPriceMandatory') ? (
                              <>
                                <span className="font-medium text-orange-600 dark:text-orange-400">إلزامي:</span> المسوق لا يمكنه بيع المنتج بأقل من هذا السعر. المسوق يحدد ربحه عند الطلب.
                              </>
                            ) : (
                              <>
                                المسوق يمكنه بيع المنتج بأي سعر يريده. هذا السعر هو مجرد إرشاد. المسوق يحدد ربحه عند الطلب.
                              </>
                            )}
                          </p>
                          <Tooltip 
                            content="السعر الأدنى للبيع يضمن عدم بيع المنتج بسعر أقل من المحدد. إذا كان إلزامياً، لن يتمكن المسوق من بيع المنتج بأقل من هذا السعر حتى لو أراد ذلك."
                            icon
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Inventory */}
          {currentStep === 4 && (
            <div className="card p-4 sm:p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <Warehouse className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">المخزون والمواصفات</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    الكمية المتوفرة
                    {hasVariants === true && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">(يتم حسابها تلقائياً من المتغيرات)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('stockQuantity', { valueAsNumber: true })}
                    disabled={hasVariants === true}
                    className={`input-field text-sm sm:text-base min-h-[44px] ${
                      hasVariants === true ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' : ''
                    }`}
                    placeholder="0"
                  />
                  {hasVariants === true && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      يتم حساب المخزون تلقائياً من إجمالي مخزون المتغيرات
                    </p>
                  )}
                  {errors.stockQuantity && (
                    <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.stockQuantity.message}</p>
                  )}
                </div>

                {user?.role !== 'supplier' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        SKU
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">(اختياري)</span>
                      </label>
                      <button
                        type="button"
                        onClick={generateSKU}
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        توليد SKU
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        {...register('sku')}
                        onChange={(e) => {
                          setValue('sku', e.target.value);
                          checkSKU(e.target.value);
                        }}
                        className={`input-field text-sm sm:text-base min-h-[44px] ${
                          skuError ? 'border-red-500 dark:border-red-500' : ''
                        }`}
                        placeholder="أدخل SKU أو اضغط على توليد SKU"
                      />
                      {suggestedSku && watch('sku') === suggestedSku && (
                        <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                    {skuError && (
                      <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {skuError}
                      </p>
                    )}
                    {suggestedSku && !skuError && (
                      <p className="text-green-600 dark:text-green-400 text-xs sm:text-sm mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        SKU متاح: {suggestedSku}
                      </p>
                    )}
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {!watch('sku') && 'سيتم توليد SKU تلقائياً عند إدخال اسم المنتج (الفئة اختيارية)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Variants */}
          {currentStep === 5 && (
            <div className="card p-4 sm:p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <Layers className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">متغيرات المنتج</h2>
              </div>
              <ProductVariants
                hasVariants={hasVariants}
                variants={variants}
                variantOptions={variantOptions}
                onVariantsChange={handleVariantsChange}
                marketerPrice={watch('marketerPrice') || 0}
              />
            </div>
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
            <div className="space-y-6">
              {/* Live Preview */}
              <div className="card p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <Eye className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">معاينة المنتج</h2>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Product Image */}
                    <div className="space-y-4">
                      {images.length > 0 ? (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                          <img
                            src={images[primaryImageIndex] || images[0]}
                            alt={watch('name') || 'منتج'}
                            className="w-full h-full object-cover"
                          />
                          {images.length > 1 && (
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                              {primaryImageIndex + 1} / {images.length}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                          <ImageIcon className="w-16 h-16 text-gray-400 dark:text-gray-600" />
                        </div>
                      )}
                      {images.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                          {images.slice(0, 4).map((img, idx) => (
                            <div
                              key={idx}
                              className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                                (primaryImageIndex === idx || (primaryImageIndex >= 4 && idx === 3))
                                  ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                                  : 'border-transparent'
                              }`}
                              onClick={() => setPrimaryImageIndex(idx)}
                            >
                              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          {watch('name') || 'اسم المنتج'}
                        </h3>
                        {watch('categoryId') && (
                          <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm">
                            {categories.find(c => c._id === watch('categoryId'))?.name || 'فئة'}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`text-3xl font-bold ${
                            isMinimumPriceMandatory && minimumSellingPrice > 0
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {marketerPrice > 0 ? `${marketerPrice.toFixed(2)}` : '0.00'} ₪
                          </span>
                        </div>
                        {minimumSellingPrice > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            السعر الأدنى: {minimumSellingPrice.toFixed(2)} ₪
                          </p>
                        )}
                      </div>
                      
                      {watch('description') && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">الوصف:</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {watch('description')}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">المخزون</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {hasVariants === true && variantOptions.length > 0
                              ? variantOptions.reduce((sum, option) => sum + (option.stockQuantity || 0), 0)
                              : (watch('stockQuantity') || 0)} قطعة
                          </p>
                          {hasVariants === true && variantOptions.length > 0 && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              (محسوب من المتغيرات)
                            </p>
                          )}
                        </div>
                        {hasVariants === true && variants.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">المتغيرات</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {variantOptions.length} خيار
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Review Details */}
              <div className="card p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <Info className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">تفاصيل المراجعة</h2>
                </div>
              
              <div className="space-y-6">
                {/* Basic Info Review */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    المعلومات الأساسية
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">اسم المنتج:</span>
                      <span className="mr-2 font-medium text-gray-900 dark:text-gray-100">{watch('name') || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">الفئة:</span>
                      <span className="mr-2 font-medium text-gray-900 dark:text-gray-100">
                        {categories.find(c => c._id === watch('categoryId'))?.name || 'غير محدد'}
                      </span>
                    </div>
                    {watch('description') && (
                      <div className="md:col-span-2">
                        <span className="text-gray-600 dark:text-gray-400">الوصف:</span>
                        <p className="mr-2 mt-1 text-gray-900 dark:text-gray-100">{watch('description')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Media Review */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    الوسائط ({images.length} ملف)
                  </h3>
                  {images.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {images.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {images.length > 4 && (
                        <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">+{images.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      يجب إضافة صورة واحدة على الأقل
                    </p>
                  )}
                </div>

                {/* Pricing Review */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    الأسعار
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">سعر المسوق:</span>
                      <span className={`mr-2 font-medium ${
                        watch('isMinimumPriceMandatory') && watch('minimumSellingPrice')
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {watch('marketerPrice') || 0} ₪
                      </span>
                    </div>
                    {watch('minimumSellingPrice') && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">السعر الأدنى:</span>
                        <span className="mr-2 font-medium text-gray-900 dark:text-gray-100">{watch('minimumSellingPrice')} ₪</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inventory Review */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Warehouse className="w-4 h-4" />
                    المخزون
                  </h3>
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">الكمية المتوفرة:</span>
                    <span className="mr-2 font-medium text-gray-900 dark:text-gray-100">
                      {hasVariants === true && variantOptions.length > 0
                        ? variantOptions.reduce((sum, option) => sum + (option.stockQuantity || 0), 0)
                        : (watch('stockQuantity') || 0)}
                    </span>
                    {hasVariants === true && variantOptions.length > 0 && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 mr-2">(محسوب من المتغيرات)</span>
                    )}
                  </div>
                </div>

                {/* Variants Review */}
                {hasVariants === true && variants.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      المتغيرات ({variantOptions.length} خيار)
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {variants.map(v => v.name).join('، ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
          </div>
        )}
      </form>

      {/* Navigation Buttons - Hide in Quick Edit Mode */}
      {!quickEditMode && (
        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3 space-y-2 sm:space-y-0 space-y-reverse sm:space-x-3 sm:space-x-reverse sticky bottom-0 bg-white dark:bg-slate-900 p-3 sm:p-4 -mx-2 sm:-mx-4 md:-mx-6 border-t border-gray-200 dark:border-slate-700 z-10 shadow-lg">
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary min-h-[44px] text-sm sm:text-base flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                السابق
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (hasUnsavedChanges) {
                  setUnsavedChangesAction(() => () => {
                    localStorage.removeItem('product-draft');
                    router.back();
                  });
                  setShowUnsavedChangesModal(true);
                } else {
                  localStorage.removeItem('product-draft');
                  router.back();
                }
              }}
              className="btn-secondary min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
            >
              إلغاء
            </button>
          </div>
          
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            {currentStep < STEPS.length ? (
              <>
                <button
                  type="button"
                  onClick={saveDraft}
                  className="btn-secondary min-h-[44px] text-sm sm:text-base flex items-center justify-center gap-2 w-full sm:w-auto"
                  title="حفظ المسودة (Ctrl+S)"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">حفظ مسودة</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    markStepCompleted(currentStep);
                    nextStep();
                  }}
                  disabled={!validateStep(currentStep)}
                  className="btn-primary min-h-[44px] text-sm sm:text-base flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  title="التالي (Ctrl+→)"
                >
                  التالي
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(onSubmit, onError)()}
                disabled={loading || uploading || !validateStep(6)}
                className="btn-primary min-h-[44px] text-sm sm:text-base flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                title="حفظ المنتج (Ctrl+S)"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner w-4 h-4"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                    حفظ المنتج
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Draft Restore Modal */}
      <DraftRestoreModal
        isOpen={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        onRestore={handleRestoreDraft}
        onDismiss={handleDismissDraft}
        onDelete={handleDeleteDraft}
        draftData={draftData}
        loading={isRestoringDraft}
      />

      {/* Template Name Modal */}
      <TemplateNameModal
        isOpen={showTemplateNameModal}
        onClose={() => setShowTemplateNameModal(false)}
        onConfirm={handleTemplateNameConfirm}
        existingNames={savedTemplates.map(t => t.name)}
      />

      {/* Template Load Confirm Modal */}
      <TemplateLoadConfirmModal
        isOpen={showTemplateLoadModal}
        onClose={() => {
          setShowTemplateLoadModal(false);
          setSelectedTemplate(null);
        }}
        onConfirm={handleTemplateLoadConfirm}
        template={selectedTemplate}
      />

      {/* Template Delete Confirm Modal */}
      <TemplateDeleteConfirmModal
        isOpen={showTemplateDeleteModal}
        onClose={() => {
          setShowTemplateDeleteModal(false);
          setTemplateToDelete(null);
          setSelectedTemplate(null);
        }}
        onConfirm={handleTemplateDeleteConfirm}
        template={selectedTemplate}
      />

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedChangesModal}
        onClose={() => {
          setShowUnsavedChangesModal(false);
          setUnsavedChangesAction(null);
        }}
        onDiscard={() => {
          if (unsavedChangesAction) {
            unsavedChangesAction();
          }
        }}
        onSaveDraft={() => {
          saveDraft();
          if (unsavedChangesAction) {
            setTimeout(() => {
              unsavedChangesAction();
            }, 500);
          }
        }}
        hasDraft={hasUnsavedChanges}
      />
    </div>
  );
} 