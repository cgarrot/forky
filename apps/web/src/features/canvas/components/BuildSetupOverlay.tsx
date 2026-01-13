'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, RotateCcw, Wand2, AlertTriangle, Pin, PinOff, Check, X as XIcon } from 'lucide-react'
import { useBuildSession, useBuildActions, useNodes } from '@/lib/store'
import { cn, getLogicalRole } from '@forky/shared'

type Tab = 'included' | 'excluded'

export function BuildSetupOverlay() {
  const buildSession = useBuildSession()
  const nodes = useNodes()
  const {
    setBuildDeliverable,
    setBuildScopeConfig,
    recomputeBuildSuggestions,
    toggleBuildInclude,
    toggleBuildExclude,
    toggleBuildPin,
    includeBuildBranch,
    excludeBuildBranch,
    pinBuildBranch,
    unpinBuildBranch,
    resetBuildToSuggested,
    generatePlanFromBuildSession,
    applyBuildScopeToPlan,
    endBuildSession,
  } = useBuildActions()

  const [activeTab, setActiveTab] = useState<Tab>('included')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'conversation' | 'source' | 'challenger' | 'plan' | 'artifact'>('all')
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [staleOnly, setStaleOnly] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  useEffect(() => {
    if (!buildSession) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        endBuildSession()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [buildSession, endBuildSession])

  const rootNode = useMemo(() => (buildSession ? nodes.get(buildSession.rootNodeId) : null), [buildSession, nodes])
  const includedNodeIds = useMemo(() => (buildSession ? Array.from(buildSession.includedNodeIds) : []), [buildSession])
  const excludedNodeIds = useMemo(() => (buildSession ? Array.from(buildSession.excludedNodeIds) : []), [buildSession])
  const pinnedNodeIds = buildSession?.pinnedNodeIds ?? new Set()

  const branchIds = useMemo(() => {
    if (!buildSession) return []
    const set = new Set<string>()
    for (const scoped of buildSession.scopeNodes.values()) {
      for (const branch of scoped.branches) {
        set.add(branch)
      }
    }
    return Array.from(set).sort()
  }, [buildSession])

  useEffect(() => {
    if (!buildSession) return
    if (!selectedBranchId && branchIds.length > 0) {
      setSelectedBranchId(branchIds[0])
    }
  }, [buildSession, branchIds, selectedBranchId])

  const filteredIncluded = useMemo(() => {
    if (!buildSession) return []
    return includedNodeIds
      .filter(nodeId => {
        const node = nodes.get(nodeId)
        if (!node) return false

        if (pinnedOnly && !pinnedNodeIds.has(nodeId)) return false
        if (staleOnly && node.status !== 'stale') return false

        if (roleFilter !== 'all') {
          const role = getLogicalRole(node.metadata)
          if (role !== roleFilter) return false
        }

        const query = searchQuery.toLowerCase()
        return (
          node.prompt.toLowerCase().includes(query) ||
          (node.summary && node.summary.toLowerCase().includes(query))
        )
      })
      .map(nodeId => ({
        node: nodes.get(nodeId)!,
        scope: buildSession.scopeNodes.get(nodeId),
        isPinned: pinnedNodeIds.has(nodeId),
      }))
      .sort((a, b) => {
        const aScore = a.scope?.score ?? 0
        const bScore = b.scope?.score ?? 0
        return bScore - aScore
      })
  }, [includedNodeIds, nodes, buildSession, pinnedNodeIds, searchQuery, pinnedOnly, staleOnly, roleFilter])

  const filteredExcluded = useMemo(() => {
    if (!buildSession) return []
    return excludedNodeIds
      .filter(nodeId => {
        const node = nodes.get(nodeId)
        if (!node) return false

        if (pinnedOnly && !pinnedNodeIds.has(nodeId)) return false
        if (staleOnly && node.status !== 'stale') return false

        if (roleFilter !== 'all') {
          const role = getLogicalRole(node.metadata)
          if (role !== roleFilter) return false
        }

        const query = searchQuery.toLowerCase()
        return (
          node.prompt.toLowerCase().includes(query) ||
          (node.summary && node.summary.toLowerCase().includes(query))
        )
      })
      .map(nodeId => ({
        node: nodes.get(nodeId)!,
        scope: buildSession.scopeNodes.get(nodeId),
        isPinned: pinnedNodeIds.has(nodeId),
      }))
      .sort((a, b) => {
        const aScore = a.scope?.score ?? 0
        const bScore = b.scope?.score ?? 0
        return bScore - aScore
      })
  }, [excludedNodeIds, nodes, buildSession, pinnedNodeIds, searchQuery, pinnedOnly, staleOnly, roleFilter])

  if (!buildSession) return null

  const currentList = activeTab === 'included' ? filteredIncluded : filteredExcluded
  const isEditingPlanScope = Boolean(buildSession.targetPlanNodeId)
  const canGenerate = buildSession.deliverable.trim().length > 0
  const canPrimaryAction = isEditingPlanScope ? includedNodeIds.length > 0 : canGenerate

  const handleIncludeToggle = (nodeId: string) => {
    if (activeTab === 'included') {
      toggleBuildExclude(nodeId)
    } else {
      toggleBuildInclude(nodeId)
    }
  }

  const handlePinToggle = (nodeId: string) => {
    toggleBuildPin(nodeId)
  }

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1:
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
      case 2:
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 3:
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-50 flex flex-col h-full bg-gray-50 dark:bg-gray-900"
      >
        <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Build Setup
            </h2>
            {rootNode && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                From: {rootNode.prompt.slice(0, 50)}{rootNode.prompt.length > 50 ? '...' : ''}
              </div>
            )}
          </div>
          <button
            onClick={endBuildSession}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Close (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {buildSession.impactGlobalDetected && (
          <div className="shrink-0 px-8 py-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-3 max-w-6xl mx-auto">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                  Impact global détecté
                </h3>
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                  Des changements majeurs ont été détectés dans le scope. Voulez-vous recalculer les suggestions ?
                </p>
                <button
                  onClick={() => recomputeBuildSuggestions()}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/40 text-orange-800 dark:text-orange-300 text-xs font-medium rounded-md transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Recompute global
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex">
          <div className="w-80 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto">
            <div className="p-4 space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Livrable <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={buildSession.deliverable}
                  onChange={(e) => setBuildDeliverable(e.target.value)}
                  placeholder="Ex: Plan de projet pour construire une application web"
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
                {!buildSession.deliverable.trim() && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Le livrable est requis pour générer le plan
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Direction
                </label>
                 <select
                   value={buildSession.direction}
                   onChange={(e) => {
                     const next = e.target.value
                     const direction = next === 'parents' || next === 'children' || next === 'both' ? next : 'both'
                     setBuildScopeConfig({ direction })
                   }}

                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                >
                  <option value="parents">Parents only</option>
                  <option value="children">Children only</option>
                  <option value="both">Both directions</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Profondeur max: {buildSession.maxDepth}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={buildSession.maxDepth}
                  onChange={(e) => setBuildScopeConfig({ maxDepth: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Rôle
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      const next = e.target.value
                      if (
                        next === 'all' ||
                        next === 'conversation' ||
                        next === 'source' ||
                        next === 'challenger' ||
                        next === 'plan' ||
                        next === 'artifact'
                      ) {
                        setRoleFilter(next)
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">All</option>
                    <option value="conversation">conversation</option>
                    <option value="source">source</option>
                    <option value="challenger">challenger</option>
                    <option value="plan">plan</option>
                    <option value="artifact">artifact</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={pinnedOnly}
                      onChange={(e) => setPinnedOnly(e.target.checked)}
                      className="accent-purple-500"
                    />
                    Pinned only
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={staleOnly}
                      onChange={(e) => setStaleOnly(e.target.checked)}
                      className="accent-purple-500"
                    />
                    Stale only
                  </label>
                </div>

                {branchIds.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Actions par branche
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                    >
                      {branchIds.map((branchId) => (
                        <option key={branchId} value={branchId}>
                          {branchId}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => selectedBranchId && includeBuildBranch(selectedBranchId)}
                        className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        Include branch
                      </button>
                      <button
                        onClick={() => selectedBranchId && excludeBuildBranch(selectedBranchId)}
                        className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        Exclude branch
                      </button>
                      <button
                        onClick={() => selectedBranchId && pinBuildBranch(selectedBranchId)}
                        className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        Pin branch
                      </button>
                      <button
                        onClick={() => selectedBranchId && unpinBuildBranch(selectedBranchId)}
                        className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        Unpin branch
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={() => recomputeBuildSuggestions()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Recompute suggestions
                  </button>
                  <button
                    onClick={resetBuildToSuggested}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset to suggested
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                 <button
                   onClick={isEditingPlanScope ? applyBuildScopeToPlan : generatePlanFromBuildSession}
                   disabled={!canPrimaryAction}
                   className={cn(
                     'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                     canPrimaryAction
                       ? 'bg-purple-600 hover:bg-purple-700 text-white'
                       : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                   )}
                 >
                   <Wand2 className="w-4 h-4" />
                   {isEditingPlanScope ? 'Apply scope to plan' : 'Generate Plan v1'}
                 </button>

              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('included')}
                    className={cn(
                      'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      activeTab === 'included'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    Included ({includedNodeIds.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('excluded')}
                    className={cn(
                      'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      activeTab === 'excluded'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    Excluded ({excludedNodeIds.length})
                  </button>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search nodes by prompt or summary..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="max-w-5xl mx-auto space-y-2">
                {currentList.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-400 dark:text-gray-600 italic">
                      {searchQuery ? 'No nodes match your search' : 'No nodes in this list'}
                    </p>
                  </div>
                ) : (
                  currentList.map(({ node, scope, isPinned }) => {
                    if (!scope) return null

                    const isIncluded = activeTab === 'included'

                    return (
                      <div
                        key={node.id}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleIncludeToggle(node.id)}
                            className={cn(
                              'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5',
                              isIncluded
                                ? 'border-purple-500 bg-purple-500 text-white'
                                : 'border-gray-300 dark:border-gray-600 hover:border-purple-500'
                            )}
                          >
                            {isIncluded ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4 text-gray-400" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn('px-2 py-0.5 text-xs font-medium rounded', getTierColor(scope.tier))}>
                                Tier {scope.tier}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Score: {scope.score.toFixed(0)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Depth: {scope.depth}
                              </span>
                              {scope.branches.length > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {scope.branches.length} branch{scope.branches.length > 1 ? 'es' : ''}
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {node.summary || node.prompt.slice(0, 100)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {node.prompt}
                            </div>
                          </div>

                          <button
                            onClick={() => handlePinToggle(node.id)}
                            className={cn(
                              'p-2 rounded-lg transition-colors flex-shrink-0',
                              isPinned
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            )}
                            title={isPinned ? 'Unpin' : 'Pin'}
                          >
                            {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
