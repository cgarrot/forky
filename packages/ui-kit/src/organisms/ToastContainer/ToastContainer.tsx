'use client';

import { useEffect, useCallback } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { cn } from '@forky/shared-ui';
import { IconButton } from '../../atoms/IconButton';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
}

export interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  className?: string;
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
};

const iconMap: Record<ToastVariant, React.ReactNode> = {
  success: <Check className="h-5 w-5 text-green-600" />,
  error: <X className="h-5 w-5 text-red-600" />,
  warning: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  info: <Info className="h-5 w-5 text-blue-600" />,
};

export const ToastContainer = ({
  toasts,
  onRemove,
  className,
}: ToastContainerProps) => {
  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-md pointer-events-none',
        className
      )}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem = ({ toast, onRemove }: ToastItemProps) => {
  const handleRemove = useCallback(() => {
    onRemove(toast.id);
  }, [toast.id, onRemove]);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(handleRemove, toast.duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast.duration, handleRemove]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-in slide-in-from-right pointer-events-auto',
        variantStyles[toast.variant]
      )}
      role="alert"
    >
      {iconMap[toast.variant]}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {toast.message}
        </p>
      </div>
      <IconButton
        icon={<X className="h-4 w-4" />}
        label="Dismiss"
        variant="ghost"
        size="sm"
        onClick={handleRemove}
      />
    </div>
  );
};
