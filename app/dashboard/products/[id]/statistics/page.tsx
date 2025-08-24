'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import toast from 'react-hot-toast';

export default function ProductStatisticsRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      router.push('/auth/login');
      return;
    }

    if (user.role !== 'admin') {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      router.push('/dashboard');
      return;
    }

    const productId = params.id as string;
    if (!productId) {
      toast.error('معرف المنتج مطلوب');
      router.push('/dashboard/admin/products');
      return;
    }

    // Redirect to the admin product statistics page
    router.push(`/dashboard/admin/product-stats?productId=${productId}`);
  }, [user, params.id, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="loading-spinner w-8 h-8"></div>
    </div>
  );
}
