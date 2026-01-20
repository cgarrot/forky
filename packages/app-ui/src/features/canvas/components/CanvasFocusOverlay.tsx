'use client'

import { useEffect, useState } from 'react'
import { X, RefreshCw, MessageSquare, FileText, Shield, Search, GitBranch, Sparkles, Database, FileSearch } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { codebaseIndexApi, codebaseSearchApi, useStore } from '@forky/state'
import ReactMarkdown from 'react-markdown'
import {
  getChallengerIntensity,
  getLogicalRole,
  getActionNodeData,
  getPlanNodeData,
  getSourceNodeData,
  getTodoNodeData,
  writeOrchestrationMetadata,
} from '@forky/shared-core'
import type { Node as forkyNode } from '@forky/shared-core'
import type { SourceKind, SourceNodeData, TodoItem, TodoNodeData } from '@forky/shared-core'
import { cn } from '@forky/shared-ui'

type RecommendationType =
  | 'clarifier'
  | 'summarizer'
  | 'challenger-soft'
  | 'challenger-medium'
  | 'challenger-hard'
  | 'source'
  | 'compare-branches'
  | 'codebase-search'
  | 'codebase-index'

interface Recommendation {
  id: string
  type: RecommendationType
  label: string
  description: string
  icon: React.ElementType
  prompt: string
  orchestration?: {
    logicalRole: 'conversation' | 'challenger' | 'source'
    challenger?: { intensity: 'soft' | 'medium' | 'hard' }
  }
  condition?: (node: forkyNode | null) => boolean
}

function computeLineDiff(params: { from: string; to: string }): string {
  const fromLines = params.from.split('\n')
  const toLines = params.to.split('\n')

  const out: string[] = []
  const max = Math.max(fromLines.length, toLines.length)

  for (let i = 0; i < max; i += 1) {
    const a = fromLines[i]
    const b = toLines[i]

    if (a === b) continue
    if (typeof a === 'string') out.push(`- ${a}`)
    if (typeof b === 'string') out.push(`+ ${b}`)
  }

  return out.join('\n')
}

function extractQuestions(text: string): string[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const questions: string[] = []

  for (const line of lines) {
    const cleaned = line.replace(/^[-*\d.)\s]+/, '').trim()
    if (!cleaned.includes('?')) continue
    if (cleaned.length < 5 || cleaned.length > 220) continue

    if (!questions.includes(cleaned)) {
      questions.push(cleaned)
    }

    if (questions.length >= 12) break
  }

  return questions
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'clarifier',
    type: 'clarifier',
    label: 'Clarify',
    description: 'Ask 3-5 questions to deepen your understanding',
    icon: MessageSquare,
    prompt: 'Analyze the previous content and identify 3-5 key questions that would help clarify or deepen the essential points. Formulate each question in an open-ended way to elicit detailed responses.',
    orchestration: {
      logicalRole: 'conversation',
    },
  },
  {
    id: 'summarizer',
    type: 'summarizer',
    label: 'Summarize',
    description: 'Synthesize key points into a concise summary',
    icon: FileText,
    prompt: 'Synthesize the previous content into a structured summary. Identify key points, main ideas, and important conclusions. Use bullet points to facilitate reading.',
    orchestration: {
      logicalRole: 'conversation',
    },
  },
  {
    id: 'challenger-soft',
    type: 'challenger-soft',
    label: 'Challenger (Soft)',
    description: 'Gently question to verify assumptions',
    icon: Shield,
    prompt: 'Ask gentle and constructive reflection questions to verify assumptions and perspectives. Seek to identify points that might deserve deeper examination without being critical.',
    orchestration: {
      logicalRole: 'challenger',
      challenger: { intensity: 'soft' },
    },
  },
  {
    id: 'challenger-medium',
    type: 'challenger-medium',
    label: 'Challenger (Medium)',
    description: 'Question in a balanced way to test robustness',
    icon: Shield,
    prompt: 'Ask questions that test the robustness of reasoning in a balanced way. Identify potential contradictions, unverified assumptions, and possible alternatives.',
    orchestration: {
      logicalRole: 'challenger',
      challenger: { intensity: 'medium' },
    },
  },
  {
    id: 'challenger-hard',
    type: 'challenger-hard',
    label: 'Challenger (Hard)',
    description: 'Critically examine for weaknesses',
    icon: Shield,
    prompt: 'Perform a rigorous critique by identifying weaknesses, contradictions, and logical flaws. Be direct but constructive. Seek to highlight vulnerable points and counterarguments.',
    orchestration: {
      logicalRole: 'challenger',
      challenger: { intensity: 'hard' },
    },
  },
  {
    id: 'source',
    type: 'source',
    label: 'Find a source',
    description: 'Search for sources and citations to support the content',
    icon: Search,
    prompt: 'Identify relevant sources, references, or citations that could support or nuance the content. If specific claims require sources, indicate them precisely so they can be verified.',
    orchestration: {
      logicalRole: 'source',
    },
  },
  {
    id: 'compare-branches',
    type: 'compare-branches',
    label: 'Compare branches',
    description: 'Compare different branches and perspectives',
    icon: GitBranch,
    prompt: 'Analyze and compare the different branches or perspectives presented. Identify points of convergence, divergence, and potential contradictions. Synthesize the strengths of each approach.',
    orchestration: {
      logicalRole: 'conversation',
    },
    condition: (node) => {
      if (!node) return false
      return (node.childrenIds?.length ?? 0) > 1 || (node.parentIds?.length ?? 0) > 1
    },
  },
  {
    id: 'codebase-search',
    type: 'codebase-search',
    label: 'Codebase search',
    description: 'Search the codebase by keyword',
    icon: FileSearch,
    prompt: '',
    orchestration: {
      logicalRole: 'source',
    },
  },
  {
    id: 'codebase-index',
    type: 'codebase-index',
    label: 'Codebase index',
    description: 'Index the codebase for quick reference',
    icon: Database,
    prompt: '',
    orchestration: {
      logicalRole: 'source',
    },
  },
]

export function CanvasFocusOverlay() {
  const focusModeNodeId = useStore((s) => s.ui.focusModeNodeId)
  const nodes = useStore((s) => s.nodes)
  const createChildNode = useStore((s) => s.createChildNode)
  const updateNode = useStore((s) => s.updateNode)
  const startPlanScopeEdit = useStore((s) => s.startPlanScopeEdit)
  const setFocusModeNodeId = useStore((s) => s.setFocusModeNodeId)

  const node = focusModeNodeId ? nodes.get(focusModeNodeId) : null
  const refreshPlanVersion = useStore((s) => s.refreshPlanVersion)
  const setActivePlanVersion = useStore((s) => s.setActivePlanVersion)
  const generateArtifactFromPlan = useStore((s) => s.generateArtifactFromPlan)
  const generateTodoFromPlan = useStore((s) => s.generateTodoFromPlan)
  const [isCreating, setIsCreating] = useState<string | null>(null)
  const [showPlanDiff, setShowPlanDiff] = useState(false)

  const [sourceForm, setSourceForm] = useState<SourceNodeData>({
    provenance: { kind: 'manual', uri: '' },
    excerpts: [],
  })
  const [todoForm, setTodoForm] = useState<TodoNodeData>({ items: [] })

  useEffect(() => {
    if (!focusModeNodeId) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusModeNodeId(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [focusModeNodeId, setFocusModeNodeId])

  useEffect(() => {
    if (!node) return

    const source = getSourceNodeData(node.metadata)
    if (source) {
      setSourceForm(source)
    } else {
      setSourceForm({ provenance: { kind: 'manual', uri: '' }, excerpts: [] })
    }

    const todo = getTodoNodeData(node.metadata)
    if (todo) {
      setTodoForm(todo)
    } else {
      setTodoForm({ items: [] })
    }
  }, [focusModeNodeId, node?.id, setSourceForm, setTodoForm])

  const handleClose = () => {
    setFocusModeNodeId(null)
  }

  const handleCreateQuestions = () => {
    if (!node || !focusModeNodeId || !node.response) return

    const questions = extractQuestions(node.response)
    if (!questions.length) return

    setIsCreating('challenger-questions')

    try {
      for (const question of questions) {
        const childId = createChildNode(focusModeNodeId, question, { logicalRole: 'conversation', mode: 'explore', modeSource: 'auto' })
        if (childId) {
          window.dispatchEvent(new CustomEvent('node:ws-create', { detail: { nodeId: childId } }))
          const event = new CustomEvent('node:generate', { detail: { nodeId: childId } })
          window.dispatchEvent(event)
        }
      }
    } finally {
      setIsCreating(null)
    }
  }

  const persistSource = (next: SourceNodeData) => {
    if (!node) return

    const metadata = writeOrchestrationMetadata(node.metadata, {
      logicalRole: 'source',
      source: next,
    })

    updateNode(node.id, { metadata })
  }

  const persistTodo = (next: TodoNodeData) => {
    if (!node) return

    const metadata = writeOrchestrationMetadata(node.metadata, {
      logicalRole: 'artifact',
      todo: next,
    })

    updateNode(node.id, { metadata })
  }

  const handleRecommendationClick = (recommendation: Recommendation) => {
    if (!node || !focusModeNodeId) return

    setIsCreating(recommendation.id)

    try {
      if (recommendation.id === 'codebase-search') {
        const childId = createChildNode(focusModeNodeId, 'Codebase search', {
          logicalRole: 'source',
          mode: 'explore',
          modeSource: 'manual',
          action: { actionType: 'codebase_search', params: { rootPath: '', query: '' } },
        })

        if (childId) {
          window.dispatchEvent(new CustomEvent('node:ws-create', { detail: { nodeId: childId } }))
          setFocusModeNodeId(childId)
        }
        return
      }

      if (recommendation.id === 'codebase-index') {
        const childId = createChildNode(focusModeNodeId, 'Codebase index', {
          logicalRole: 'source',
          mode: 'explore',
          modeSource: 'manual',
          action: { actionType: 'codebase_index', params: { rootPath: '' } },
        })

        if (childId) {
          window.dispatchEvent(new CustomEvent('node:ws-create', { detail: { nodeId: childId } }))
          setFocusModeNodeId(childId)
        }
        return
      }

      const childId = createChildNode(
        focusModeNodeId,
        recommendation.prompt,
        recommendation.orchestration
      )

      if (childId) {
        window.dispatchEvent(new CustomEvent('node:ws-create', { detail: { nodeId: childId } }))
        const event = new CustomEvent('node:generate', { detail: { nodeId: childId } })
        window.dispatchEvent(event)
      }
    } finally {
      setIsCreating(null)
    }
  }

  const logicalRole = getLogicalRole(node?.metadata)
  const planData = getPlanNodeData(node?.metadata)
  const isPlanNode = logicalRole === 'plan' && planData !== null
  const isChallengerNode = logicalRole === 'challenger'
  const isSourceNode = logicalRole === 'source'
  const todoData = getTodoNodeData(node?.metadata)
  const isTodoNode = todoData !== null
  const actionData = getActionNodeData(node?.metadata)
  const isActionNode = actionData !== null
  const challengerIntensity = isChallengerNode ? getChallengerIntensity(node?.metadata) : null

  const riskReasons: string[] = []
  if (!node?.prompt?.trim()) riskReasons.push('Empty prompt')
  if (!node?.response?.trim()) riskReasons.push('No response')
  if ((node?.childrenIds?.length ?? 0) > 5) riskReasons.push('Many branches')

  const availableRecommendations = RECOMMENDATIONS.filter(
    (rec) => !rec.condition || rec.condition(node ?? null)
  )

  if (!node) return null

  return (
    <AnimatePresence>
      {focusModeNodeId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex flex-col h-full bg-gray-50 dark:bg-gray-900"
        >
          <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isPlanNode ? 'Plan' : 'Mode focus'}
              {isPlanNode && planData?.isStale && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Stale
                </span>
              )}
            </h2>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Close (Escape)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-4xl mx-auto space-y-6 pb-12">
              {isPlanNode && planData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Versions
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Active: v{planData.activeVersion}
                      </span>
                      <button
                        onClick={() => refreshPlanVersion(node.id)}
                        disabled={node.status === 'loading'}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Refresh plan"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${node.status === 'loading' ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      <button
                        onClick={() => startPlanScopeEdit(node.id)}
                        disabled={node.status === 'loading'}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Adjust plan scope"
                      >
                        Adjust scope
                      </button>
                      <button
                        onClick={() => generateTodoFromPlan(node.id)}
                        disabled={node.status === 'loading'}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Generate todos"
                      >
                        Generate todos
                      </button>
                      <button
                        onClick={() => generateArtifactFromPlan(node.id)}
                        disabled={node.status === 'loading'}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Generate an artifact"
                      >
                        Generate artifact
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {planData.versions.map((version) => (
                      <button
                        key={version.version}
                        onClick={() => setActivePlanVersion(node.id, version.version)}
                        className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          version.version === planData.activeVersion
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        v{version.version}
                        {version.version === planData.activeVersion && (
                          <span className="ml-1.5 text-xs opacity-75">(active)</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {planData.versions.length >= 2 && (
                    <div className="mt-3 space-y-2">
                      <button
                        onClick={() => setShowPlanDiff((v) => !v)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {showPlanDiff ? 'Hide diff' : 'Show diff'}
                      </button>

                      {showPlanDiff && (() => {
                        const active =
                          planData.versions.find((v) => v.version === planData.activeVersion)?.content ??
                          node.response ??
                          ''
                        const previous =
                          [...planData.versions]
                            .filter((v) => v.version < planData.activeVersion)
                            .sort((a, b) => b.version - a.version)[0]?.content ??
                          null

                        if (previous == null) return null

                        const diff = computeLineDiff({ from: previous, to: active })
                        if (!diff.trim()) return null

                        return (
                          <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-auto whitespace-pre-wrap">
                            {diff}
                          </pre>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}

              {node.prompt && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Prompt
                  </h3>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap text-sm leading-relaxed">
                      {node.prompt}
                    </p>
                  </div>
                </div>
              )}

              {isSourceNode && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Source
                    </h3>
                    <button
                      onClick={() => persistSource(sourceForm)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Save
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
                        <select
                          value={sourceForm.provenance.kind}
                          onChange={(e) => {
                            const kind = e.target.value as SourceKind
                            const next = { ...sourceForm, provenance: { ...sourceForm.provenance, kind } }
                            setSourceForm(next)
                          }}
                          className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        >
                          <option value="manual">manual</option>
                          <option value="web">web</option>
                          <option value="file">file</option>
                          <option value="image">image</option>
                          <option value="codebase">codebase</option>
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">URI (url/path)</label>
                        <input
                          value={sourceForm.provenance.uri}
                          onChange={(e) => {
                            const next = { ...sourceForm, provenance: { ...sourceForm.provenance, uri: e.target.value } }
                            setSourceForm(next)
                          }}
                          className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                          placeholder="https://... or /path/to/file"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Title</label>
                      <input
                        value={sourceForm.provenance.title ?? ''}
                        onChange={(e) => {
                          const next = { ...sourceForm, provenance: { ...sourceForm.provenance, title: e.target.value } }
                          setSourceForm(next)
                        }}
                        className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        placeholder="Source name"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Excerpts</label>
                        <button
                          onClick={() => {
                            const next = {
                              ...sourceForm,
                              excerpts: [...sourceForm.excerpts, { id: `ex_${Date.now()}`, text: '' }],
                            }
                            setSourceForm(next)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          + Add
                        </button>
                      </div>

                      <div className="space-y-2">
                        {sourceForm.excerpts.map((ex, idx) => (
                          <div key={ex.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Excerpt {idx + 1}</span>
                              <button
                                onClick={() => {
                                  const next = { ...sourceForm, excerpts: sourceForm.excerpts.filter((e) => e.id !== ex.id) }
                                  setSourceForm(next)
                                }}
                                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                              >
                                Delete
                              </button>
                            </div>
                            <textarea
                              value={ex.text}
                              onChange={(e) => {
                                const next = {
                                  ...sourceForm,
                                  excerpts: sourceForm.excerpts.map((entry) =>
                                    entry.id === ex.id ? { ...entry, text: e.target.value } : entry
                                  ),
                                }
                                setSourceForm(next)
                              }}
                              className="w-full min-h-[90px] px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                              placeholder="Paste a relevant excerpt here (with citations/lines if possible)"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Summary (optional)</label>
                      <textarea
                        value={sourceForm.summary ?? ''}
                        onChange={(e) => {
                          const next = { ...sourceForm, summary: e.target.value }
                          setSourceForm(next)
                        }}
                        className="w-full min-h-[80px] px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        placeholder="Source summary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {isTodoNode && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Todos
                    </h3>
                    <button
                      onClick={() => persistTodo(todoForm)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Save
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm space-y-3">
                    <div className="space-y-2">
                      {todoForm.items.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No todos</p>
                      ) : (
                        todoForm.items.map((item) => (
                          <div key={item.id} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={item.status === 'done'}
                              onChange={(e) => {
                                const next: TodoItem = { ...item, status: e.target.checked ? 'done' : 'todo' }
                                setTodoForm({ ...todoForm, items: todoForm.items.map((i) => (i.id === item.id ? next : i)) })
                              }}
                              className="mt-1 accent-purple-500"
                            />
                            <input
                              value={item.title}
                              onChange={(e) => {
                                const next: TodoItem = { ...item, title: e.target.value }
                                setTodoForm({ ...todoForm, items: todoForm.items.map((i) => (i.id === item.id ? next : i)) })
                              }}
                              className="flex-1 px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                            />
                            <button
                              onClick={() => {
                                const title = item.title.trim()
                                if (!title) return

                                const prompt = [
                                  'You are an agent executing a specific action.',
                                  '',
                                  `Action: ${title}`,
                                  '',
                                  'Constraints:',
                                  '- Propose a step-by-step execution and a concrete result.',
                                  '- If information is missing, ask targeted questions.',
                                ].join('\n')

                                const childId = createChildNode(node.id, prompt, {
                                  logicalRole: 'conversation',
                                  mode: 'build',
                                  modeSource: 'manual',
                                  action: { actionType: 'generate_node', params: { todoItemId: item.id } },
                                })

                                if (childId) {
                                  const event = new CustomEvent('node:generate', { detail: { nodeId: childId } })
                                  window.dispatchEvent(event)
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              Action
                            </button>
                            <button
                              onClick={() => {
                                setTodoForm({ ...todoForm, items: todoForm.items.filter((i) => i.id !== item.id) })
                              }}
                              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              Delete
                            </button>

                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => {
                        const newItem: TodoItem = {
                          id: `todo_${Date.now()}`,
                          title: '',
                          status: 'todo',
                        }
                        setTodoForm({ ...todoForm, items: [...todoForm.items, newItem] })
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                    >
                      + Add a todo
                    </button>
                  </div>
                </div>
              )}

              {isActionNode && actionData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Action
                    </h3>
                    <button
                      onClick={async () => {
                        const preview = [
                          'This action will create a result node (never automatic execution).',
                          '',
                          `type: ${actionData.actionType}`,
                          `agent: ${actionData.assignment?.agentTypeId ?? '(not defined)'}`,
                          `model: ${actionData.assignment?.model ?? '(default)'}`,
                        ]

                        if (actionData.actionType === 'codebase_search') {
                          const rootPath = typeof actionData.params.rootPath === 'string' ? actionData.params.rootPath : ''
                          const query = typeof actionData.params.query === 'string' ? actionData.params.query : ''
                          preview.push(`rootPath: ${rootPath}`)
                          preview.push(`query: ${query}`)
                        }

                        if (actionData.actionType === 'codebase_index') {
                          const rootPath = typeof actionData.params.rootPath === 'string' ? actionData.params.rootPath : ''
                          const maxFiles = typeof actionData.params.maxFiles === 'number' ? String(actionData.params.maxFiles) : '800'
                          preview.push(`rootPath: ${rootPath}`)
                          preview.push(`maxFiles: ${maxFiles}`)
                        }

                        preview.push('', 'Continue?')

                        const ok = window.confirm(preview.join('\n'))
                        if (!ok) return

                        const runId = `run_${Date.now()}`
                        const startedAt = new Date().toISOString()

                        try {
                          if (actionData.actionType === 'codebase_search') {
                            const rootPath = typeof actionData.params.rootPath === 'string' ? actionData.params.rootPath : ''
                            const query = typeof actionData.params.query === 'string' ? actionData.params.query : ''

                            const payload = await codebaseSearchApi({ rootPath, query, maxResults: 10 })
                            const matches = Array.isArray(payload?.matches) ? payload.matches : []

                            const excerpts = matches.map((m, idx) => ({
                              id: `m_${idx}`,
                              text: `${m.filePath}:${m.lineNumber} ${m.line}`,
                              startLine: m.lineNumber,
                              endLine: m.lineNumber,
                            }))

                            const childId = createChildNode(node.id, `Codebase search: ${query}`, {
                              logicalRole: 'source',
                              mode: 'explore',
                              modeSource: 'manual',
                              source: {
                                provenance: { kind: 'codebase', uri: rootPath, title: query, retrievedAt: new Date().toISOString() },
                                excerpts,
                                summary: excerpts.length ? `Matches: ${excerpts.length}` : 'No matches',
                              },
                            })

                            const previousRuns = actionData.runs ?? []
                            const nextRun = {
                              id: runId,
                              status: childId ? 'completed' : 'failed',
                              startedAt,
                              completedAt: new Date().toISOString(),
                              resultNodeId: childId ?? undefined,
                              error: childId ? undefined : 'Failed to create result node',
                            } satisfies (typeof previousRuns)[number]
                            const nextRuns: typeof previousRuns = [...previousRuns, nextRun]

                            updateNode(node.id, {
                              metadata: writeOrchestrationMetadata(node.metadata, { action: { ...actionData, runs: nextRuns } }),
                            })

                            return
                          }

                          if (actionData.actionType === 'codebase_index') {
                            const rootPath = typeof actionData.params.rootPath === 'string' ? actionData.params.rootPath : ''
                            const maxFiles = typeof actionData.params.maxFiles === 'number' ? actionData.params.maxFiles : undefined

                            const payload = await codebaseIndexApi({ rootPath, maxFiles })

                            const indexId = payload?.indexId ?? ''
                            const indexedRootPath = payload?.rootPath ?? rootPath
                            const fileCount = payload?.fileCount ?? 0

                            const childId = createChildNode(node.id, `Codebase index: ${rootPath}`, {
                              logicalRole: 'source',
                              mode: 'explore',
                              modeSource: 'manual',
                              source: {
                                provenance: { kind: 'codebase', uri: indexedRootPath, title: 'index', retrievedAt: new Date().toISOString() },
                                excerpts: [],
                                summary: `Index ID: ${indexId}, Files: ${fileCount}`,
                              },
                            })

                            const previousRuns = actionData.runs ?? []
                            const nextRun = {
                              id: runId,
                              status: childId ? 'completed' : 'failed',
                              startedAt,
                              completedAt: new Date().toISOString(),
                              resultNodeId: childId ?? undefined,
                              error: childId ? undefined : 'Failed to create result node',
                            } satisfies (typeof previousRuns)[number]
                            const nextRuns: typeof previousRuns = [...previousRuns, nextRun]

                            updateNode(node.id, {
                              metadata: writeOrchestrationMetadata(node.metadata, { action: { ...actionData, runs: nextRuns } }),
                            })

                            return
                          }

                          const prompt = node.prompt?.trim() ? node.prompt : 'Execute this action.'
                          const childId = createChildNode(node.id, prompt, {
                            logicalRole: 'artifact',
                            mode: 'build',
                            modeSource: 'manual',
                            artifact: { isFinal: false },
                          })

                          if (childId) {
                            const previousRuns = actionData.runs ?? []
                            const nextRun = { id: runId, status: 'running', startedAt, resultNodeId: childId } satisfies (typeof previousRuns)[number]
                            const nextRuns: typeof previousRuns = [...previousRuns, nextRun]
                            updateNode(node.id, {
                              metadata: writeOrchestrationMetadata(node.metadata, { action: { ...actionData, runs: nextRuns } }),
                            })

                            const event = new CustomEvent('node:generate', { detail: { nodeId: childId } })
                            window.dispatchEvent(event)
                          }
                        } catch (err) {
                          const message = err instanceof Error ? err.message : 'Run failed'
                          const previousRuns = actionData.runs ?? []
                          const nextRun = {
                            id: runId,
                            status: 'failed',
                            startedAt,
                            completedAt: new Date().toISOString(),
                            error: message,
                          } satisfies (typeof previousRuns)[number]
                          const nextRuns: typeof previousRuns = [...previousRuns, nextRun]
                          updateNode(node.id, {
                            metadata: writeOrchestrationMetadata(node.metadata, { action: { ...actionData, runs: nextRuns } }),
                          })
                        }
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                    >
                      Run
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm space-y-3">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Type: <span className="font-medium">{actionData.actionType}</span>
                    </div>

                    {actionData.actionType === 'codebase_search' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">rootPath</label>
                          <input
                            value={typeof actionData.params.rootPath === 'string' ? actionData.params.rootPath : ''}
                            onChange={(e) => {
                              const params = { ...actionData.params, rootPath: e.target.value }
                              const metadata = writeOrchestrationMetadata(node.metadata, { action: { ...actionData, params } })
                              updateNode(node.id, { metadata })
                            }}
                            className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                            placeholder="/path/to/codebase"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">query</label>
                          <input
                            value={typeof actionData.params.query === 'string' ? actionData.params.query : ''}
                            onChange={(e) => {
                              const params = { ...actionData.params, query: e.target.value }
                              const metadata = writeOrchestrationMetadata(node.metadata, { action: { ...actionData, params } })
                              updateNode(node.id, { metadata })
                            }}
                            className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                            placeholder="search term"
                          />
                        </div>
                      </div>
                    )}

                    {actionData.actionType === 'codebase_index' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">rootPath</label>
                          <input
                            value={typeof actionData.params.rootPath === 'string' ? actionData.params.rootPath : ''}
                            onChange={(e) => {
                              const params = { ...actionData.params, rootPath: e.target.value }
                              const metadata = writeOrchestrationMetadata(node.metadata, { action: { ...actionData, params } })
                              updateNode(node.id, { metadata })
                            }}
                            className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                            placeholder="/path/to/codebase"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">maxFiles (optionnel)</label>
                          <input
                            type="number"
                            value={typeof actionData.params.maxFiles === 'number' ? String(actionData.params.maxFiles) : ''}
                            onChange={(e) => {
                              const raw = e.target.value
                              const maxFiles = raw ? Number(raw) : undefined
                              const params = { ...actionData.params, maxFiles }
                              const metadata = writeOrchestrationMetadata(node.metadata, { action: { ...actionData, params } })
                              updateNode(node.id, { metadata })
                            }}
                            className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                            placeholder="800"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Agent</label>
                        <input
                          value={actionData.assignment?.agentTypeId ?? ''}
                          onChange={(e) => {
                            const assignment = { ...(actionData.assignment ?? { agentTypeId: '' }), agentTypeId: e.target.value }
                            const metadata = writeOrchestrationMetadata(node.metadata, { action: { ...actionData, assignment } })
                            updateNode(node.id, { metadata })
                          }}
                          className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                          placeholder="agentTypeId"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Model</label>
                        <input
                          value={actionData.assignment?.model ?? ''}
                          onChange={(e) => {
                            const assignment = { ...(actionData.assignment ?? { agentTypeId: '' }), model: e.target.value }
                            const metadata = writeOrchestrationMetadata(node.metadata, { action: { ...actionData, assignment } })
                            updateNode(node.id, { metadata })
                          }}
                          className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                          placeholder="gpt-4o / glm-4.7"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Max tokens</label>
                        <input
                          type="number"
                          value={String(actionData.assignment?.maxTokens ?? '')}
                          onChange={(e) => {
                            const raw = e.target.value
                            const maxTokens = raw ? Number(raw) : undefined
                            const assignment = { ...(actionData.assignment ?? { agentTypeId: '' }), maxTokens }
                            const metadata = writeOrchestrationMetadata(node.metadata, { action: { ...actionData, assignment } })
                            updateNode(node.id, { metadata })
                          }}
                          className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {node.response && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Response
                    </h3>
                    {isChallengerNode && challengerIntensity && extractQuestions(node.response).length > 0 && (
                      <button
                        onClick={handleCreateQuestions}
                        disabled={isCreating === 'challenger-questions' || node.status === 'loading'}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Create child nodes for each question"
                      >
                        {isCreating === 'challenger-questions' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        Create questions ({extractQuestions(node.response).length})
                      </button>
                    )}
                  </div>
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="prose prose-base dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{

                          code({ children, ...props }) {
                            return (
                              <code
                                className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm text-gray-900 dark:text-gray-100"
                                {...props}
                              >
                                {children}
                              </code>
                            )
                          },
                          pre({ children }) {
                            return <div className="my-4">{children}</div>
                          },
                          h1({ children }) {
                            return (
                              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 mt-6">
                                {children}
                              </h1>
                            )
                          },
                          h2({ children }) {
                            return (
                              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-5">
                                {children}
                              </h2>
                            )
                          },
                          h3({ children }) {
                            return (
                              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 mt-4">
                                {children}
                              </h3>
                            )
                          },
                          p({ children }) {
                            return (
                              <p className="text-gray-900 dark:text-gray-100 leading-relaxed mb-4">
                                {children}
                              </p>
                            )
                          },
                          ul({ children }) {
                            return <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
                          },
                          ol({ children }) {
                            return <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
                          },
                          li({ children }) {
                            return <li className="text-gray-900 dark:text-gray-100">{children}</li>
                          },
                          blockquote({ children }) {
                            return (
                              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-700 dark:text-gray-300">
                                {children}
                              </blockquote>
                            )
                          },
                        }}
                      >
                        {node.response}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {!node.response && !node.prompt && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-gray-400 dark:text-gray-600 italic">
                    No content to display
                  </p>
                </div>
              )}

              {availableRecommendations.length > 0 && !isPlanNode && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Recommendations (Explore)
                      </h3>
                    </div>
                    {riskReasons.length > 0 && (
                      <span className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-md">
                        Risks detected: {riskReasons.slice(0, 2).join(' · ')}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableRecommendations.map((recommendation) => {
                      const Icon = recommendation.icon
                      const isCreatingThis = isCreating === recommendation.id

                      return (
                        <button
                          key={recommendation.id}
                          onClick={() => handleRecommendationClick(recommendation)}
                          disabled={isCreatingThis || node.status === 'loading'}
                          className={cn(
                            'group relative flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed',
                            isCreatingThis && 'border-purple-500 dark:border-purple-400 shadow-sm'
                          )}
                        >
                          <div className={cn(
                            'shrink-0 p-2 rounded-lg',
                            isCreatingThis
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                          )}>
                            {isCreatingThis ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                              {recommendation.label}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                              {recommendation.description}
                            </p>
                          </div>
                          {isCreatingThis && (
                            <div className="absolute inset-0 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 backdrop-blur-sm" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
