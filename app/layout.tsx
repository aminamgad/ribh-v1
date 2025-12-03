import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './arabic-fonts.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { FavoritesProvider } from '@/components/providers/FavoritesProvider';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ChatProvider } from '@/components/providers/ChatProvider';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Analytics } from '@/components/Analytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ربح - منصة التجارة الإلكترونية الذكية',
  description: 'منصة ربح (Ribh) - نظام تجارة إلكترونية متعدد الأدوار يربط الموردين والمسوقين وتجار الجملة',
  keywords: 'تجارة إلكترونية, منصة ربح, موردين, مسوقين, تجار جملة, مصر',
  authors: [{ name: 'Ribh Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'ربح - منصة التجارة الإلكترونية الذكية',
    description: 'منصة ربح (Ribh) - نظام تجارة إلكترونية متعدد الأدوار',
    type: 'website',
    locale: 'ar_EG',
  },
  other: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'origin-when-cross-origin',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="bg-gray-50 dark:bg-[#282828]">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('ribh-theme');
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  var actualTheme = theme === 'system' ? systemTheme : (theme || 'system');
                  
                  if (actualTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  console.log('Theme initialization error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className="arabic-text-optimized antialiased bg-gray-50 dark:bg-[#282828] text-gray-900 dark:text-slate-100">
        <noscript>
          <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fef2f2', color: '#dc2626' }}>
            يرجى تفعيل JavaScript لتشغيل هذا التطبيق.
          </div>
        </noscript>
        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              <CartProvider>
                <FavoritesProvider>
                  <NotificationProvider>
                    <ChatProvider>
                      <Toaster
                        position="top-center"
                        reverseOrder={false}
                        gutter={8}
                                                 toastOptions={{
                           duration: 4000,
                           style: {
                             background: '#282828',
                             color: '#fff',
                             padding: '16px',
                             borderRadius: '8px',
                             fontFamily: 'Cairo, sans-serif',
                           },
                           success: {
                             duration: 3000,
                             style: {
                               background: '#4CAF50',
                             },
                           },
                           error: {
                             duration: 4000,
                             style: {
                               background: '#FF9800',
                             },
                           },
                         }}
                      />
                      <ErrorBoundary>
                        <Analytics />
                        {children}
                      </ErrorBoundary>
                    </ChatProvider>
                  </NotificationProvider>
                </FavoritesProvider>
              </CartProvider>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 