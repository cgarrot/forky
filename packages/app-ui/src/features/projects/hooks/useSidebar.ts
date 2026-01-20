'use client'

import { useStore, useUI } from '@forky/state'

export function useSidebar() {
  const { sidebarOpen } = useUI()
  const toggleSidebar = useStore((s) => s.toggleSidebar)

  return { sidebarOpen, toggleSidebar }
}
