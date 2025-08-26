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
        gradient: 'from-[#FF9800] to-[#F57C00]',
        bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
        borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
        textColor: 'text-[#E65100] dark:text-[#FFB74D]',
        hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
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
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/products',
            label: 'إدارة المنتجات',
            icon: Package,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/orders',
            label: 'إدارة الطلبات',
            icon: ShoppingBag,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/admin/categories',
            label: 'إدارة الفئات',
            icon: FileText,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/admin/earnings',
            label: 'تقرير الأرباح',
            icon: DollarSign,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/admin/withdrawals',
            label: 'طلبات السحب',
            icon: Wallet,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/analytics',
            label: 'التحليلات',
            icon: BarChart3,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/messages',
            label: 'الرسائل',
            icon: MessageSquare,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/settings',
            label: 'الإعدادات',
            icon: Settings,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
        ];

      case 'supplier':
        return [
          ...baseItems,
          {
            href: '/dashboard/products',
            label: 'منتجاتي',
            icon: Package,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/orders',
            label: 'الطلبات',
            icon: ShoppingBag,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/fulfillment',
            label: 'طلبات التخزين',
            icon: Truck,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/integrations',
            label: 'التكاملات',
            icon: Store,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/analytics',
            label: 'التحليلات',
            icon: BarChart3,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/messages',
            label: 'الرسائل',
            icon: MessageSquare,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/wallet',
            label: 'المحفظة',
            icon: Wallet,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/withdrawals',
            label: 'السحوبات',
            icon: DollarSign,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/settings',
            label: 'الإعدادات',
            icon: Settings,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
        ];

      case 'marketer':
        return [
          ...baseItems,
          {
            href: '/dashboard/products',
            label: 'المنتجات',
            icon: Package,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/orders',
            label: 'طلباتي',
            icon: ShoppingBag,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/cart',
            label: 'سلة المشتريات',
            icon: ShoppingCart,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/favorites',
            label: 'المفضلة',
            icon: Sparkles,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/chat',
            label: 'المحادثات',
            icon: MessageSquare,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
          },
          {
            href: '/dashboard/notifications',
            label: 'الإشعارات',
            icon: Bell,
            gradient: 'from-[#4CAF50] to-[#388E3C]',
            bgGradient: 'from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20',
            borderColor: 'border-[#4CAF50]/20 dark:border-[#4CAF50]/30',
            textColor: 'text-[#2E7D32] dark:text-[#81C784]',
            hoverTextColor: 'group-hover:text-[#2E7D32] dark:group-hover:text-[#81C784]',
          },
          {
            href: '/dashboard/settings',
            label: 'الإعدادات',
            icon: Settings,
            gradient: 'from-[#FF9800] to-[#F57C00]',
            bgGradient: 'from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20',
            borderColor: 'border-[#FF9800]/20 dark:border-[#FF9800]/30',
            textColor: 'text-[#E65100] dark:text-[#FFB74D]',
            hoverTextColor: 'group-hover:text-[#E65100] dark:group-hover:text-[#FFB74D]',
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
    <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-l border-gray-200/50 dark:border-slate-700/50 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    } lg:block ${onClose ? 'w-full' : ''}`}>
      {/* Desktop Collapse Button */}
      {!onClose && (
        <div className="hidden lg:flex items-center justify-end p-4 border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 text-gray-600 dark:text-slate-400 hover:text-[#FF9800] dark:hover:text-[#FFB74D] transition-colors rounded-lg hover:bg-[#FF9800]/10 dark:hover:bg-[#FF9800]/20"
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-10 h-10 bg-gradient-to-r from-[#FF9800] to-[#F57C00] rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
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
                data-color={item.gradient.includes('FF9800') ? 'orange' : 'green'}
              >
                <div className={`flex items-center space-x-3 space-x-reverse ${collapsed && !onClose ? 'justify-center' : ''}`}>
                  <div className={`sidebar-icon w-5 h-5 transition-all duration-300 ${
                    isActive ? (item.gradient.includes('FF9800') ? 'text-[#E65100] dark:text-white' : 'text-[#2E7D32] dark:text-white') : `text-gray-600 dark:text-slate-400 ${item.hoverTextColor}`
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {(!collapsed || onClose) && (
                    <span className={`text-sm font-medium transition-all duration-300 ${
                      isActive ? (item.gradient.includes('FF9800') ? 'text-[#E65100] dark:text-white' : 'text-[#2E7D32] dark:text-white') : `text-gray-700 dark:text-slate-300 ${item.hoverTextColor}`
                    }`}>
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
          <span className="text-[#FF9800] dark:text-[#FFB74D] font-semibold">ربح</span> v1.0.0
        </div>
        </div>
      )}
    </div>
  );
} 