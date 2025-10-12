import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glass?: boolean;
}

export default function Card({
  children,
  hover = false,
  glass = false,
  className,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-2xl p-6 sm:p-8 transition-all duration-300';

  const glassStyles = glass
    ? 'glass'
    : 'bg-card border border-white/10 shadow-card';

  const hoverStyles = hover
    ? 'hover:-translate-y-1 cursor-pointer'
    : '';

  return (
    <div
      className={cn(
        baseStyles,
        glassStyles,
        hoverStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
