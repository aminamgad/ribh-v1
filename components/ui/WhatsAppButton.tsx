'use client';

import { MessageCircle } from 'lucide-react';
import { useState } from 'react';

interface WhatsAppButtonProps {
  phone: string;
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'full';
  children?: React.ReactNode;
}

export default function WhatsAppButton({ 
  phone, 
  message = '', 
  className = '', 
  size = 'md',
  variant = 'icon',
  children 
}: WhatsAppButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const openWhatsApp = () => {
    if (!phone) return;
    
    setIsLoading(true);
    
    try {
      // Format phone number for international format
      const formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '970');
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      // Silently handle errors
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const variantClasses = {
    icon: `p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors ${sizeClasses[size]}`,
    button: `flex items-center space-x-2 space-x-reverse bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors ${sizeClasses[size]}`,
    full: `flex items-center justify-center w-full bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors ${sizeClasses[size]}`
  };

  if (!phone) return null;

  return (
    <button
      onClick={openWhatsApp}
      disabled={isLoading}
      className={`${variantClasses[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      title="تواصل عبر واتساب"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full border-b-2 border-current" />
      ) : (
        <>
          <MessageCircle className="w-4 h-4" />
          {variant !== 'icon' && children && <span>{children}</span>}
        </>
      )}
    </button>
  );
}
