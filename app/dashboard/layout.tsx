'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { useChat } from '@/components/providers/ChatProvider';
import { DataCacheProvider, useDataCache as useDataCacheContext } from '@/components/providers/DataCacheProvider';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import BottomNavBar from '@/components/dashboard/BottomNavBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Menu, X, RotateCw, Bell, ShoppingCart, MessageSquare, User, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { unreadCount } = useNotifications();
  const { totalUnread: totalUnreadChats } = useChat();
  const { refreshData } = useDataCacheContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (sidebarOpen && !target.closest('.sidebar-container') && !target.closest('.mobile-menu-button')) {
        setSidebarOpen(false);
      }
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen, showUserMenu]);

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
      ];
      
      commonKeys.forEach(key => refreshData(key));
      
      // Force page reload to trigger data refresh
      router.refresh();
      
      toast.success('جاري تحديث البيانات...', { duration: 2000 });
    } catch (error) {
      console.error('Error refreshing data:', error);
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

  // Load external chat widget for admin and marketer
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'marketer')) {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="uae.fw-cdn.com"]');
      if (existingScript) {
        return; // Script already loaded
      }

      // Add comprehensive CSS to style the chat widget with site identity colors
      const style = document.createElement('style');
      style.id = 'ribh-chat-widget-styles';
      style.textContent = `
        /* Chat Widget Styling - Match Site Identity (Ribh) */
        /* Primary Orange: #FF9800, Dark Orange: #F57C00, Green: #4CAF50 */
        
        /* Universal selectors for chat widget */
        *[class*="chat"] *,
        *[id*="chat"] *,
        *[class*="widget"] *,
        *[id*="widget"] *,
        *[class*="fw"] *,
        *[id*="fw"] * {
          /* Override all colors to match site identity */
        }
        
        /* Chat widget button/icon - Primary Orange */
        *[class*="chat"] button,
        *[id*="chat"] button,
        *[class*="widget"] button,
        *[id*="widget"] button,
        *[class*="fw"] button,
        *[id*="fw"] button,
        *[class*="chat"] a[class*="button"],
        *[id*="chat"] a[class*="button"],
        *[class*="chat"] div[class*="button"],
        *[id*="chat"] div[class*="button"],
        *[class*="chat"] [role="button"],
        *[id*="chat"] [role="button"] {
          background-color: #FF9800 !important;
          background: linear-gradient(135deg, #FF9800, #F57C00) !important;
          background-image: linear-gradient(135deg, #FF9800, #F57C00) !important;
          border-color: #F57C00 !important;
          border: 2px solid #F57C00 !important;
          color: #ffffff !important;
          fill: #ffffff !important;
        }
        
        *[class*="chat"] button:hover,
        *[id*="chat"] button:hover,
        *[class*="widget"] button:hover,
        *[class*="fw"] button:hover,
        *[class*="chat"] a[class*="button"]:hover,
        *[id*="chat"] a[class*="button"]:hover {
          background-color: #F57C00 !important;
          background: linear-gradient(135deg, #F57C00, #E65100) !important;
          background-image: linear-gradient(135deg, #F57C00, #E65100) !important;
        }
        
        *[class*="chat"] button:active,
        *[id*="chat"] button:active {
          background-color: #E65100 !important;
        }
        
        /* Chat widget icon/circle - Orange */
        *[class*="chat"] svg,
        *[id*="chat"] svg,
        *[class*="widget"] svg,
        *[class*="fw"] svg,
        *[class*="chat"] [class*="icon"],
        *[id*="chat"] [class*="icon"],
        *[class*="chat"] [class*="circle"],
        *[id*="chat"] [class*="circle"] {
          fill: #FF9800 !important;
          color: #FF9800 !important;
          background-color: #FF9800 !important;
        }
        
        /* Chat widget container/window */
        *[class*="chat"] [class*="container"],
        *[class*="chat"] [class*="window"],
        *[class*="chat"] [class*="panel"],
        *[class*="chat"] [class*="popup"],
        *[id*="chat"] [class*="container"],
        *[id*="chat"] [class*="window"],
        *[class*="fw"] [class*="container"] {
          border-color: #FF9800 !important;
          border: 2px solid #FF9800 !important;
          box-shadow: 0 4px 20px rgba(255, 152, 0, 0.3) !important;
        }
        
        /* Chat widget header */
        *[class*="chat"] [class*="header"],
        *[class*="chat"] [class*="title"],
        *[class*="chat"] [class*="top"],
        *[id*="chat"] [class*="header"],
        *[id*="chat"] [class*="title"],
        *[class*="fw"] [class*="header"] {
          background-color: #FF9800 !important;
          background: linear-gradient(135deg, #FF9800, #F57C00) !important;
          background-image: linear-gradient(135deg, #FF9800, #F57C00) !important;
          color: #ffffff !important;
        }
        
        /* Chat widget input fields */
        *[class*="chat"] input[type="text"],
        *[class*="chat"] input[type="message"],
        *[class*="chat"] textarea,
        *[class*="chat"] [class*="input"],
        *[class*="chat"] [class*="message-input"],
        *[id*="chat"] input,
        *[id*="chat"] textarea {
          border-color: #FF9800 !important;
          border: 2px solid #FF9800 !important;
        }
        
        *[class*="chat"] input:focus,
        *[class*="chat"] textarea:focus,
        *[id*="chat"] input:focus,
        *[id*="chat"] textarea:focus {
          border-color: #F57C00 !important;
          border: 2px solid #F57C00 !important;
          box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.2) !important;
          outline: none !important;
        }
        
        /* Chat widget send button */
        *[class*="chat"] [class*="send"],
        *[class*="chat"] button[type="submit"],
        *[class*="chat"] [class*="submit"],
        *[id*="chat"] [class*="send"],
        *[id*="chat"] button[type="submit"] {
          background-color: #FF9800 !important;
          background: linear-gradient(135deg, #FF9800, #F57C00) !important;
          color: #ffffff !important;
          border-color: #F57C00 !important;
        }
        
        *[class*="chat"] [class*="send"]:hover,
        *[class*="chat"] button[type="submit"]:hover,
        *[id*="chat"] [class*="send"]:hover {
          background-color: #F57C00 !important;
          background: linear-gradient(135deg, #F57C00, #E65100) !important;
        }
        
        /* Chat widget links */
        *[class*="chat"] a,
        *[id*="chat"] a {
          color: #FF9800 !important;
        }
        
        *[class*="chat"] a:hover,
        *[id*="chat"] a:hover {
          color: #F57C00 !important;
        }
        
        /* Chat widget badges/notifications */
        *[class*="chat"] [class*="badge"],
        *[class*="chat"] [class*="notification"],
        *[class*="chat"] [class*="count"],
        *[class*="chat"] [class*="unread"],
        *[id*="chat"] [class*="badge"],
        *[id*="chat"] [class*="notification"] {
          background-color: #4CAF50 !important;
          color: #ffffff !important;
        }
        
        /* Chat widget floating button/icon */
        *[class*="chat"] [class*="float"],
        *[class*="chat"] [class*="toggle"],
        *[id*="chat"] [class*="float"],
        *[id*="chat"] [class*="toggle"],
        *[class*="chat-widget"],
        *[id*="chat-widget"] {
          background-color: #FF9800 !important;
          background: linear-gradient(135deg, #FF9800, #F57C00) !important;
          color: #ffffff !important;
          fill: #ffffff !important;
          box-shadow: 0 4px 20px rgba(255, 152, 0, 0.4) !important;
        }
        
        *[class*="chat"] [class*="float"]:hover,
        *[class*="chat"] [class*="toggle"]:hover,
        *[id*="chat"] [class*="float"]:hover {
          background-color: #F57C00 !important;
          background: linear-gradient(135deg, #F57C00, #E65100) !important;
          box-shadow: 0 6px 25px rgba(255, 152, 0, 0.5) !important;
          transform: scale(1.05) !important;
        }
        
        /* Override any inline styles */
        *[style*="background"]:has([class*="chat"]),
        *[style*="background"]:has([id*="chat"]) {
          background-color: #FF9800 !important;
        }
      `;
      document.head.appendChild(style);

      // Create and add script
      const script = document.createElement('script');
      script.src = '//uae.fw-cdn.com/40321464/198896.js';
      script.setAttribute('chat', 'true');
      script.async = true;
      
      // Apply styles immediately when script loads
      script.onload = () => {
        console.log('Chat widget script loaded, applying custom styles...');
        
        // Function to apply styles to chat widget elements
        const applyChatStyles = () => {
          // Find all possible chat widget elements
          const allElements = document.querySelectorAll('*');
          
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              const className = el.className?.toString() || '';
              const id = el.id || '';
              
              // Check if element is part of chat widget
              if (className.includes('chat') || className.includes('widget') || 
                  className.includes('fw') || id.includes('chat') || 
                  id.includes('widget') || id.includes('fw')) {
                
                // Style buttons
                if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' ||
                    className.includes('button') || className.includes('btn')) {
                  el.style.cssText += `
                    background-color: #FF9800 !important;
                    background: linear-gradient(135deg, #FF9800, #F57C00) !important;
                    border-color: #F57C00 !important;
                    color: #ffffff !important;
                    fill: #ffffff !important;
                  `;
                  
                  // Add hover effect
                  el.addEventListener('mouseenter', function() {
                    this.style.backgroundColor = '#F57C00';
                    this.style.background = 'linear-gradient(135deg, #F57C00, #E65100)';
                  });
                  
                  el.addEventListener('mouseleave', function() {
                    this.style.backgroundColor = '#FF9800';
                    this.style.background = 'linear-gradient(135deg, #FF9800, #F57C00)';
                  });
                }
                
                // Style SVG icons
                const svgs = el.querySelectorAll('svg');
                svgs.forEach(svg => {
                  svg.style.fill = '#FF9800';
                  svg.style.color = '#FF9800';
                });
                
                // Style inputs
                const inputs = el.querySelectorAll('input, textarea');
                inputs.forEach(input => {
                  const htmlInput = input as HTMLElement;
                  htmlInput.style.borderColor = '#FF9800';
                  htmlInput.style.borderWidth = '2px';
                  htmlInput.addEventListener('focus', () => {
                    htmlInput.style.borderColor = '#F57C00';
                    htmlInput.style.boxShadow = '0 0 0 3px rgba(255, 152, 0, 0.2)';
                  });
                });
              }
            }
          });
        };
        
        // Apply styles immediately
        applyChatStyles();
        
        // Apply styles again after a delay (widget might load asynchronously)
        setTimeout(applyChatStyles, 1000);
        setTimeout(applyChatStyles, 3000);
        setTimeout(applyChatStyles, 5000);
      };
      
      document.body.appendChild(script);
      
      // Use MutationObserver to catch dynamically added elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const className = node.className?.toString() || '';
              const id = node.id || '';
              
              if (className.includes('chat') || className.includes('widget') || 
                  className.includes('fw') || id.includes('chat') || 
                  id.includes('widget') || id.includes('fw')) {
                
                // Apply styles to the new element
                if (node.tagName === 'BUTTON' || node.getAttribute('role') === 'button') {
                  node.style.cssText += `
                    background-color: #FF9800 !important;
                    background: linear-gradient(135deg, #FF9800, #F57C00) !important;
                    border-color: #F57C00 !important;
                    color: #ffffff !important;
                  `;
                }
                
                // Apply styles to children
                const buttons = node.querySelectorAll('button, [role="button"], [class*="button"]');
                buttons.forEach(btn => {
                  if (btn instanceof HTMLElement) {
                    btn.style.cssText += `
                      background-color: #FF9800 !important;
                      background: linear-gradient(135deg, #FF9800, #F57C00) !important;
                      border-color: #F57C00 !important;
                      color: #ffffff !important;
                    `;
                  }
                });
                
                const svgs = node.querySelectorAll('svg');
                svgs.forEach(svg => {
                  svg.style.fill = '#FF9800';
                  svg.style.color = '#FF9800';
                });
              }
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id', 'style']
      });

      return () => {
        // Cleanup: remove script and styles when component unmounts or user changes
        const scriptToRemove = document.querySelector('script[src*="uae.fw-cdn.com"]');
        if (scriptToRemove) {
          scriptToRemove.remove();
        }
        const styleToRemove = document.getElementById('ribh-chat-widget-styles');
        if (styleToRemove) {
          styleToRemove.remove();
        }
        observer.disconnect();
      };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Mobile Header */}
      <div className="mobile-header lg:hidden">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mobile-menu-button p-1.5 sm:p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 truncate">ربح</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 space-x-reverse flex-shrink-0">
            {/* Theme Toggle */}
            <div className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center">
              <ThemeToggle />
            </div>

            {/* Cart Icon for Marketer/Wholesaler */}
            {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
              <Link 
                href="/dashboard/cart" 
                className="relative min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105 flex items-center justify-center"
              >
                <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-600 dark:text-slate-300 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-[#FF9800] to-[#F57C00] text-white text-[9px] sm:text-[10px] rounded-full min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] flex items-center justify-center px-0.5 sm:px-1 animate-bounce shadow-lg font-semibold">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>
            )}

            {/* Chat Icon */}
            <Link 
              href="/dashboard/chat" 
              className="relative min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105 flex items-center justify-center"
            >
              <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-600 dark:text-slate-300 group-hover:text-[#4CAF50] dark:group-hover:text-[#4CAF50] transition-colors duration-300" />
              {totalUnreadChats > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-[#4CAF50] to-[#388E3C] text-white text-[9px] sm:text-[10px] rounded-full min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] flex items-center justify-center px-0.5 sm:px-1 animate-bounce shadow-lg font-semibold">
                  {totalUnreadChats > 99 ? '99+' : totalUnreadChats}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <Link 
              href="/dashboard/notifications" 
              className="relative min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105 flex items-center justify-center"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-600 dark:text-slate-300 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-[#FF9800] to-[#F57C00] text-white text-[9px] sm:text-[10px] rounded-full min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] flex items-center justify-center px-0.5 sm:px-1 animate-bounce shadow-lg font-semibold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="relative user-menu-container">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-1 sm:p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105"
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-[#FF9800] via-[#F57C00] to-[#E65100] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute left-0 mt-2 w-56 rounded-xl shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-gray-200/50 dark:border-slate-700/50 py-2 z-50 animate-scale-in">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-300 truncate">{user?.email}</p>
                    {user?.role !== 'marketer' && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-gradient-to-r from-[#FF9800]/20 to-[#F57C00]/20 dark:from-[#FF9800]/30 dark:to-[#F57C00]/30 text-[#FF9800] dark:text-[#FF9800] border-[#FF9800]/30 dark:border-[#FF9800]/40">
                          {roleLabels[user?.role || 'marketer']}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
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
              className="relative min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/30 transition-all duration-300 group hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="تحديث البيانات"
            >
              <RotateCw 
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-600 dark:text-slate-300 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <DashboardHeader />
      </div>

      {/* Spacer for fixed header */}
      <div className="hidden lg:block h-16"></div>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="mobile-drawer lg:hidden">
            <div className="mobile-drawer-content sidebar-container">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">القائمة</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <DashboardSidebar onClose={() => setSidebarOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <DashboardSidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-16 lg:pb-0">
          <div className="mobile-container">
            <div className="mobile-section">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Navigation Bar (Mobile Only) */}
      <BottomNavBar />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataCacheProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DataCacheProvider>
  );
} 