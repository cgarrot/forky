'use client'

import {
  NewProjectButton,
  NewNodeButton,
  SystemPromptEditor,
  QuickActionsList,
  QuickActionModal,
  ProjectList,
} from '@/features/projects'
import { Sidebar as UiSidebar } from '@forky/ui'
import { useSidebar } from '../hooks/useSidebar'

export function Sidebar() {
  const { isOpen, toggle, activeModal } = useSidebar()

  return (
    <>
      <UiSidebar isOpen={isOpen} onClose={toggle} onToggle={toggle} title="NonLinear">
        <div className="p-4 space-y-4">
          <NewProjectButton />
          <NewNodeButton />
        </div>

        <div className="px-4 pb-4">
          <SystemPromptEditor />
        </div>

        <div className="px-4 pb-4">
          <QuickActionsList />
        </div>

        <div className="px-4 pb-4">
          <ProjectList />
        </div>
      </UiSidebar>

      {activeModal === 'quick-action' && <QuickActionModal />}
    </>
  )
}
