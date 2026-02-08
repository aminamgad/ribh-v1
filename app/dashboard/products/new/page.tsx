'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import ProductForm from '@/components/products/form/ProductForm';
import toast from 'react-hot-toast';

export default function NewProductPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role !== 'supplier' && user?.role !== 'admin') {
      toast.error('غير مصرح لك بإضافة منتجات');
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  return <ProductForm mode="create" user={user} />;
}
