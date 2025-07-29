'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/types';
import toast from 'react-hot-toast';

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
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
            console.warn('Invalid cart item found, removing:', item);
            return false;
          }
          
          // Ensure price is valid
          if (item.price === undefined || item.price === null || isNaN(item.price) || item.price <= 0) {
            console.warn('Invalid price found for item:', item.product.name, 'Price:', item.price);
            return false;
          }
          
          // Ensure quantity is valid
          if (!item.quantity || item.quantity <= 0) {
            console.warn('Invalid quantity found for item:', item.product.name);
            return false;
          }
          
          console.log('Valid cart item:', item.product.name, 'Price:', item.price, 'Quantity:', item.quantity);
          return true;
        });
        
        console.log('Loaded cart items:', validItems.length);
        setItems(validItems);
      } catch (error) {
        console.error('Error loading cart:', error);
        // Clear invalid cart data
        localStorage.removeItem('ribh-cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (items.length > 0) {
      console.log('Saving cart items:', items.map(item => ({
        name: item.product.name,
        price: item.price,
        quantity: item.quantity
      })));
      localStorage.setItem('ribh-cart', JSON.stringify(items));
      console.log('Saved cart items:', items.length);
    } else {
      localStorage.removeItem('ribh-cart');
      console.log('Cleared cart from localStorage');
    }
  }, [items]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const itemPrice = item.price || 0;
    const itemQuantity = item.quantity || 0;
    const itemTotal = itemPrice * itemQuantity;
    
    console.log('Calculating total for item:', item.product.name, 'Price:', itemPrice, 'Quantity:', itemQuantity, 'Total:', itemTotal);
    
    return sum + (isNaN(itemTotal) ? 0 : itemTotal);
  }, 0);

  const addToCart = (product: Product, quantity: number = 1) => {
    console.log('Adding product to cart:', product);
    
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.product._id === product._id);
      
      if (existingItem) {
        // Check stock availability
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stockQuantity) {
          return currentItems; // Return without toast - let the page handle it
        }
        
        // تحديث الكمية بدون إشعار
        return currentItems.map(item =>
          item.product._id === product._id
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // Check stock availability
        if (quantity > product.stockQuantity) {
          return currentItems; // Return without toast - let the page handle it
        }
        
        // Get the appropriate price based on user role
        // Default to marketer price, fallback to wholesale price, then cost price
        let price = product.marketerPrice;
        console.log('Product prices:', {
          name: product.name,
          marketerPrice: product.marketerPrice,
          wholesalePrice: product.wholesalePrice,
          costPrice: product.costPrice
        });
        
        if (price === undefined || price === null || isNaN(price) || price <= 0) {
          price = product.wholesalePrice;
          console.log('Using wholesale price:', price);
        }
        if (price === undefined || price === null || isNaN(price) || price <= 0) {
          price = product.costPrice;
          console.log('Using cost price:', price);
        }
        if (price === undefined || price === null || isNaN(price) || price <= 0) {
          price = 0;
          console.error('No valid price found for product:', product.name);
        }
        
        console.log('Final price for product:', product.name, 'Price:', price);
        
        // Ensure we have all required product data with fallbacks
        const cartProduct = {
          _id: product._id,
          name: product.name || 'منتج بدون اسم',
          description: product.description || '',
          images: product.images || [],
          marketerPrice: product.marketerPrice || 0,
          wholesalePrice: product.wholesalePrice || 0,
          costPrice: product.costPrice || 0,
          stockQuantity: product.stockQuantity || 0,
          supplierId: product.supplierId || '',
          categoryId: product.categoryId || '',
          isActive: product.isActive !== undefined ? product.isActive : true,
          isApproved: product.isApproved !== undefined ? product.isApproved : false,
          isRejected: product.isRejected !== undefined ? product.isRejected : false,
          tags: product.tags || [],
          sku: product.sku || '',
          createdAt: product.createdAt || new Date().toISOString(),
          updatedAt: product.updatedAt || new Date().toISOString()
        };
        
        console.log('Adding product to cart:', cartProduct.name, 'Price:', price);
        // لا إشعار هنا - الصفحة ستتعامل مع الإشعار
        return [...currentItems, { product: cartProduct, quantity, price }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(currentItems => {
      const item = currentItems.find(item => item.product._id === productId);
      if (item) {
        console.log('Removing product from cart:', item.product.name);
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
        console.warn('Product not found in cart:', productId);
        return currentItems;
      }

      // Check stock availability
      if (quantity > item.product.stockQuantity) {
        toast.error('الكمية المطلوبة غير متوفرة في المخزون');
        return currentItems;
      }

      console.log('Updating quantity for product:', item.product.name, 'Old quantity:', item.quantity, 'New quantity:', quantity, 'Price:', item.price);
      return currentItems.map(item =>
        item.product._id === productId
          ? { ...item, quantity }
          : item
      );
    });
  };

  const clearCart = () => {
    console.log('Clearing cart');
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

  // Debug logging
  useEffect(() => {
    console.log('Cart state updated:', {
      itemsCount: items.length,
      totalItems,
      totalPrice,
      items: items.map(item => ({
        name: item.product.name,
        price: item.price,
        quantity: item.quantity
      }))
    });
  }, [items, totalItems, totalPrice]);

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