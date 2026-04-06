'use client';

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface HoverIconProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  bgSize?: number;
  bgRadius?: number;
  bgColor?: string;
  borderColor?: string;
  glowColor?: string;
  rotate?: boolean;
  pulse?: boolean;
  children?: React.ReactNode;
}

/**
 * Interactive icon wrapper with spring-bounce scale, optional rotation,
 * glow halo, and pulse ring on hover.
 */
export function HoverIcon({
  icon: Icon,
  size = 18,
  color,
  bgSize = 44,
  bgRadius = 13,
  bgColor,
  borderColor,
  glowColor,
  rotate = false,
  pulse = false,
  children,
}: HoverIconProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center justify-center shrink-0"
      style={{
        width: bgSize,
        height: bgSize,
        borderRadius: bgRadius,
        background: bgColor,
        border: borderColor ? `1px solid ${borderColor}` : 'none',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: hovered ? `scale(1.12)${rotate ? ' rotate(8deg)' : ''}` : 'scale(1)',
        boxShadow:
          hovered && glowColor
            ? `0 0 20px ${glowColor}40, 0 0 40px ${glowColor}15`
            : 'none',
        cursor: 'default',
      }}
    >
      <Icon
        size={size}
        color={color}
        strokeWidth={2}
        style={{
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
        }}
      />
      {pulse && (
        <div
          className="absolute pointer-events-none"
          style={{
            inset: -2,
            borderRadius: bgRadius + 2,
            border: `2px solid ${color}`,
            animation: 'iconPulseRing 2s ease-out infinite',
            opacity: 0.4,
          }}
        />
      )}
      {children}
    </div>
  );
}
