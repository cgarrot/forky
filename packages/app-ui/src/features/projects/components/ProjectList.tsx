'use client'

import { useRef } from 'react'
import { Trash2, Download, Upload, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useStore } from '@forky/state'
import { useProjects } from '../hooks/useProjects'

export function ProjectList() {
  const router = useRouter()

  const {
    projects,
    deleteProjectById,
    exportProject,
    importProjectJson,
  } = useProjects()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentProjectId = useStore((s) => s.currentProjectId)
  const currentProjectName = useStore((s) => s.currentProjectName)
  const setCurrentProjectName = useStore((s) => s.setCurrentProjectName)

  const handleLoadProject = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this project?')) {
      return
    }

    await deleteProjectById(id)

    if (currentProjectId === id) {
      router.push('/projects')
    }
  }

  const handleExportJson = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const json = await exportProject(id, 'json')
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `forky-${id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportMarkdown = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const md = await exportProject(id, 'md')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `forky-${id}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const json = event.target?.result
      if (typeof json !== 'string') return

      void (async () => {
        try {
          await importProjectJson(json)
        } catch (error) {
          window.dispatchEvent(new CustomEvent('storage_error', { detail: { error } }))
        }
      })()
    }
    reader.readAsText(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatDate = (iso: string) => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    if (days === 0) return `Today ${time}`
    if (days === 1) return `Yesterday ${time}`
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString('en-US')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Projects ({projects.length})
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Import a project"
            type="button"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={currentProjectName}
          onChange={(e) => setCurrentProjectName(e.target.value)}
          placeholder="Project name..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportProject}
        className="hidden"
      />

      {projects.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No saved projects
          </p>
          <div className="space-y-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Create a node to get started. The project will be saved automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => handleLoadProject(project.id)}
              role="button"
              tabIndex={0}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {project.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDate(project.updatedAt)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {project.nodeCount} node{project.nodeCount !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => void handleExportJson(project.id, e)}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Export JSON"
                  type="button"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => void handleExportMarkdown(project.id, e)}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Export Markdown"
                  type="button"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => void handleDeleteProject(project.id, e)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete"
                  type="button"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
