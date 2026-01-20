'use client';

import type { ReactNode } from 'react';
import { cn } from '@forky/shared-ui';
import { Button } from '../../atoms/Button';

export type QuickActionColor = 'blue' | 'green' | 'orange' | 'purple' | 'gray';

export interface QuickActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  color?: QuickActionColor;
  disabled?: boolean;
  className?: string;
}

const colorClasses: Record<QuickActionColor, string> = {
  blue: 'border-l-blue-600 hover:bg-blue-50',
  green: 'border-l-green-600 hover:bg-green-50',
  orange: 'border-l-orange-600 hover:bg-orange-50',
  purple: 'border-l-purple-600 hover:bg-purple-50',
  gray: 'border-l-gray-600 hover:bg-gray-50',
};

export const QuickActionButton = ({
  label,
  onClick,
  icon,
  color = 'blue',
  disabled = false,
  className,
}: QuickActionButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full justify-start text-left border-l-4 rounded-l-none',
        colorClasses[color],
        className
      )}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  );
};
