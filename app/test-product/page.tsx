'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  isApproved: boolean;
  isRejected: boolean;
  rejectionReason?: string;
  adminNotes?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export default function TestProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">اختبار حالة المنتجات</h1>
      
      <div className="grid gap-4">
        {products.map((product) => (
          <div key={product._id} className="border p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{product.name}</h3>
              <div className="flex items-center space-x-2 space-x-reverse">
                {product.isApproved ? (
                  <span className="badge badge-success">
                    <CheckCircle className="w-4 h-4 ml-1" />
                    معتمد
                  </span>
                ) : product.isRejected ? (
                  <span className="badge badge-danger">
                    <XCircle className="w-4 h-4 ml-1" />
                    مرفوض
                  </span>
                ) : (
                  <span className="badge badge-warning">
                    <Clock className="w-4 h-4 ml-1" />
                    قيد المراجعة
                  </span>
                )}
              </div>
            </div>
            
            <div className="mt-2 text-sm text-gray-600">
              <p>isApproved: {product.isApproved ? 'true' : 'false'}</p>
              <p>isRejected: {product.isRejected ? 'true' : 'false'}</p>
              {product.rejectionReason && (
                <p>سبب الرفض: {product.rejectionReason}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 