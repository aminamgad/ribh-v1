'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

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

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const updatePosition = () => {
        if (dropdownRef.current) {
          const rect = dropdownRef.current.getBoundingClientRect();
          setPosition({
            top: rect.bottom + 4, // Fixed positioning uses viewport coordinates
            left: rect.left,
            width: rect.width
          });
        }
      };

      updatePosition();
      
      // Update position on scroll or resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (country: Country) => {
    onChange(country.nameAr);
    setIsOpen(false);
    setSearchQuery('');
    setDisplayValue(country.nameAr);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    setDisplayValue('');
    inputRef.current?.focus();
  };

  const dropdownContent = isOpen && typeof window !== 'undefined' ? (
    <div
      ref={dropdownMenuRef}
      className="fixed z-[99999] bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-2xl max-h-60 overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
      }}
    >
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
  ) : null;

  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState('');

  // Update display value when value or search changes
  useEffect(() => {
    if (selectedCountry && !isOpen) {
      setDisplayValue(selectedCountry.nameAr);
    } else if (isOpen || searchQuery) {
      setDisplayValue(searchQuery);
    } else if (selectedCountry) {
      setDisplayValue(selectedCountry.nameAr);
    } else {
      setDisplayValue('');
    }
  }, [selectedCountry, searchQuery, isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setDisplayValue(e.target.value);
            if (!isOpen) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-2 pr-10 text-right border rounded-lg
            ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-slate-800'}
            ${error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}
            ${isOpen ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : ''}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors duration-200
            text-sm text-gray-900 dark:text-slate-100
          `}
        />
        {value && !disabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear(e);
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            className="absolute left-8 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X size={14} className="text-gray-400 dark:text-slate-500" />
          </button>
        )}
        <ChevronDown 
          size={16} 
          className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}

      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
