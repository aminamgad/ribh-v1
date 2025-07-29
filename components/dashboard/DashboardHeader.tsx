'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { useChat } from '@/components/providers/ChatProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Bell, ChevronDown, LogOut, Settings, User, ShoppingCart, MessageSquare, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useRouter } from 'next/navigation';

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { totalItems } = useCart();
  const { unreadCount } = useNotifications();
  const { totalUnread: totalUnreadChats } = useChat();
  const { settings } = useSettings();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Debug: طباعة قيمة العداد
  console.log('=== DASHBOARD HEADER DEBUG ===');
  console.log('totalUnreadChats:', totalUnreadChats);
  console.log('user:', user?.name);
  console.log('=============================');

  // مراقبة التغييرات في العداد
  useEffect(() => {
    console.log('Header: totalUnreadChats changed to:', totalUnreadChats);
  }, [totalUnreadChats]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const roleLabels = {
    admin: 'الإدارة',
    supplier: 'المورد',
    marketer: 'المسوق',
    wholesaler: 'تاجر الجملة'
  };

  const roleColors = {
    admin: 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700',
    supplier: 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
    marketer: 'bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700',
    wholesaler: 'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700'
  };

  if (!mounted) {
    return (
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40 shadow-xl dark:shadow-slate-900/30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="h-8 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              <div className="w-32 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-gray-200/50 dark:border-slate-700/50 sticky top-0 z-40 shadow-xl dark:shadow-slate-900/30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <span className="text-white font-bold text-xl">
                  {settings?.platformName?.charAt(0) || 'ر'}
                </span>
              </div>
              <h1 className="text-2xl font-bold gradient-text group-hover:scale-105 transition-transform duration-300">
                {settings?.platformName || 'ربح'}
              </h1>
            </Link>
          </div>

          {/* Search Bar - Only for Admin */}
          {user?.role === 'admin' && (
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="البحث في المنصة..."
                  className="w-full pl-4 pr-10 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                />
              </div>
            </div>
          )}

          {/* Right side actions */}
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Cart Icon for Marketer/Wholesaler */}
            {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
              <Link 
                href="/dashboard/cart" 
                className="relative p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105"
              >
                <ShoppingCart className="w-5 h-5 text-gray-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce shadow-lg">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}

            {/* Chat Icon */}
            <Link 
              href="/dashboard/chat" 
              className="relative p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105"
            >
              <MessageSquare className="w-5 h-5 text-gray-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
              {totalUnreadChats > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce shadow-lg">
                  {totalUnreadChats}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <Link 
              href="/dashboard/notifications" 
              className="relative p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce shadow-lg">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105"
              >
                <div className="ml-3 text-right">
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {user?.name}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[user?.role || 'marketer']}`}>
                    {roleLabels[user?.role || 'marketer']}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-slate-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute left-0 mt-3 w-64 rounded-2xl shadow-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200/50 dark:border-slate-700/50 py-2 z-50 animate-scale-in">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{user?.email}</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${roleColors[user?.role || 'marketer']}`}>
                        {roleLabels[user?.role || 'marketer']}
                      </span>
                    </div>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4 ml-3" />
                      الإعدادات
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="flex items-center w-full text-right px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4 ml-3" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop for dropdown */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
} 