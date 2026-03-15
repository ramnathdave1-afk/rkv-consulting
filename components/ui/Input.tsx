'use client';

import React, { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const baseStyles = [
  'w-full bg-bg-primary text-text-primary text-sm',
  'border border-border rounded-lg',
  'placeholder:text-text-muted',
  'transition-all duration-150',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-muted',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>}
        <div className="relative">
          {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(baseStyles, 'h-9 px-3', icon && 'pl-9', error && 'border-danger focus:border-danger focus:ring-danger-muted', className)}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(baseStyles, 'px-3 py-2 min-h-[80px] resize-y', error && 'border-danger', className)}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>}
        <select ref={ref} id={inputId} className={cn(baseStyles, 'h-9 px-3 appearance-none', className)} {...props}>
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
SelectField.displayName = 'SelectField';

export { Input, Textarea, SelectField };
export default Input;
