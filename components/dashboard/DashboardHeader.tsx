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
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      // Always navigate to products page with search query
      router.push(`/dashboard/products?q=${encodeURIComponent(query)}`);
    } else {
      // If empty, just go to products page
      router.push('/dashboard/products');
    }
  };

  const roleLabels = {
    admin: 'الإدارة',
    supplier: 'المورد',
    marketer: 'المسوق',
    wholesaler: 'تاجر الجملة'
  };

  const roleColors = {
    admin: 'bg-gradient-to-r from-[#FF9800]/20 to-[#F57C00]/20 dark:from-[#FF9800]/30 dark:to-[#F57C00]/30 text-[#FF9800] dark:text-[#FF9800] border-[#FF9800]/30 dark:border-[#FF9800]/40',
    supplier: 'bg-gradient-to-r from-[#4CAF50]/20 to-[#388E3C]/20 dark:from-[#4CAF50]/30 dark:to-[#388E3C]/30 text-[#4CAF50] dark:text-[#4CAF50] border-[#4CAF50]/30 dark:border-[#4CAF50]/40',
    marketer: 'bg-gradient-to-r from-[#FF9800]/20 to-[#F57C00]/20 dark:from-[#FF9800]/30 dark:to-[#F57C00]/30 text-[#FF9800] dark:text-[#FF9800] border-[#FF9800]/30 dark:border-[#FF9800]/40',
    wholesaler: 'bg-gradient-to-r from-[#4CAF50]/20 to-[#388E3C]/20 dark:from-[#4CAF50]/30 dark:to-[#388E3C]/30 text-[#4CAF50] dark:text-[#4CAF50] border-[#4CAF50]/30 dark:border-[#4CAF50]/40'
  };

  if (!mounted) {
    return (
      <header className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg border-b border-gray-200/50 dark:border-slate-700/50 fixed top-0 left-0 right-0 z-50 shadow-xl dark:shadow-slate-900/30">
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
    <header className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg border-b border-gray-200/50 dark:border-slate-700/50 fixed top-0 left-0 right-0 z-50 shadow-xl dark:shadow-slate-900/30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <img 
                  src="/logo.png" 
                  alt="ربح" 
                  className="w-full h-full object-contain rounded-xl sm:rounded-2xl"
                />
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#FF9800] group-hover:scale-105 transition-transform duration-300">
                {settings?.platformName || 'ربح'}
              </h1>
            </Link>
          </div>

          {/* Search Bar - Always for Products Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-slate-300 pointer-events-none" />
              <input
                type="text"
                placeholder="البحث عن المنتجات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:border-transparent transition-all duration-300"
                title="البحث عن المنتجات"
              />
            </form>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Cart Icon for Marketer/Wholesaler */}
            {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
              <Link 
                href="/dashboard/cart" 
                className="relative p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#FF9800] to-[#F57C00] text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-bounce shadow-lg">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}

            {/* Chat Icon */}
            <Link 
              href="/dashboard/chat" 
              className="relative p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 group-hover:text-[#4CAF50] dark:group-hover:text-[#4CAF50] transition-colors duration-300" />
              {totalUnreadChats > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#4CAF50] to-[#388E3C] text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-bounce shadow-lg">
                  {totalUnreadChats}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <Link 
              href="/dashboard/notifications" 
              className="relative p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#FF9800] to-[#F57C00] text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-bounce shadow-lg">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105"
              >
                <div className="ml-2 sm:ml-3 text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300">
                    {user?.name}
                  </p>
                  {user?.role !== 'marketer' && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[user?.role || 'marketer']}`}>
                      {roleLabels[user?.role || 'marketer']}
                    </span>
                  )}
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-[#FF9800] via-[#F57C00] to-[#E65100] flex items-center justify-center mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-slate-300 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''} hidden sm:block`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute left-0 mt-3 w-64 rounded-2xl shadow-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200/50 dark:border-slate-700/50 py-2 z-50 animate-scale-in">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-300">{user?.email}</p>
                    {user?.role !== 'marketer' && (
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${roleColors[user?.role || 'marketer']}`}>
                          {roleLabels[user?.role || 'marketer']}
                        </span>
                      </div>
                    )}
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