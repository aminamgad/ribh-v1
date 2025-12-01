import { ExternalCompanyDocument } from '@/models/ExternalCompany';

export type PackageStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Package {
  _id: string;
  packageId: number;
  externalCompanyId: string | ExternalCompanyDocument;
  toName: string;
  toPhone: string;
  alterPhone: string;
  description: string;
  packageType: string;
  villageId: number;
  street: string;
  totalCost: number;
  note?: string;
  barcode: string;
  status: PackageStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePackageRequest {
  to_name: string;
  to_phone: string;
  alter_phone: string;
  description: string;
  package_type: string;
  village_id: string | number;
  street: string;
  total_cost: string | number;
  note?: string;
  barcode: string;
}

export interface CreatePackageResponse {
  code: number;
  state: 'success' | 'false';
  data: {
    package_id: number;
  };
  message: string;
}

export interface CreatePackageErrorResponse {
  code: number;
  state: 'false';
  data: Record<string, string[]>;
  errors: Record<string, string[]>;
  message?: string;
}

