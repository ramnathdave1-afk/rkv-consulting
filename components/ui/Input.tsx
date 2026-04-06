'use client';

import React, { forwardRef, useState, useEffect, useRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ── Base input styles using CSS vars ── */
const baseStyles = [
  'w-full',
  'text-[14px]',
  'transition-all duration-200',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

/* Inline styles ensure CSS vars are used, not hardcoded hex */
const baseInline: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  color: 'var(--text-primary)',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  transition: 'border-color 200ms ease, box-shadow 200ms ease',
};

const focusRing = `
  focus:outline-none
  focus:ring-2
  focus:ring-offset-1
`;

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  /** Enable floating label animation (label moves from placeholder to top on focus/filled) */
  floatingLabel?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, floatingLabel, className, id, style, placeholder, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [prevError, setPrevError] = useState<string | undefined>(undefined);
    const [shaking, setShaking] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Trigger shake animation when error appears
    useEffect(() => {
      if (error && !prevError) {
        setShaking(true);
        const timer = setTimeout(() => setShaking(false), 400);
        return () => clearTimeout(timer);
      }
      setPrevError(error);
    }, [error, prevError]);

    // Use floating label pattern
    const useFloating = floatingLabel && label;

    return (
      <div className="w-full">
        {/* Standard label (non-floating) */}
        {label && !useFloating && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </label>
        )}
        <div className={cn('relative', useFloating && 'floating-label-wrap', shaking && 'input-error-shake')} ref={wrapRef}>
          {icon && (
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              baseStyles,
              focusRing,
              'h-10 px-3',
              icon && 'pl-9',
              className,
            )}
            style={{
              ...baseInline,
              ...(error
                ? { borderColor: 'var(--danger)' }
                : {}),
              ...style,
            }}
            placeholder={useFloating ? ' ' : placeholder}
            {...props}
          />
          {/* Floating label element */}
          {useFloating && (
            <label
              htmlFor={inputId}
              className="floating-label"
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
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
  ({ label, error, className, id, style, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [prevError, setPrevError] = useState<string | undefined>(undefined);
    const [shaking, setShaking] = useState(false);

    useEffect(() => {
      if (error && !prevError) {
        setShaking(true);
        const timer = setTimeout(() => setShaking(false), 400);
        return () => clearTimeout(timer);
      }
      setPrevError(error);
    }, [error, prevError]);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </label>
        )}
        <div className={cn(shaking && 'input-error-shake')}>
          <textarea
            ref={ref}
            id={inputId}
            className={cn(baseStyles, focusRing, 'px-3 py-2 min-h-[80px] resize-y', className)}
            style={{
              ...baseInline,
              ...(error ? { borderColor: 'var(--danger)' } : {}),
              ...style,
            }}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
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
  ({ label, error, options, placeholder, className, id, style, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [prevError, setPrevError] = useState<string | undefined>(undefined);
    const [shaking, setShaking] = useState(false);

    useEffect(() => {
      if (error && !prevError) {
        setShaking(true);
        const timer = setTimeout(() => setShaking(false), 400);
        return () => clearTimeout(timer);
      }
      setPrevError(error);
    }, [error, prevError]);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </label>
        )}
        <div className={cn(shaking && 'input-error-shake')}>
          <select
            ref={ref}
            id={inputId}
            className={cn(baseStyles, focusRing, 'h-10 px-3 appearance-none', className)}
            style={{
              ...baseInline,
              ...(error ? { borderColor: 'var(--danger)' } : {}),
              ...style,
            }}
            {...props}
          >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {error && (
          <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
SelectField.displayName = 'SelectField';

export { Input, Textarea, SelectField };
export default Input;
