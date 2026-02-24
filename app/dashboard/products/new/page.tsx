'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import ProductForm from '@/components/products/form/ProductForm';
import toast from 'react-hot-toast';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export default function NewProductPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.role === 'supplier') return;
    if (user.role === 'admin' && hasPermission(user, PERMISSIONS.PRODUCTS_MANAGE)) return;
    toast.error('غير مصرح لك بإضافة منتجات');
    router.push('/dashboard');
  }, [user, router]);

  return <ProductForm mode="create" user={user} />;
}
