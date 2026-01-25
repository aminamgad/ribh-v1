'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, ProductVariantOption } from '@/types';
import toast from 'react-hot-toast';

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  selectedVariants?: Record<string, string>;
  variantOption?: ProductVariantOption; // The specific variant option selected
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addToCart: (product: Product, quantity?: number, selectedVariants?: Record<string, string>, variantOption?: ProductVariantOption) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('ribh-cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        
        // Validate and clean the cart data
        const validItems = parsedCart.filter((item: any) => {
          // Check if item has required fields
          if (!item || !item.product || !item.product._id) {
            return false;
          }
          
          // Ensure price is valid
          if (item.price === undefined || item.price === null || isNaN(item.price) || item.price <= 0) {
            return false;
          }
          
          // Ensure quantity is valid
          if (!item.quantity || item.quantity <= 0) {
            return false;
          }
          
          return true;
        });
        
        setItems(validItems);
      } catch (error) {
        // Clear invalid cart data
        localStorage.removeItem('ribh-cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('ribh-cart', JSON.stringify(items));
    } else {
      localStorage.removeItem('ribh-cart');
    }
  }, [items]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const itemPrice = item.price || 0;
    const itemQuantity = item.quantity || 0;
    const itemTotal = itemPrice * itemQuantity;
    
    
    return sum + (isNaN(itemTotal) ? 0 : itemTotal);
  }, 0);

  const addToCart = (product: Product, quantity: number = 1, selectedVariants?: Record<string, string>, variantOption?: any) => {
    
    // Create a unique cart item ID that includes variant information
    const cartItemId = selectedVariants && Object.keys(selectedVariants).length > 0 
      ? `${product._id}-${JSON.stringify(selectedVariants)}`
      : product._id;
    
    setItems((currentItems: any[]) => {
      const existingItem = currentItems.find(item => {
        if (selectedVariants && Object.keys(selectedVariants).length > 0) {
          return item.product._id === product._id && 
                 JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants);
        }
        return item.product._id === product._id && !item.selectedVariants;
      });
      
      // Determine price and stock based on variants
      let finalPrice = product.marketerPrice;
      let finalStock = product.stockQuantity;
      
      if (variantOption) {
        finalPrice += (variantOption.price || 0);
        finalStock = variantOption.stockQuantity || 0;
      }
      
      if (existingItem) {
        // Check stock availability
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > finalStock) {
          return currentItems; // Return without toast - let the page handle it
        }
        
        // تحديث الكمية بدون إشعار
        return currentItems.map(item => {
          if (selectedVariants && Object.keys(selectedVariants).length > 0) {
            return (item.product._id === product._id && 
                   JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants))
              ? { ...item, quantity: newQuantity }
              : item;
          }
          return (item.product._id === product._id && !item.selectedVariants)
            ? { ...item, quantity: newQuantity }
            : item;
        });
      } else {
        // Check stock availability
        if (quantity > finalStock) {
          return currentItems; // Return without toast - let the page handle it
        }
        
        // Get the appropriate price based on user role
        if (finalPrice === undefined || finalPrice === null || isNaN(finalPrice) || finalPrice <= 0) {
          finalPrice = product.wholesalerPrice;
        }
        if (finalPrice === undefined || finalPrice === null || isNaN(finalPrice) || finalPrice <= 0) {
          finalPrice = 0;
        }
        
        // Ensure we have all required product data with fallbacks
        const cartProduct = {
          _id: product._id,
          name: product.name || 'منتج بدون اسم',
          description: product.description || '',
          images: product.images || [],
          marketerPrice: product.marketerPrice || 0,
          wholesalerPrice: product.wholesalerPrice || 0,
          minimumSellingPrice: product.minimumSellingPrice || null,
          isMinimumPriceMandatory: product.isMinimumPriceMandatory || false,
          stockQuantity: product.stockQuantity || 0,
          supplierId: product.supplierId || '',
          categoryId: product.categoryId || '',
          isActive: product.isActive !== undefined ? product.isActive : true,
          isApproved: product.isApproved !== undefined ? product.isApproved : false,
          isRejected: product.isRejected !== undefined ? product.isRejected : false,
          tags: product.tags || [],
          sku: product.sku || '',
          createdAt: product.createdAt || new Date().toISOString(),
          updatedAt: product.updatedAt || new Date().toISOString(),
          // Include variant information
          hasVariants: product.hasVariants || false,
          variants: product.variants || [],
          variantOptions: product.variantOptions || []
        };
        
        // لا إشعار هنا - الصفحة ستتعامل مع الإشعار
        return [...currentItems, { 
          product: cartProduct, 
          quantity, 
          price: finalPrice,
          selectedVariants,
          variantOption
        }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(currentItems => {
      const item = currentItems.find(item => item.product._id === productId);
      if (item) {
        toast.success('تم إزالة المنتج من السلة');
      }
      return currentItems.filter(item => item.product._id !== productId);
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setItems(currentItems => {
      const item = currentItems.find(item => item.product._id === productId);
      if (!item) {
        return currentItems;
      }

      // Check stock availability
      if (quantity > item.product.stockQuantity) {
        toast.error('الكمية المطلوبة غير متوفرة في المخزون');
        return currentItems;
      }
      return currentItems.map(item =>
        item.product._id === productId
          ? { ...item, quantity }
          : item
      );
    });
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('ribh-cart');
    toast.success('تم تفريغ السلة');
  };

  const isInCart = (productId: string): boolean => {
    return items.some(item => item.product._id === productId);
  };

  const getItemQuantity = (productId: string): number => {
    const item = items.find(item => item.product._id === productId);
    return item ? item.quantity : 0;
  };

  const value = {
    items,
    totalItems,
    totalPrice,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart,
    getItemQuantity
  };


  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 