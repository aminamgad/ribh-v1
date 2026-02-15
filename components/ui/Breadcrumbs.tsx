'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

const routeLabels: Record<string, string> = {
  '': 'لوحة التحكم',
  products: 'المنتجات',
  orders: 'الطلبات',
  cart: 'السلة',
  favorites: 'المفضلة',
  users: 'المستخدمين',
  analytics: 'التحليلات',
  integrations: 'التكاملات',
  messages: 'الرسائل',
  chat: 'المحادثة',
  notifications: 'الإشعارات',
  wallet: 'المحفظة',
  withdrawals: 'السحوبات',
  settings: 'الإعدادات',
  fulfillment: 'التنفيذ',
  admin: 'الإدارة',
  categories: 'الفئات',
  earnings: 'الأرباح',
  'product-stats': 'إحصائيات المنتج',
  new: 'جديد',
  edit: 'تعديل',
  'bulk-print': 'طباعة جماعية',
  statistics: 'إحصائيات',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname.startsWith('/dashboard')) return null;

  const segments = pathname.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const items: { href: string; label: string }[] = [
    { href: '/dashboard', label: routeLabels[''] || 'لوحة التحكم' },
  ];

  let path = '/dashboard';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    path += `/${seg}`;
    const isLast = i === segments.length - 1;
    const label = routeLabels[seg] || (isLast && /^[a-f0-9]{24}$/i.test(seg) ? 'تفاصيل' : seg);
    items.push({ href: path, label });
  }

  return (
    <nav aria-label="مسار التنقل" className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400 py-2 overflow-x-auto">
      {items.map((item, i) => (
        <span key={item.href} className="flex items-center gap-1 flex-shrink-0">
          {i > 0 && (
            <ChevronLeft className="w-4 h-4 text-gray-400 dark:text-slate-500 rtl:rotate-180" />
          )}
          {i < items.length - 1 ? (
            <Link
              href={item.href}
              className="hover:text-[#FF9800] dark:hover:text-[#FFB74D] transition-colors truncate max-w-[120px] sm:max-w-[180px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-900 dark:text-slate-100 truncate max-w-[120px] sm:max-w-[180px]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
