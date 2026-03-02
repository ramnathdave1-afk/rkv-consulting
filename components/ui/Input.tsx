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
  'w-full bg-[var(--bg-primary)] text-white font-body text-[14px]',
  'border border-border rounded-[6px]',
  'placeholder:font-body placeholder:text-muted-deep',
  'transition-all duration-150 ease-out',
  'focus:outline-none focus:border-[#c9a84c] focus:ring-2 focus:ring-[rgba(201,168,76,0.12)]',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

const labelStyles = 'block font-body font-medium text-[12px] text-muted mb-1.5';
const errorStyles = 'mt-1.5 flex items-start gap-2 text-[12px] text-red font-body';
const helperStyles = 'text-[12px] text-muted mt-1.5 font-body';

function WarningIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-[2px] flex-shrink-0"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Input                                                              */
/* ------------------------------------------------------------------ */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  rightAdornment?: ReactNode;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, icon, rightAdornment, className, wrapperClassName, id, ...props },
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
              'h-10 px-3',
              icon && 'pl-10',
              rightAdornment && 'pr-10',
              error && 'border-red focus:border-red focus:ring-[rgba(220,38,38,0.15)]',
              className,
            )}
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
          {rightAdornment && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              {rightAdornment}
            </span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className={errorStyles} role="alert">
            <WarningIcon />
            <span>{error}</span>
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
            'px-3 py-2.5 min-h-[100px] resize-y',
            error && 'border-red focus:border-red focus:ring-[rgba(220,38,38,0.15)]',
            className,
          )}
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
            <WarningIcon />
            <span>{error}</span>
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
              'h-10 px-3 pr-8 appearance-none',
              error && 'border-red focus:border-red focus:ring-[rgba(220,38,38,0.15)]',
              className,
            )}
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
            <WarningIcon />
            <span>{error}</span>
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
