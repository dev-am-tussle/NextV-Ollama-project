import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * CircleLoader - Reusable spinner for pending data fetch states.
 * Props:
 *  size: tailwind size (h-* w-*) or numeric (px) -> default 32
 *  variant: primary | secondary | muted
 *  label: optional accessible label text (renders off-screen) or visible when showLabel
 *  showLabel: if true shows label under spinner
 */
export interface CircleLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number | string;
  thickness?: string; // border width class e.g. 'border-2'
  variant?: 'primary' | 'secondary' | 'muted';
  label?: string;
  showLabel?: boolean;
  center?: boolean; // flex center container helper
  fullscreen?: boolean; // covers parent viewport height minus header maybe
}

const variantClass: Record<string,string> = {
  primary: 'border-primary border-t-transparent',
  secondary: 'border-secondary border-t-transparent',
  muted: 'border-muted-foreground/30 border-t-transparent',
};

export const CircleLoader: React.FC<CircleLoaderProps> = ({
  size = 32,
  thickness = 'border-2',
  variant = 'primary',
  label = 'Loading...',
  showLabel = false,
  center = true,
  fullscreen = false,
  className,
  ...rest
}) => {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  return (
    <div
      className={cn(
        fullscreen && 'min-h-[40vh] flex flex-col justify-center',
        center && 'flex flex-col items-center justify-center',
        !fullscreen && center && 'py-6',
        className
      )}
      {...rest}
    >
      <div
        className={cn(
          'animate-spin rounded-full',
          thickness,
          'border-solid',
          variantClass[variant],
        )}
        style={{ width: dimension, height: dimension }}
        role="status"
        aria-live="polite"
        aria-label={label}
      />
      {showLabel && (
        <div className="mt-2 text-sm text-muted-foreground">{label}</div>
      )}
    </div>
  );
};

export default CircleLoader;
