'use client'

import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { NewProjectButton } from './NewProjectButton'
import { NewNodeButton } from './NewNodeButton'
import { SystemPromptEditor } from './SystemPromptEditor'
import { QuickActionsList } from './QuickActionsList'
import { QuickActionModal } from './QuickActionModal'
import { ProjectList } from './ProjectList'
import { useUI, useStore } from '@/lib/store'
import { cn } from '@forky/shared'

export function Sidebar() {
  const { sidebarOpen, activeModal } = useUI()
  const toggleSidebar = useStore((s) => s.toggleSidebar)

  return (
    <>
      <aside
        className={cn(
          'flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
          sidebarOpen ? 'w-[280px]' : 'w-[70px]'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <Sparkles className="w-6 h-6 text-blue-500 shrink-0" />
            <h1 className={cn(
              "text-lg font-bold text-gray-900 dark:text-white",
              sidebarOpen ? "block" : "hidden"
            )}>forky</h1>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        </div>

        <div className={cn(
          "flex-1 overflow-y-auto",
          sidebarOpen ? "block" : "hidden"
        )}>
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
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 text-center">
            forky v1.0
          </p>
        </div>
      </aside>

      {activeModal === 'quick-action' && <QuickActionModal />}
    </>
  )
}
