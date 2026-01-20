import { useStore, useUI } from '@forky/state'

export function useSidebar() {
  const { sidebarOpen, activeModal } = useUI()
  const toggleSidebar = useStore((s) => s.toggleSidebar)

  return {
    isOpen: sidebarOpen,
    toggle: toggleSidebar,
    activeModal,
  }
}
