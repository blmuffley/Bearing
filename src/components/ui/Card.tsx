'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Card({ children, className = '', title }: CardProps) {
  return (
    <div className={`bg-dark-gray rounded-xl p-6 ${className}`}>
      {title && (
        <h3 className="font-heading text-lg font-semibold text-white mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
