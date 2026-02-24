/**
 * نظام صلاحيات الإدارة والموظفين
 * Permission constants, helpers, and route mapping
 */

// ============ Permission Keys ============
export const PERMISSIONS = {
  // المستخدمون / الموظفون
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_TOGGLE_STATUS: 'users.toggle_status',

  // المنتجات
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_APPROVE: 'products.approve',
  PRODUCTS_MANAGE: 'products.manage',

  // الطلبات
  ORDERS_VIEW: 'orders.view',
  ORDERS_MANAGE: 'orders.manage',

  // السحوبات
  WITHDRAWALS_VIEW: 'withdrawals.view',
  WITHDRAWALS_PROCESS: 'withdrawals.process',

  // الفئات
  CATEGORIES_MANAGE: 'categories.manage',

  // الأرباح
  EARNINGS_VIEW: 'earnings.view',
  EARNINGS_EXPORT: 'earnings.export',

  // إعدادات النظام
  SETTINGS_MANAGE: 'settings.manage',

  // الرسائل
  MESSAGES_VIEW: 'messages.view',
  MESSAGES_REPLY: 'messages.reply',
  MESSAGES_MODERATE: 'messages.moderate',

  // التحليلات
  ANALYTICS_VIEW: 'analytics.view',

  // إحصائيات المنتج
  PRODUCT_STATS_VIEW: 'product_stats.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============ Permission Metadata (for UI and API list) ============
export interface PermissionMeta {
  key: PermissionKey;
  labelAr: string;
  descriptionAr: string;
  module: string;
}

const PERMISSION_META: Record<PermissionKey, PermissionMeta> = {
  [PERMISSIONS.USERS_VIEW]: {
    key: PERMISSIONS.USERS_VIEW,
    labelAr: 'عرض المستخدمين',
    descriptionAr: 'عرض قائمة المستخدمين وتفاصيلهم',
    module: 'users',
  },
  [PERMISSIONS.USERS_CREATE]: {
    key: PERMISSIONS.USERS_CREATE,
    labelAr: 'إنشاء مستخدم / موظف',
    descriptionAr: 'إضافة مستخدم أو موظف جديد',
    module: 'users',
  },
  [PERMISSIONS.USERS_UPDATE]: {
    key: PERMISSIONS.USERS_UPDATE,
    labelAr: 'تعديل المستخدمين',
    descriptionAr: 'تعديل بيانات المستخدمين والصلاحيات',
    module: 'users',
  },
  [PERMISSIONS.USERS_TOGGLE_STATUS]: {
    key: PERMISSIONS.USERS_TOGGLE_STATUS,
    labelAr: 'تفعيل / إيقاف الحساب',
    descriptionAr: 'تفعيل أو إيقاف حسابات المستخدمين',
    module: 'users',
  },
  [PERMISSIONS.PRODUCTS_VIEW]: {
    key: PERMISSIONS.PRODUCTS_VIEW,
    labelAr: 'عرض المنتجات',
    descriptionAr: 'عرض المنتجات والإحصائيات',
    module: 'products',
  },
  [PERMISSIONS.PRODUCTS_APPROVE]: {
    key: PERMISSIONS.PRODUCTS_APPROVE,
    labelAr: 'الموافقة على المنتجات',
    descriptionAr: 'الموافقة أو رفض المنتجات',
    module: 'products',
  },
  [PERMISSIONS.PRODUCTS_MANAGE]: {
    key: PERMISSIONS.PRODUCTS_MANAGE,
    labelAr: 'إدارة المنتجات',
    descriptionAr: 'تعديل أسعار وقفل وإعدادات المنتجات',
    module: 'products',
  },
  [PERMISSIONS.ORDERS_VIEW]: {
    key: PERMISSIONS.ORDERS_VIEW,
    labelAr: 'عرض الطلبات',
    descriptionAr: 'عرض قائمة الطلبات وتفاصيلها',
    module: 'orders',
  },
  [PERMISSIONS.ORDERS_MANAGE]: {
    key: PERMISSIONS.ORDERS_MANAGE,
    labelAr: 'إدارة الطلبات',
    descriptionAr: 'إدارة الطلبات وتوزيع الأرباح',
    module: 'orders',
  },
  [PERMISSIONS.WITHDRAWALS_VIEW]: {
    key: PERMISSIONS.WITHDRAWALS_VIEW,
    labelAr: 'عرض طلبات السحب',
    descriptionAr: 'عرض طلبات السحب',
    module: 'withdrawals',
  },
  [PERMISSIONS.WITHDRAWALS_PROCESS]: {
    key: PERMISSIONS.WITHDRAWALS_PROCESS,
    labelAr: 'معالجة السحوبات',
    descriptionAr: 'معالجة وقبول أو رفض طلبات السحب',
    module: 'withdrawals',
  },
  [PERMISSIONS.CATEGORIES_MANAGE]: {
    key: PERMISSIONS.CATEGORIES_MANAGE,
    labelAr: 'إدارة الفئات',
    descriptionAr: 'إضافة وتعديل وحذف الفئات',
    module: 'categories',
  },
  [PERMISSIONS.EARNINGS_VIEW]: {
    key: PERMISSIONS.EARNINGS_VIEW,
    labelAr: 'عرض الأرباح',
    descriptionAr: 'عرض تقارير الأرباح',
    module: 'earnings',
  },
  [PERMISSIONS.EARNINGS_EXPORT]: {
    key: PERMISSIONS.EARNINGS_EXPORT,
    labelAr: 'تصدير الأرباح',
    descriptionAr: 'تصدير تقارير الأرباح',
    module: 'earnings',
  },
  [PERMISSIONS.SETTINGS_MANAGE]: {
    key: PERMISSIONS.SETTINGS_MANAGE,
    labelAr: 'إعدادات النظام',
    descriptionAr: 'إعدادات الشحن والهوامش والنظام',
    module: 'settings',
  },
  [PERMISSIONS.MESSAGES_VIEW]: {
    key: PERMISSIONS.MESSAGES_VIEW,
    labelAr: 'عرض الرسائل',
    descriptionAr: 'عرض الرسائل والمحادثات مع العملاء والموردين',
    module: 'messages',
  },
  [PERMISSIONS.MESSAGES_REPLY]: {
    key: PERMISSIONS.MESSAGES_REPLY,
    labelAr: 'الرد على الرسائل',
    descriptionAr: 'الرد على العملاء والموردين وإدارة المحادثات',
    module: 'messages',
  },
  [PERMISSIONS.MESSAGES_MODERATE]: {
    key: PERMISSIONS.MESSAGES_MODERATE,
    labelAr: 'الموافقة على الرسائل',
    descriptionAr: 'الموافقة أو رفض الرسائل بين المستخدمين',
    module: 'messages',
  },
  [PERMISSIONS.ANALYTICS_VIEW]: {
    key: PERMISSIONS.ANALYTICS_VIEW,
    labelAr: 'التحليلات',
    descriptionAr: 'عرض لوحة التحليلات',
    module: 'analytics',
  },
  [PERMISSIONS.PRODUCT_STATS_VIEW]: {
    key: PERMISSIONS.PRODUCT_STATS_VIEW,
    labelAr: 'إحصائيات المنتج',
    descriptionAr: 'عرض إحصائيات المنتجات',
    module: 'product_stats',
  },
};

// ============ Helpers ============
const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

export function getAllPermissions(): PermissionKey[] {
  return [...ALL_PERMISSION_KEYS];
}

export function getPermissionsByModule(): Record<string, PermissionMeta[]> {
  const byModule: Record<string, PermissionMeta[]> = {};
  for (const meta of Object.values(PERMISSION_META)) {
    if (!byModule[meta.module]) byModule[meta.module] = [];
    byModule[meta.module].push(meta);
  }
  // ترتيب الوحدات للعرض
  const moduleOrder = [
    'users',
    'products',
    'orders',
    'withdrawals',
    'categories',
    'earnings',
    'settings',
    'messages',
    'analytics',
    'product_stats',
  ];
  const ordered: Record<string, PermissionMeta[]> = {};
  for (const m of moduleOrder) {
    if (byModule[m]) ordered[m] = byModule[m];
  }
  for (const m of Object.keys(byModule)) {
    if (!ordered[m]) ordered[m] = byModule[m];
  }
  return ordered;
}

export function getPermissionMeta(key: string): PermissionMeta | null {
  return PERMISSION_META[key as PermissionKey] ?? null;
}

export function isValidPermission(key: string): key is PermissionKey {
  return ALL_PERMISSION_KEYS.includes(key as PermissionKey);
}

/** تحقق إذا كان المستخدم يملك أي صلاحية من القائمة (صلاحيات دقيقة بدون تبعيات) */
export function hasAnyOfPermissions(user: UserForPermission | null | undefined, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

// ============ Route → Permission mapping (for sidebar and page guard) ============
/** مسار → مصفوفة صلاحيات مسموحة (أي منها يكفي للوصول) */
export const ROUTE_PERMISSIONS: Record<string, PermissionKey | PermissionKey[]> = {
  '/dashboard/admin/users': [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_TOGGLE_STATUS],
  '/dashboard/users': [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_TOGGLE_STATUS],
  '/dashboard/products': [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_APPROVE, PERMISSIONS.PRODUCTS_MANAGE],
  '/dashboard/orders': [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE],
  '/dashboard/admin/categories': PERMISSIONS.CATEGORIES_MANAGE,
  '/dashboard/admin/earnings': [PERMISSIONS.EARNINGS_VIEW, PERMISSIONS.EARNINGS_EXPORT],
  '/dashboard/admin/withdrawals': [PERMISSIONS.WITHDRAWALS_VIEW, PERMISSIONS.WITHDRAWALS_PROCESS],
  '/dashboard/admin/settings': PERMISSIONS.SETTINGS_MANAGE,
  '/dashboard/messages': [PERMISSIONS.MESSAGES_VIEW, PERMISSIONS.MESSAGES_REPLY, PERMISSIONS.MESSAGES_MODERATE],
  '/dashboard/admin/messages': [PERMISSIONS.MESSAGES_VIEW, PERMISSIONS.MESSAGES_MODERATE],
  '/dashboard/chat': [PERMISSIONS.MESSAGES_VIEW, PERMISSIONS.MESSAGES_REPLY, PERMISSIONS.MESSAGES_MODERATE],
  '/dashboard/analytics': [PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.PRODUCT_STATS_VIEW],
  '/dashboard/admin/product-stats': [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_MANAGE],
};

export function getPermissionForPath(pathname: string): PermissionKey | null {
  const perms = getPermissionsForPath(pathname);
  return perms.length > 0 ? perms[0] : null;
}

/** إرجاع مصفوفة الصلاحيات المسموحة للمسار */
export function getPermissionsForPath(pathname: string): PermissionKey[] {
  const normalized = pathname.replace(/\/$/, '') || pathname;
  for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
    if (normalized === route || normalized.startsWith(route + '/')) {
      return Array.isArray(perm) ? perm : [perm];
    }
  }
  return [];
}

/** مستخدم بصيغة بسيطة للتحقق من الصلاحية (يعمل في الواجهة والخادم) */
export interface UserForPermission {
  role: string;
  isStaff?: boolean;
  staffRole?: 'full_admin' | 'custom' | string;
  permissions?: string[];
}

/**
 * تحقق إذا كان المستخدم يملك صلاحية معينة.
 * آمن للاستخدام في الواجهة (لا يعتمد على خادم).
 */
export function hasPermission(user: UserForPermission | null | undefined, permission: string): boolean {
  if (!user || user.role !== 'admin') return false;
  // موظف إدارة بصلاحيات مخصصة: فحص دقيق — فقط عند isStaff === true
  if (user.isStaff === true) {
    if (user.staffRole === 'full_admin') return true;
    if (user.staffRole === 'custom' && Array.isArray(user.permissions)) {
      return user.permissions.includes(permission);
    }
    return false; // موظف بدون صلاحية محددة = لا صلاحية
  }
  // مدير نظام كامل: isStaff false أو undefined
  return true;
}

/** تحقق إذا كان المستخدم يصل لمسار معين حسب الصلاحيات (صلاحيات دقيقة) */
export function canAccessPath(user: UserForPermission | null | undefined, pathname: string): boolean {
  const permissions = getPermissionsForPath(pathname);
  if (permissions.length === 0) return true; // مسارات بدون صلاحية محددة (مثل الرئيسية) متاحة
  return hasAnyOfPermissions(user, permissions);
}

/**
 * اسم دور المستخدم للعرض: "الإدارة" لصاحب الصلاحيات الكاملة، "موظف إدارة" لصلاحيات مخصصة
 */
export function getRoleDisplayLabel(user: UserForPermission | null | undefined): string {
  if (!user) return '';
  if (user.role === 'admin') {
    if (!user.isStaff || user.staffRole === 'full_admin') return 'الإدارة';
    return 'موظف إدارة';
  }
  const labels: Record<string, string> = {
    supplier: 'المورد',
    marketer: 'المسوق',
    wholesaler: 'تاجر الجملة',
  };
  return labels[user.role] ?? user.role;
}

/**
 * لون شارة الدور: نفس ألوان الأدوار، مع تمييز "موظف إدارة" بلون مختلف عن "الإدارة"
 */
export function getRoleDisplayColor(user: UserForPermission | null | undefined): string {
  if (!user) return '';
  if (user.role === 'admin') {
    if (!user.isStaff || user.staffRole === 'full_admin') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  }
  const colors: Record<string, string> = {
    supplier: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    marketer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    wholesaler: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };
  return colors[user.role] ?? '';
}

export const MODULE_LABELS: Record<string, string> = {
  users: 'المستخدمون والموظفون',
  products: 'المنتجات',
  orders: 'الطلبات',
  withdrawals: 'السحوبات',
  categories: 'الفئات',
  earnings: 'الأرباح',
  settings: 'إعدادات النظام',
  messages: 'الرسائل',
  analytics: 'التحليلات',
  product_stats: 'إحصائيات المنتج',
};

// ============ أدوار موظفين مختصرة (Presets) ============
export interface StaffPreset {
  id: string;
  labelAr: string;
  descriptionAr: string;
  permissions: PermissionKey[];
}

export const STAFF_PRESETS: StaffPreset[] = [
  {
    id: 'products_manager',
    labelAr: 'مدير المنتجات',
    descriptionAr: 'عرض، موافقة وإدارة المنتجات وإحصائياتها',
    permissions: [
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_APPROVE,
      PERMISSIONS.PRODUCTS_MANAGE,
      PERMISSIONS.PRODUCT_STATS_VIEW,
    ],
  },
  {
    id: 'orders_manager',
    labelAr: 'مدير الطلبات',
    descriptionAr: 'عرض وإدارة الطلبات وتوزيع الأرباح',
    permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE],
  },
  {
    id: 'withdrawals_manager',
    labelAr: 'مدير السحوبات',
    descriptionAr: 'عرض ومعالجة طلبات السحب',
    permissions: [PERMISSIONS.WITHDRAWALS_VIEW, PERMISSIONS.WITHDRAWALS_PROCESS],
  },
  {
    id: 'users_manager',
    labelAr: 'مدير المستخدمين',
    descriptionAr: 'عرض، إنشاء، تعديل وتفعيل/إيقاف المستخدمين',
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_TOGGLE_STATUS,
    ],
  },
  {
    id: 'accountant',
    labelAr: 'المحاسب / الأرباح',
    descriptionAr: 'عرض وتصدير الأرباح وطلبات السحب',
    permissions: [
      PERMISSIONS.EARNINGS_VIEW,
      PERMISSIONS.EARNINGS_EXPORT,
      PERMISSIONS.WITHDRAWALS_VIEW,
    ],
  },
  {
    id: 'support_moderator',
    labelAr: 'دعم فني / مراقب رسائل',
    descriptionAr: 'عرض الرسائل والرد على العملاء والموافقة على الرسائل',
    permissions: [PERMISSIONS.MESSAGES_VIEW, PERMISSIONS.MESSAGES_REPLY, PERMISSIONS.MESSAGES_MODERATE, PERMISSIONS.USERS_VIEW],
  },
  {
    id: 'categories_manager',
    labelAr: 'مدير الفئات',
    descriptionAr: 'إدارة فئات المنتجات',
    permissions: [PERMISSIONS.CATEGORIES_MANAGE, PERMISSIONS.PRODUCTS_VIEW],
  },
  {
    id: 'analytics_viewer',
    labelAr: 'عرض التحليلات',
    descriptionAr: 'عرض لوحة التحليلات والإحصائيات فقط',
    permissions: [PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.PRODUCT_STATS_VIEW],
  },
  {
    id: 'operations',
    labelAr: 'موظف عمليات (منتجات + طلبات)',
    descriptionAr: 'إدارة المنتجات والطلبات معاً',
    permissions: [
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_APPROVE,
      PERMISSIONS.PRODUCTS_MANAGE,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_MANAGE,
    ],
  },
];

export function getStaffPresets(): StaffPreset[] {
  return [...STAFF_PRESETS];
}
