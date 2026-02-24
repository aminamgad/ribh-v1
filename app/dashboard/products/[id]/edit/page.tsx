'use client';

import { useEffect, useMemo } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import ProductForm from '@/components/products/form/ProductForm';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import toast from 'react-hot-toast';

export default function EditProductPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  // استخدام معرف المنتج من الـ URL دائماً لتفادي params قديم عند الانتقال من صفحة منتج آخر
  const productId = useMemo(() => {
    const fromUrl = pathname?.match(/\/products\/([^/]+)/)?.[1];
    const fromParams = typeof params?.id === 'string' ? params.id : params?.id?.[0];
    return fromUrl ?? fromParams ?? undefined;
  }, [pathname, params?.id]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'supplier') return;
    if (user.role === 'admin' && hasPermission(user, PERMISSIONS.PRODUCTS_MANAGE)) return;
    toast.error('غير مصرح لك بتعديل المنتجات');
    router.push('/dashboard');
  }, [user, router]);

  return <ProductForm key={productId ?? 'new'} mode="edit" productId={productId} user={user} />;
}
