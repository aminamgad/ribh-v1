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
} from 'lucide-react';

export default function DashboardSidebar() {
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
      {
        href: '/dashboard/notifications',
        label: 'الإشعارات',
        icon: Bell,
        gradient: 'from-amber-500 to-orange-600',
        bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
        borderColor: 'border-amber-200 dark:border-amber-700',
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
            href: '/dashboard/fulfillment',
            label: 'طلبات التخزين',
            icon: Truck,
            gradient: 'from-teal-500 to-cyan-600',
            bgGradient: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
            borderColor: 'border-teal-200 dark:border-teal-700',
          },
          {
            href: '/dashboard/messages',
            label: 'إدارة الرسائل',
            icon: MessageSquare,
            gradient: 'from-pink-500 to-rose-600',
            bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',
            borderColor: 'border-pink-200 dark:border-pink-700',
          },
          {
            href: '/dashboard/chat',
            label: 'المحادثات المباشرة',
            icon: MessageSquare,
            gradient: 'from-cyan-500 to-blue-600',
            bgGradient: 'from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20',
            borderColor: 'border-cyan-200 dark:border-cyan-700',
          },
          {
            href: '/dashboard/wallet',
            label: 'إدارة المحافظ',
            icon: Wallet,
            gradient: 'from-emerald-500 to-teal-600',
            bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-700',
          },
          {
            href: '/dashboard/analytics',
            label: 'الإحصائيات المتقدمة',
            icon: BarChart3,
            gradient: 'from-violet-500 to-purple-600',
            bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
            borderColor: 'border-violet-200 dark:border-violet-700',
          },
          {
            href: '/dashboard/admin/settings',
            label: 'إعدادات النظام',
            icon: Settings,
            gradient: 'from-slate-500 to-gray-600',
            bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20',
            borderColor: 'border-slate-200 dark:border-slate-700',
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
            label: 'طلباتي',
            icon: ShoppingBag,
            gradient: 'from-orange-500 to-red-600',
            bgGradient: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
            borderColor: 'border-orange-200 dark:border-orange-700',
          },
          {
            href: '/dashboard/fulfillment',
            label: 'طلبات التخزين',
            icon: Truck,
            gradient: 'from-teal-500 to-cyan-600',
            bgGradient: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
            borderColor: 'border-teal-200 dark:border-teal-700',
          },
          {
            href: '/dashboard/messages',
            label: 'الرسائل',
            icon: MessageSquare,
            gradient: 'from-pink-500 to-rose-600',
            bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',
            borderColor: 'border-pink-200 dark:border-pink-700',
          },
          {
            href: '/dashboard/chat',
            label: 'الدعم المباشر',
            icon: MessageSquare,
            gradient: 'from-cyan-500 to-blue-600',
            bgGradient: 'from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20',
            borderColor: 'border-cyan-200 dark:border-cyan-700',
          },
          {
            href: '/dashboard/wallet',
            label: 'محفظتي',
            icon: Wallet,
            gradient: 'from-emerald-500 to-teal-600',
            bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-700',
          },
          {
            href: '/dashboard/analytics',
            label: 'إحصائياتي',
            icon: BarChart3,
            gradient: 'from-violet-500 to-purple-600',
            bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
            borderColor: 'border-violet-200 dark:border-violet-700',
          },
        ];

      case 'marketer':
        return [
          ...baseItems,
          {
            href: '/dashboard/products',
            label: 'تصفح المنتجات',
            icon: Store,
            gradient: 'from-emerald-500 to-green-600',
            bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-700',
          },
          {
            href: '/dashboard/cart',
            label: 'سلة التسوق',
            icon: ShoppingCart,
            gradient: 'from-blue-500 to-indigo-600',
            bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
            borderColor: 'border-blue-200 dark:border-blue-700',
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
            href: '/dashboard/favorites',
            label: 'المفضلة',
            icon: TrendingUp,
            gradient: 'from-red-500 to-pink-600',
            bgGradient: 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
            borderColor: 'border-red-200 dark:border-red-700',
          },
          {
            href: '/dashboard/integrations',
            label: 'تكاملات المتاجر',
            icon: Store,
            gradient: 'from-purple-500 to-indigo-600',
            bgGradient: 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20',
            borderColor: 'border-purple-200 dark:border-purple-700',
          },
          {
            href: '/dashboard/messages',
            label: 'الرسائل',
            icon: MessageSquare,
            gradient: 'from-pink-500 to-rose-600',
            bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',
            borderColor: 'border-pink-200 dark:border-pink-700',
          },
          {
            href: '/dashboard/chat',
            label: 'الدعم المباشر',
            icon: MessageSquare,
            gradient: 'from-cyan-500 to-blue-600',
            bgGradient: 'from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20',
            borderColor: 'border-cyan-200 dark:border-cyan-700',
          },
          {
            href: '/dashboard/wallet',
            label: 'محفظتي',
            icon: Wallet,
            gradient: 'from-emerald-500 to-teal-600',
            bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-700',
          },
          {
            href: '/dashboard/analytics',
            label: 'إحصائياتي',
            icon: BarChart3,
            gradient: 'from-violet-500 to-purple-600',
            bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
            borderColor: 'border-violet-200 dark:border-violet-700',
          },
        ];

      case 'wholesaler':
        return [
          ...baseItems,
          {
            href: '/dashboard/products',
            label: 'تصفح المنتجات',
            icon: Store,
            gradient: 'from-emerald-500 to-green-600',
            bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-700',
          },
          {
            href: '/dashboard/cart',
            label: 'سلة التسوق',
            icon: ShoppingCart,
            gradient: 'from-blue-500 to-indigo-600',
            bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
            borderColor: 'border-blue-200 dark:border-blue-700',
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
            href: '/dashboard/favorites',
            label: 'المفضلة',
            icon: TrendingUp,
            gradient: 'from-red-500 to-pink-600',
            bgGradient: 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
            borderColor: 'border-red-200 dark:border-red-700',
          },
          {
            href: '/dashboard/integrations',
            label: 'تكاملات المتاجر',
            icon: Store,
            gradient: 'from-purple-500 to-indigo-600',
            bgGradient: 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20',
            borderColor: 'border-purple-200 dark:border-purple-700',
          },
          {
            href: '/dashboard/messages',
            label: 'الرسائل',
            icon: MessageSquare,
            gradient: 'from-pink-500 to-rose-600',
            bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',
            borderColor: 'border-pink-200 dark:border-pink-700',
          },
          {
            href: '/dashboard/chat',
            label: 'الدعم المباشر',
            icon: MessageSquare,
            gradient: 'from-cyan-500 to-blue-600',
            bgGradient: 'from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20',
            borderColor: 'border-cyan-200 dark:border-cyan-700',
          },
          {
            href: '/dashboard/wallet',
            label: 'محفظتي',
            icon: Wallet,
            gradient: 'from-emerald-500 to-teal-600',
            bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-700',
          },
          {
            href: '/dashboard/analytics',
            label: 'إحصائياتي',
            icon: BarChart3,
            gradient: 'from-violet-500 to-purple-600',
            bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
            borderColor: 'border-violet-200 dark:border-violet-700',
          },
        ];

      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  if (!mounted) {
    return (
      <aside className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl dark:shadow-slate-900/30 border-l border-gray-200/50 dark:border-slate-700/50 w-64">
        <div className="p-4 border-b border-gray-100/50 dark:border-slate-700/50">
          <div className="w-full h-8 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
        <nav className="px-3 py-4">
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside className={`bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl dark:shadow-slate-900/30 border-l border-gray-200/50 dark:border-slate-700/50 transition-all duration-300 ${
      collapsed ? 'w-20' : 'w-72'
    }`}>
      {/* Header with Toggle Button */}
      <div className="p-4 border-b border-gray-100/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {settings?.platformName || 'ربح'}
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100/80 dark:hover:bg-slate-700/80 rounded-xl transition-all duration-200 group"
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''} group-hover:scale-110`} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 flex-1 overflow-y-auto scrollbar-thin">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? `bg-gradient-to-r ${item.bgGradient} ${item.borderColor} border-r-4 shadow-lg dark:shadow-slate-900/30 text-gray-900 dark:text-slate-100`
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100/80 dark:hover:bg-slate-700/80 hover:text-gray-900 dark:hover:text-slate-100'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  {/* Active background gradient */}
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.bgGradient} opacity-80`} />
                  )}
                  
                  {/* Icon with gradient */}
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 group-hover:scale-110 ${
                    isActive 
                      ? `bg-gradient-to-br ${item.gradient} shadow-lg` 
                      : 'bg-gray-100/80 dark:bg-slate-700/80 group-hover:bg-gray-200/80 dark:group-hover:bg-slate-600/80'
                  }`}>
                    <Icon className={`w-4 h-4 transition-all duration-300 ${
                      isActive ? 'text-white' : 'text-gray-500 dark:text-slate-300 group-hover:text-gray-700 dark:group-hover:text-slate-200'
                    }`} />
                  </div>
                  
                  {!collapsed && (
                    <span className={`mr-3 transition-all duration-300 relative z-10 ${isActive ? 'font-semibold' : ''}`}>
                      {item.label}
                    </span>
                  )}
                  
                  {/* Active indicator */}
                  {isActive && !collapsed && (
                    <div className="mr-auto relative z-10">
                      <div className={`w-2 h-2 bg-gradient-to-br ${item.gradient} rounded-full animate-pulse shadow-lg`} />
                    </div>
                  )}
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-slate-100/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Status */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-100/50 dark:border-slate-700/50">
          <div className="bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-slate-700/50 dark:to-slate-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-200/50 dark:border-slate-600/50 shadow-lg dark:shadow-slate-900/30">
            <div className="flex items-center mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                user?.isVerified 
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                  : 'bg-gradient-to-br from-amber-500 to-orange-600'
              }`}>
                {user?.isVerified ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Clock className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="mr-3 flex-1">
                <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {user?.isVerified ? 'حساب موثق' : 'حساب قيد المراجعة'}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-300">
                  {user?.role === 'supplier' && !user?.isVerified
                    ? 'في انتظار موافقة الإدارة'
                    : 'حساب نشط'}
                </div>
              </div>
            </div>
            
            {/* Role Badge */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ${
                user?.role === 'admin' ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700' :
                user?.role === 'supplier' ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700' :
                user?.role === 'marketer' ? 'bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700' :
                'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700'
              }`}>
                <UserCheck className="w-3 h-3 ml-1" />
                {user?.role === 'admin' ? 'الإدارة' :
                 user?.role === 'supplier' ? 'المورد' :
                 user?.role === 'marketer' ? 'المسوق' :
                 'تاجر الجملة'}
              </span>
              
              {/* Status dot */}
              <div className={`w-3 h-3 rounded-full ${
                user?.isVerified ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              } shadow-lg`} />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
} 