'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Home,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  MessageSquare,
  Wallet,
  Settings,
} from 'lucide-react';

export default function BottomNavBar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const getNavItems = () => {
    if (!user) return [];

    const baseItems = [
      {
        href: '/dashboard',
        label: 'الرئيسية',
        icon: Home,
      },
    ];

    switch (user.role) {
      case 'admin':
        return [
          ...baseItems,
          {
            href: '/dashboard/products',
            label: 'المنتجات',
            icon: Package,
          },
          {
            href: '/dashboard/orders',
            label: 'الطلبات',
            icon: ShoppingBag,
          },
          {
            href: '/dashboard/users',
            label: 'المستخدمين',
            icon: Users,
          },
          {
            href: '/dashboard/analytics',
            label: 'التحليلات',
            icon: BarChart3,
          },
        ];
      case 'supplier':
        return [
          ...baseItems,
          {
            href: '/dashboard/products',
            label: 'المنتجات',
            icon: Package,
          },
          {
            href: '/dashboard/orders',
            label: 'الطلبات',
            icon: ShoppingBag,
          },
          {
            href: '/dashboard/messages',
            label: 'الرسائل',
            icon: MessageSquare,
          },
          {
            href: '/dashboard/wallet',
            label: 'المحفظة',
            icon: Wallet,
          },
        ];
      case 'marketer':
        return [
          ...baseItems,
          {
            href: '/dashboard/products',
            label: 'المنتجات',
            icon: Package,
          },
          {
            href: '/dashboard/orders',
            label: 'الطلبات',
            icon: ShoppingBag,
          },
          {
            href: '/dashboard/messages',
            label: 'الرسائل',
            icon: MessageSquare,
          },
          {
            href: '/dashboard/wallet',
            label: 'المحفظة',
            icon: Wallet,
          },
        ];
      case 'wholesaler':
        return [
          ...baseItems,
          {
            href: '/dashboard/products',
            label: 'المنتجات',
            icon: Package,
          },
          {
            href: '/dashboard/orders',
            label: 'الطلبات',
            icon: ShoppingBag,
          },
          {
            href: '/dashboard/cart',
            label: 'السلة',
            icon: ShoppingBag,
          },
          {
            href: '/dashboard/settings',
            label: 'الإعدادات',
            icon: Settings,
          },
        ];
      default:
        return baseItems;
    }
  };

  const navItems = getNavItems();

  if (navItems.length === 0) return null;

  // Don't show on certain pages (like chat, new/edit forms)
  const hideOnPages = [
    '/dashboard/chat',
    '/dashboard/products/new',
    '/dashboard/users/new',
    '/dashboard/orders/',
  ];

  const shouldHide = hideOnPages.some(page => pathname.startsWith(page));
  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 z-40 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 px-1 py-2 rounded-lg transition-colors active:scale-95 ${
                isActive
                  ? 'text-[#FF9800] dark:text-[#FFB74D]'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-[#FF9800] dark:text-[#FFB74D]' : ''}`} />
              <span className="text-[10px] font-medium truncate w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

