'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import ProductForm from '@/components/products/form/ProductForm';

export default function EditProductPage() {
  const params = useParams();
  const { user } = useAuth();
  const productId = typeof params.id === 'string' ? params.id : params.id?.[0];

  return <ProductForm mode="edit" productId={productId} user={user} />;
}
