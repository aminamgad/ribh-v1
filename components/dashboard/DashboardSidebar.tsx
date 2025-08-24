'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  Home,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  MessageSquare,
  Wallet,
  Settings,
  FileText,
  Truck,
  Store,
  TrendingUp,
  Shield,
  Bell,
  ChevronRight,
  ShoppingCart,
  CheckCircle,
  Clock,
  UserCheck,
  Menu,
  Sparkles,
  DollarSign,
  X,
} from 'lucide-react';

interface DashboardSidebarProps {
  onClose?: () => void;
}

export default function DashboardSidebar({ onClose }: DashboardSidebarProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getNavigationItems = () => {
    const baseItems = [
      {
        href: '/dashboard',
        label: 'الرئيسية',
        icon: Home,
        gradient: 'from-blue-500 to-indigo-600',
        bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
        borderColor: 'border-blue-200 dark:border-blue-700',
      },
    ];

    switch (user?.role) {
      case 'admin':
        return [
          ...baseItems,
          {
            href: '/dashboard/users',
            label: 'إدارة المستخدمين',
            icon: Users,
            gradient: 'from-purple-500 to-pink-600',
            bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
            borderColor: 'border-purple-200 dark:border-purple-700',
          },
          {
            href: '/dashboard/products',
            label: 'إدارة المنتجات',
            icon: Package,
            gradient: 'from-emerald-500 to-green-600',
            bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-700',
          },
          {
            href: '/dashboard/orders',
            label: 'إدارة الطلبات',
            icon: ShoppingBag,
            gradient: 'from-orange-500 to-red-600',
            bgGradient: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
            borderColor: 'border-orange-200 dark:border-orange-700',
          },
          {
            href: '/dashboard/admin/categories',
            label: 'إدارة الفئات',
            icon: FileText,
            gradient: 'from-indigo-500 to-purple-600',
            bgGradient: 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20',
            borderColor: 'border-indigo-200 dark:border-indigo-700',
          },
          {
            href: '/dashboard/admin/earnings',
            label: 'تقرير الأرباح',
            icon: DollarSign,
            gradient: 'from-green-500 to-emerald-600',
            bgGradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
            borderColor: 'border-green-200 dark:border-green-700',
          },
          {
            href: '/dashboard/admin/withdrawals',
            label: 'طلبات السحب',
            icon: Wallet,
            gradient: 'from-cyan-500 to-blue-600',
            bgGradient: 'from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20',
            borderColor: 'border-cyan-200 dark:border-cyan-700',
          },
          {
            href: '/dashboard/analytics',
            label: 'التحليلات',
            icon: BarChart3,
            gradient: 'from-violet-500 to-purple-600',
            bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
            borderColor: 'border-violet-200 dark:border-violet-700',
          },
          {
            href: '/dashboard/messages',
            label: 'الرسائل',
            icon: MessageSquare,
            gradient: 'from-teal-500 to-cyan-600',
            bgGradient: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
            borderColor: 'border-teal-200 dark:border-teal-700',
          },
          {
            href: '/dashboard/settings',
            label: 'الإعدادات',
            icon: Settings,
            gradient: 'from-gray-500 to-slate-600',
            bgGradient: 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20',
            borderColor: 'border-gray-200 dark:border-slate-700',
          },
        ];

      case 'supplier':
        return [
          ...baseItems,
          {
            href: '/dashboard/products',
            label: 'منتجاتي',
            icon: Package,
            gradient: 'from-emerald-500 to-green-600',
            bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-700',
          },
          {
            href: '/dashboard/orders',
            label: 'الطلبات',
            icon: ShoppingBag,
            gradient: 'from-orange-500 to-red-600',
            bgGradient: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
            borderColor: 'border-orange-200 dark:border-orange-700',
          },
          {
            href: '/dashboard/fulfillment',
            label: 'طلبات التخزين',
            icon: Truck,
            gradient: 'from-blue-500 to-cyan-600',
            bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
            borderColor: 'border-blue-200 dark:border-blue-700',
          },
          {
            href: '/dashboard/integrations',
            label: 'التكاملات',
            icon: Store,
            gradient: 'from-purple-500 to-pink-600',
            bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
            borderColor: 'border-purple-200 dark:border-purple-700',
          },
          {
            href: '/dashboard/analytics',
            label: 'التحليلات',
            icon: BarChart3,
            gradient: 'from-violet-500 to-purple-600',
            bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
            borderColor: 'border-violet-200 dark:border-violet-700',
          },
          {
            href: '/dashboard/messages',
            label: 'الرسائل',
            icon: MessageSquare,
            gradient: 'from-teal-500 to-cyan-600',
            bgGradient: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
            borderColor: 'border-teal-200 dark:border-teal-700',
          },
          {
            href: '/dashboard/wallet',
            label: 'المحفظة',
            icon: Wallet,
            gradient: 'from-cyan-500 to-blue-600',
            bgGradient: 'from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20',
            borderColor: 'border-cyan-200 dark:border-cyan-700',
          },
          {
            href: '/dashboard/withdrawals',
            label: 'السحوبات',
            icon: DollarSign,
            gradient: 'from-green-500 to-emerald-600',
            bgGradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
            borderColor: 'border-green-200 dark:border-green-700',
          },
          {
            href: '/dashboard/settings',
            label: 'الإعدادات',
            icon: Settings,
            gradient: 'from-gray-500 to-slate-600',
            bgGradient: 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20',
            borderColor: 'border-gray-200 dark:border-slate-700',
          },
        ];

      case 'marketer':
        return [
          ...baseItems,
          {
            href: '/dashboard/products',
            label: 'المنتجات',
            icon: Package,
            gradient: 'from-emerald-500 to-green-600',
            bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-700',
          },
          {
            href: '/dashboard/orders',
            label: 'طلباتي',
            icon: ShoppingBag,
            gradient: 'from-orange-500 to-red-600',
            bgGradient: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
            borderColor: 'border-orange-200 dark:border-orange-700',
          },
          {
            href: '/dashboard/cart',
            label: 'سلة المشتريات',
            icon: ShoppingCart,
            gradient: 'from-blue-500 to-indigo-600',
            bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
            borderColor: 'border-blue-200 dark:border-blue-700',
          },
          {
            href: '/dashboard/favorites',
            label: 'المفضلة',
            icon: Sparkles,
            gradient: 'from-pink-500 to-rose-600',
            bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',
            borderColor: 'border-pink-200 dark:border-pink-700',
          },
          {
            href: '/dashboard/chat',
            label: 'المحادثات',
            icon: MessageSquare,
            gradient: 'from-teal-500 to-cyan-600',
            bgGradient: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
            borderColor: 'border-teal-200 dark:border-teal-700',
          },
          {
            href: '/dashboard/notifications',
            label: 'الإشعارات',
            icon: Bell,
            gradient: 'from-amber-500 to-yellow-600',
            bgGradient: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
            borderColor: 'border-amber-200 dark:border-amber-700',
          },
          {
            href: '/dashboard/settings',
            label: 'الإعدادات',
            icon: Settings,
            gradient: 'from-gray-500 to-slate-600',
            bgGradient: 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20',
            borderColor: 'border-gray-200 dark:border-slate-700',
          },
        ];

      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  const handleLinkClick = () => {
    // Close mobile sidebar when link is clicked
    if (onClose) {
      onClose();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    } lg:block ${onClose ? 'w-full' : ''}`}>
      {/* Desktop Collapse Button */}
      {!onClose && (
        <div className="hidden lg:flex items-center justify-end p-4 border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          {!collapsed && !onClose && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                {user?.name || 'المستخدم'}
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-400 truncate">
                {user?.role === 'admin' && 'مدير النظام'}
                {user?.role === 'supplier' && 'المورد'}
                {user?.role === 'marketer' && 'المسوق'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`sidebar-link group relative ${
                  isActive ? 'active' : ''
                } ${collapsed && !onClose ? 'justify-center' : ''}`}
              >
                <div className={`flex items-center space-x-3 space-x-reverse ${collapsed && !onClose ? 'justify-center' : ''}`}>
                  <div className={`sidebar-icon w-5 h-5 transition-all duration-300 ${
                    isActive ? `text-white` : `text-gray-600 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-slate-100`
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {(!collapsed || onClose) && (
                    <span className="text-sm font-medium transition-all duration-300">
                      {item.label}
                    </span>
                  )}
                </div>
                
                {/* Active indicator */}
                {isActive && (
                  <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b ${item.gradient} rounded-r-lg`} />
                )}
                
                {/* Hover gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-r ${item.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg -z-10`} />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      {(!collapsed || onClose) && (
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <div className="text-xs text-gray-600 dark:text-slate-400 text-center">
            ربح v1.0.0
          </div>
        </div>
      )}
    </div>
  );
} 