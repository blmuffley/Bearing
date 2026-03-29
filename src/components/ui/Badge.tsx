'use client';

import React from 'react';

const variantClasses: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
  info: 'bg-blue-500/20 text-blue-400',
  default: 'bg-dark-gray text-medium-gray',
};

interface BadgeProps {
  variant: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'default';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
