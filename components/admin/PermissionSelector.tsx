'use client';

import { useEffect, useState } from 'react';
import { Loader2, UserCog } from 'lucide-react';

interface PermissionOption {
  key: string;
  labelAr: string;
  descriptionAr: string;
}

interface ModuleGroup {
  module: string;
  labelAr: string;
  permissions: PermissionOption[];
}

interface StaffPresetOption {
  id: string;
  labelAr: string;
  descriptionAr: string;
  permissions: string[];
}

interface PermissionSelectorProps {
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}

export default function PermissionSelector({ value, onChange, disabled }: PermissionSelectorProps) {
  const [modules, setModules] = useState<ModuleGroup[]>([]);
  const [presets, setPresets] = useState<StaffPresetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/admin/permissions')
      .then((res) => {
        if (!res.ok) throw new Error('فشل تحميل الصلاحيات');
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data.success) {
          if (data.modules) setModules(data.modules);
          if (data.presets) setPresets(data.presets);
        }
      })
      .catch((err) => !cancelled && setError(err.message || 'حدث خطأ'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const applyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = presets.find((p) => p.id === presetId);
    if (preset) onChange(preset.permissions);
  };

  const togglePermission = (key: string) => {
    if (disabled) return;
    setSelectedPresetId('');
    if (value.includes(key)) {
      onChange(value.filter((p) => p !== key));
    } else {
      onChange([...value, key]);
    }
  };

  const toggleModule = (modulePerms: PermissionOption[]) => {
    if (disabled) return;
    setSelectedPresetId('');
    const keys = modulePerms.map((p) => p.key);
    const allSelected = keys.every((k) => value.includes(k));
    if (allSelected) {
      onChange(value.filter((p) => !keys.includes(p)));
    } else {
      const added = new Set(value);
      keys.forEach((k) => added.add(k));
      onChange(Array.from(added));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin ml-2" />
        <span>جاري تحميل الصلاحيات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* أدوار مختصرة */}
      {presets.length > 0 && (
        <div className="rounded-lg border border-[#FF9800]/30 dark:border-[#FF9800]/40 bg-[#FF9800]/5 dark:bg-[#FF9800]/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserCog className="w-5 h-5 text-[#FF9800]" />
            <span className="font-medium text-gray-900 dark:text-slate-100">دور مختصر</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
            اختر دوراً جاهزاً لتعبئة الصلاحيات تلقائياً، أو حدد الصلاحيات يدوياً أدناه.
          </p>
          <select
            value={selectedPresetId}
            onChange={(e) => applyPreset(e.target.value)}
            disabled={disabled}
            className="input-field w-full max-w-md"
          >
            <option value="">— تحديد يدوي —</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.labelAr} — {p.descriptionAr}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* الصلاحيات حسب الوحدة */}
      <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">الصلاحيات المفصلة:</div>
      {modules.map((group) => {
        const keys = group.permissions.map((p) => p.key);
        const allSelected = keys.every((k) => value.includes(k));
        return (
          <div
            key={group.module}
            className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-800/50 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => toggleModule(group.permissions)}
                disabled={disabled}
                className="rounded border-gray-300 dark:border-slate-500 text-[#FF9800] focus:ring-[#FF9800]"
              />
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {group.labelAr}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-6">
              {group.permissions.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-start gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(perm.key)}
                    onChange={() => togglePermission(perm.key)}
                    disabled={disabled}
                    className="mt-1 rounded border-gray-300 dark:border-slate-500 text-[#FF9800] focus:ring-[#FF9800]"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    {perm.labelAr}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
