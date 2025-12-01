'use client';

import { ReactNode } from 'react';

interface ResponsiveTableProps {
  headers: string[];
  rows: ReactNode[][];
  className?: string;
  mobileView?: 'cards' | 'scroll';
  emptyMessage?: string;
}

/**
 * Responsive table component that adapts to mobile screens
 * On mobile, displays as cards. On desktop, displays as table.
 */
export default function ResponsiveTable({
  headers,
  rows,
  className = '',
  mobileView = 'cards',
  emptyMessage = 'لا توجد بيانات'
}: ResponsiveTableProps) {
  if (rows.length === 0) {
    return (
      <div className={`text-center py-12 text-gray-500 dark:text-gray-400 ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className={`hidden md:block overflow-x-auto ${className}`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className={`md:hidden space-y-4 ${className}`}>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
          >
            <div className="space-y-3">
              {headers.map((header, headerIndex) => (
                <div key={headerIndex} className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    {header}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {row[headerIndex]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

