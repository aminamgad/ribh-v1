'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { countries, Country } from '@/lib/countries';

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
}

export default function CountrySelect({
  value,
  onChange,
  placeholder = "اختر الدولة",
  className = "",
  error,
  disabled = false
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<Country[]>(countries);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get the selected country name for display
  const selectedCountry = countries.find(country => 
    country.nameAr === value || country.nameEn === value
  );

  // Filter countries based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCountries(countries);
    } else {
      const filtered = countries.filter(country => 
        country.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (country: Country) => {
    onChange(country.nameAr);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`
          relative w-full px-3 py-2 text-right border rounded-lg cursor-pointer
          ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-slate-800 hover:border-gray-400 dark:hover:border-slate-600'}
          ${error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : ''}
          transition-colors duration-200
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={`text-sm ${selectedCountry ? 'text-gray-900 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
            {selectedCountry ? selectedCountry.nameAr : placeholder}
          </span>
          <div className="flex items-center space-x-2 space-x-reverse">
            {value && !disabled && (
              <button
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={14} className="text-gray-400 dark:text-slate-500" />
              </button>
            )}
            <ChevronDown 
              size={16} 
              className={`text-gray-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-slate-600">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="ابحث عن دولة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                autoFocus
              />
            </div>
          </div>

          {/* Countries list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <div
                  key={country.code}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-right"
                  onClick={() => handleSelect(country)}
                >
                  <div className="text-sm text-gray-900 dark:text-slate-100">{country.nameAr}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{country.nameEn}</div>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-slate-400">
                لا توجد نتائج
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
