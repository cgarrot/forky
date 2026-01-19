'use client';

import type { ReactNode } from 'react';
import { X, Menu } from 'lucide-react';
import { cn } from '@forky/shared';

export interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  children: ReactNode;
  width?: number;
  title?: ReactNode;
  className?: string;
}

export const Sidebar = ({
  isOpen,
  onClose,
  onToggle,
  children,
  width = 280,
  title = 'forky',
  className,
}: SidebarProps) => {
  const renderedTitle =
    typeof title === 'string' || typeof title === 'number' ? (
      <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
        {title}
      </span>
    ) : (
      title
    );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl z-50 transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
        style={{ width }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">{renderedTitle}</div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="h-[calc(100%-57px)] overflow-y-auto">{children}</div>
      </aside>

      {!isOpen && onToggle && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-4 z-30 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  );
};
