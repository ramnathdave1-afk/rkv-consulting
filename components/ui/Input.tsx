'use client';

import React, {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Shared base styles                                                 */
/* ------------------------------------------------------------------ */

const baseInputStyles = [
  'w-full bg-transparent text-white font-body',
  'border rounded-lg',
  'placeholder:font-body placeholder:text-muted-deep',
  'transition-all duration-200 ease-out',
  'focus:outline-none focus:shadow-glow-sm',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

const baseInputInlineStyles: React.CSSProperties = {
  borderColor: '#161E2A',
  backgroundColor: '#080B0F',
};

const focusInlineStyles = {
  borderColor: 'rgba(5, 150, 105, 0.5)',
};

const labelStyles = 'label block text-[10px] uppercase tracking-wider font-body text-muted mb-1.5';
const errorStyles = 'text-xs text-red mt-1.5 font-body';
const helperStyles = 'text-xs text-muted mt-1.5 font-body';

/* ------------------------------------------------------------------ */
/*  Input                                                              */
/* ------------------------------------------------------------------ */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, icon, className, wrapperClassName, id, ...props },
    ref,
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted flex items-center pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              baseInputStyles,
              'h-10 px-3 text-sm',
              icon && 'pl-10',
              error && 'border-red focus:border-red focus:ring-red/40',
              className,
            )}
            style={error ? { ...baseInputInlineStyles, borderColor: '#DC2626' } : baseInputInlineStyles}
            onFocus={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = focusInlineStyles.borderColor;
              }
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = '#161E2A';
              }
              props.onBlur?.(e);
            }}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className={errorStyles} role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className={helperStyles}>
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

/* ------------------------------------------------------------------ */
/*  Textarea                                                           */
/* ------------------------------------------------------------------ */

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, wrapperClassName, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            baseInputStyles,
            'px-3 py-2.5 text-sm min-h-[100px] resize-y',
            error && 'border-red focus:border-red focus:ring-red/40',
            className,
          )}
          style={error ? { ...baseInputInlineStyles, borderColor: '#DC2626' } : baseInputInlineStyles}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = focusInlineStyles.borderColor;
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = '#161E2A';
            }
            props.onBlur?.(e);
          }}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className={errorStyles} role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className={helperStyles}>
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

/* ------------------------------------------------------------------ */
/*  Select                                                             */
/* ------------------------------------------------------------------ */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      className,
      wrapperClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              baseInputStyles,
              'h-10 px-3 pr-8 text-sm appearance-none',
              error && 'border-red focus:border-red focus:ring-red/40',
              className,
            )}
            style={error ? { ...baseInputInlineStyles, borderColor: '#DC2626' } : baseInputInlineStyles}
            onFocus={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = focusInlineStyles.borderColor;
              }
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              if (!error) {
                e.currentTarget.style.borderColor = '#161E2A';
              }
              props.onBlur?.(e);
            }}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Chevron */}
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        {error && (
          <p id={`${inputId}-error`} className={errorStyles} role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className={helperStyles}>
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Input, Textarea, Select };
export default Input;
