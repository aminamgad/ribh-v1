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
    apple: '/icon.png',
  },
  openGraph: {
    title: 'ربح - منصة التجارة الإلكترونية الذكية',
    description: 'منصة ربح (Ribh) - نظام تجارة إلكترونية متعدد الأدوار',
    type: 'website',
    locale: 'ar_EG',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="bg-gray-50 dark:bg-slate-900">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
      <body className="arabic-text-optimized antialiased bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100">
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
                            background: '#363636',
                            color: '#fff',
                            padding: '16px',
                            borderRadius: '8px',
                            fontFamily: 'Cairo, sans-serif',
                          },
                          success: {
                            duration: 3000,
                            style: {
                              background: '#10b981',
                            },
                          },
                          error: {
                            duration: 4000,
                            style: {
                              background: '#ef4444',
                            },
                          },
                        }}
                      />
                      {children}
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