import { NextRequest, NextResponse } from 'next/server';
import { withAnyPermission } from '@/lib/auth';
import { getPermissionsByModule, getStaffPresets, MODULE_LABELS, PERMISSIONS } from '@/lib/permissions';

async function getPermissionsList(req: NextRequest) {
  const byModule = getPermissionsByModule();
  const modules = Object.entries(byModule).map(([moduleKey, perms]) => ({
    module: moduleKey,
    labelAr: MODULE_LABELS[moduleKey] || moduleKey,
    permissions: perms.map((p) => ({
      key: p.key,
      labelAr: p.labelAr,
      descriptionAr: p.descriptionAr,
    })),
  }));

  const presets = getStaffPresets().map((p) => ({
    id: p.id,
    labelAr: p.labelAr,
    descriptionAr: p.descriptionAr,
    permissions: p.permissions,
  }));

  return NextResponse.json({
    success: true,
    permissions: Object.values(PERMISSIONS),
    modules,
    presets,
  });
}

export const GET = withAnyPermission([
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_UPDATE,
])(getPermissionsList);
