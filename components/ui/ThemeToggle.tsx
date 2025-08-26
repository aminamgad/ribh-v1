'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
    );
  }

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-all duration-300 group-hover:scale-110" />;
    }
    return theme === 'light' ? (
      <Sun className="w-5 h-5 text-yellow-500 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
    ) : (
      <Moon className="w-5 h-5 text-[#FF9800] transition-all duration-300 group-hover:scale-110 group-hover:-rotate-12" />
    );
  };

  const getTooltipText = () => {
    if (theme === 'system') {
      return `النظام (${resolvedTheme === 'dark' ? 'مظلم' : 'مضيء'})`;
    }
    return theme === 'light' ? 'التبديل إلى الوضع المظلم' : 'التبديل إلى الوضع المضيء';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
        className="group relative w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-soft dark:shadow-soft-dark hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-300 flex items-center justify-center overflow-hidden"
        aria-label="تبديل المظهر"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Icons */}
        <div className="relative z-10 flex items-center justify-center">
          {getIcon()}
        </div>

        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-xl bg-primary-500/20 scale-0 group-active:scale-100 transition-transform duration-200" />
      </button>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        {getTooltipText()}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
      </div>
    </div>
  );
}

// Alternative compact version
export function ThemeToggleCompact() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  }

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-200" />;
    }
    return theme === 'light' ? (
      <Sun className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform duration-200" />
    ) : (
      <Moon className="w-4 h-4 text-[#FF9800] group-hover:scale-110 transition-transform duration-200" />
    );
  };

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
      className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center group"
      aria-label="تبديل المظهر"
    >
      {getIcon()}
    </button>
  );
}

// System theme toggle with all three options
export function ThemeToggleSystem() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  }

  return (
    <div className="relative">
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shadow-inner-soft dark:shadow-inner-soft-dark">
        <button
          onClick={() => setTheme('light')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            theme === 'light'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          aria-label="الوضع المضيء"
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTheme('system')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            theme === 'system'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          aria-label="نظام التشغيل"
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            theme === 'dark'
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          aria-label="الوضع المظلم"
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Theme indicator component
export function ThemeIndicator() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  }

  const getThemeInfo = () => {
    if (theme === 'system') {
      return {
        icon: <Monitor className="w-4 h-4" />,
        text: `النظام (${resolvedTheme === 'dark' ? 'مظلم' : 'مضيء'})`,
        color: 'text-gray-500 dark:text-gray-400'
      };
    }
    return theme === 'light' ? {
      icon: <Sun className="w-4 h-4" />,
      text: 'الوضع المضيء',
      color: 'text-yellow-500'
    } : {
      icon: <Moon className="w-4 h-4" />,
      text: 'الوضع المظلم',
      color: 'text-[#FF9800]'
    };
  };

  const themeInfo = getThemeInfo();

  return (
    <div className="flex items-center space-x-2 space-x-reverse">
      <div className={`${themeInfo.color}`}>
        {themeInfo.icon}
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {themeInfo.text}
      </span>
    </div>
  );
} 