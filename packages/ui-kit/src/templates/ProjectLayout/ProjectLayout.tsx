'use client';

import type { ReactNode } from 'react';
import { cn } from '@forky/shared-ui';

export interface ProjectLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
  sidebarWidth?: number;
  headerHeight?: number;
  className?: string;
}

export const ProjectLayout = ({
  children,
  header,
  sidebar,
  sidebarWidth = 256,
  headerHeight = 56,
  className,
}: ProjectLayoutProps) => {
  return (
    <div
      className={cn('flex flex-col h-screen bg-gray-50 dark:bg-gray-950', className)}
    >
      {header && (
        <header
          className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{ height: headerHeight }}
        >
          {header}
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <aside
            className="border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            style={{ width: sidebarWidth }}
          >
            {sidebar}
          </aside>
        )}

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
