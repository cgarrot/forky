'use client';

import { RefreshCw, AlertTriangle, X, Maximize } from 'lucide-react';
import { cn } from '@forky/shared';
import { IconButton } from '../../atoms/IconButton';

export type NodeStatus = 'idle' | 'loading' | 'error' | 'stale';

export interface NodeHeaderProps {
  title?: string;
  status?: NodeStatus;
  onDelete?: () => void;
  onFocus?: () => void;
  showResponse?: boolean;
  className?: string;
}

export const NodeHeader = ({
  title,
  status = 'idle',
  onDelete,
  onFocus,
  showResponse = false,
  className,
}: NodeHeaderProps) => {
  const getStatusIndicator = () => {
    switch (status) {
      case 'loading':
        return (
          <span className="flex items-center gap-1 text-xs text-blue-600">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Generating...
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="w-3 h-3" />
            Error
          </span>
        );
      case 'stale':
        return (
          <span className="flex items-center gap-1 text-xs text-orange-600">
            <RefreshCw className="w-3 h-3" />
            Stale
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {getStatusIndicator()}
        {title && (
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
            {title}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {showResponse && onFocus && (
          <IconButton
            icon={<Maximize className="w-4 h-4" />}
            label="Focus mode"
            variant="ghost"
            size="sm"
            onClick={onFocus}
          />
        )}
        {onDelete && (
          <IconButton
            icon={<X className="w-4 h-4" />}
            label="Delete"
            variant="danger"
            size="sm"
            onClick={onDelete}
          />
        )}
      </div>
    </div>
  );
};
