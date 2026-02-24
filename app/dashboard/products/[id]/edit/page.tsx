'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import ProductForm from '@/components/products/form/ProductForm';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import toast from 'react-hot-toast';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const productId = typeof params.id === 'string' ? params.id : params.id?.[0];

  useEffect(() => {
    if (!user) return;
    if (user.role === 'supplier') return;
    if (user.role === 'admin' && hasPermission(user, PERMISSIONS.PRODUCTS_MANAGE)) return;
    toast.error('غير مصرح لك بتعديل المنتجات');
    router.push('/dashboard');
  }, [user, router]);

  return <ProductForm key={productId ?? 'new'} mode="edit" productId={productId} user={user} />;
}
