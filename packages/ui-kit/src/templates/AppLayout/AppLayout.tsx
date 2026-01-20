'use client';

import type { ReactNode } from 'react';
import { cn } from '@forky/shared';

export interface AppLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  sidebarWidth?: number;
  className?: string;
}

export const AppLayout = ({
  children,
  sidebar,
  sidebarWidth = 280,
  className,
}: AppLayoutProps) => {
  return (
    <div className={cn('flex h-screen bg-gray-50 dark:bg-gray-950', className)}>
      {sidebar}
      <main
        className="flex-1 h-full overflow-hidden"
        style={sidebar ? { marginLeft: sidebarWidth } : undefined}
      >
        {children}
      </main>
    </div>
  );
};
