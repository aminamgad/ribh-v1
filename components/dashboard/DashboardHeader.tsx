'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { useChat } from '@/components/providers/ChatProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useDataCache } from '@/components/providers/DataCacheProvider';
import { Bell, ChevronDown, User, ShoppingCart, MessageSquare, Menu, Search, RotateCw } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useRouter, usePathname } from 'next/navigation';
import { OptimizedImage } from '@/components/ui/LazyImage';
import { toast } from 'react-hot-toast';

export default function DashboardHeader() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { unreadCount } = useNotifications();
  const { totalUnread: totalUnreadChats } = useChat();
  const { settings } = useSettings();
  const { refreshData, clearAllCache } = useDataCache();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);


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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Dispatch custom refresh event for current page
      const eventName = `refresh-${pathname.replace('/dashboard/', '').replace(/\//g, '-') || 'dashboard'}`;
      window.dispatchEvent(new CustomEvent(eventName));
      
      // Also dispatch general refresh events
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      window.dispatchEvent(new CustomEvent('refresh-products'));
      window.dispatchEvent(new CustomEvent('refresh-orders'));
      
      // Clear cache for current page pattern
      const cacheKeyPattern = pathname.replace('/dashboard/', '').split('/')[0] || 'dashboard';
      refreshData(`page_${pathname}`);
      
      // Refresh common cache keys
      const commonKeys = [
        'dashboard_stats',
        'products',
        'orders',
        'users',
        'analytics',
        'categories',
        'wallet',
        'withdrawals',
        'earnings',
        'fulfillment',
        'messages',
        'notifications',
        'favorites',
        'villages',
        'product_stats',
        'integrations',
        'cart',
        'chat'
      ];
      
      commonKeys.forEach(key => refreshData(key));
      
      // Force page reload to trigger data refresh
      router.refresh();
      
      toast.success('جاري تحديث البيانات...', { duration: 2000 });
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
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
    <header className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg border-b border-gray-200/50 dark:border-slate-700/50 fixed top-0 left-0 right-0 z-50 shadow-xl dark:shadow-slate-900/30 safe-area-top">
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/dashboard" className="flex items-center group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 mr-1.5 sm:mr-2 md:mr-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <OptimizedImage
                  src="/logo.png"
                  alt="ربح"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain rounded-lg sm:rounded-xl md:rounded-2xl"
                  priority={true}
                />
              </div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#FF9800] group-hover:scale-105 transition-transform duration-300 hidden sm:block">
                {settings?.platformName || 'ربح'}
              </h1>
            </Link>
          </div>

          {/* Search Bar - Always for Products Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-slate-300 pointer-events-none" />
              <input
                type="text"
                placeholder="البحث عن المنتجات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 text-sm sm:text-base bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:border-transparent transition-all duration-300"
                title="البحث عن المنتجات"
              />
            </form>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 space-x-reverse">
            {/* Theme Toggle */}
            <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ThemeToggle />
            </div>

            {/* Cart Icon for Marketer/Wholesaler */}
            {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
              <Link 
                href="/dashboard/cart" 
                className="relative min-w-[44px] min-h-[44px] p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105 flex items-center justify-center"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-[#FF9800] to-[#F57C00] text-white text-[10px] sm:text-xs rounded-full min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 flex items-center justify-center px-1 animate-bounce shadow-lg font-semibold">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>
            )}

            {/* Chat Icon */}
            <Link 
              href="/dashboard/chat" 
              className="relative min-w-[44px] min-h-[44px] p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105 flex items-center justify-center"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 group-hover:text-[#4CAF50] dark:group-hover:text-[#4CAF50] transition-colors duration-300" />
              {totalUnreadChats > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-[#4CAF50] to-[#388E3C] text-white text-[10px] sm:text-xs rounded-full min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 flex items-center justify-center px-1 animate-bounce shadow-lg font-semibold">
                  {totalUnreadChats > 99 ? '99+' : totalUnreadChats}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <Link 
              href="/dashboard/notifications" 
              className="relative min-w-[44px] min-h-[44px] p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105 flex items-center justify-center"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-[#FF9800] to-[#F57C00] text-white text-[10px] sm:text-xs rounded-full min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 flex items-center justify-center px-1 animate-bounce shadow-lg font-semibold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center min-w-[44px] min-h-[44px] p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105"
              >
                <div className="ml-2 sm:ml-3 text-right hidden md:block">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-200 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300 truncate max-w-[120px]">
                    {user?.name}
                  </p>
                  {user?.role !== 'marketer' && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${roleColors[user?.role || 'marketer']}`}>
                      {roleLabels[user?.role || 'marketer']}
                    </span>
                  )}
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-[#FF9800] via-[#F57C00] to-[#E65100] flex items-center justify-center mr-1 sm:mr-2 md:mr-3 group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white" />
                </div>
                <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 dark:text-slate-300 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''} hidden md:block`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute left-0 mt-2 sm:mt-3 w-56 sm:w-64 rounded-xl sm:rounded-2xl shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-gray-200/50 dark:border-slate-700/50 py-2 z-50 animate-scale-in">
                  <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{user?.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-300 truncate">{user?.email}</p>
                    {user?.role !== 'marketer' && (
                      <div className="mt-1.5 sm:mt-2">
                        <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${roleColors[user?.role || 'marketer']}`}>
                          {roleLabels[user?.role || 'marketer']}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      الإعدادات
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button - Last element, appears on far left in RTL */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="relative min-w-[44px] min-h-[44px] p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="تحديث البيانات"
            >
              <RotateCw 
                className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </button>
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