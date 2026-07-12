import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  error?: string;
  helpText?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
}

export function Select({
  label,
  options,
  error,
  helpText,
  placeholder,
  value,
  onChange,
  className = '',
  disabled = false,
  name,
  id,
  required,
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            w-full appearance-none rounded-lg border bg-white dark:bg-slate-900
            text-sm text-slate-900 dark:text-slate-100
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800
            pl-3 pr-10 py-2
            ${
              error
                ? 'border-red-400 dark:border-red-500 focus:ring-red-500/30 focus:border-red-500'
                : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-400'
            }
            ${!value && placeholder ? 'text-slate-400 dark:text-slate-500' : ''}
            ${className}
          `.trim()}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <p id={`${selectId}-error`} className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {helpText && !error && (
        <p id={`${selectId}-help`} className="text-xs text-slate-500 dark:text-slate-400">
          {helpText}
        </p>
      )}
    </div>
  );
}
