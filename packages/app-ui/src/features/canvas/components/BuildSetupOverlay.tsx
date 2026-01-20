'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useBuildActions, useBuildSession, useNodes } from '@forky/state';
import { BuildNodeList } from './build-setup/BuildNodeList';
import { BuildSetupHeader } from './build-setup/BuildSetupHeader';
import { BuildSetupSidebar } from './build-setup/BuildSetupSidebar';
import { useBuildBranchActions } from './build-setup/hooks/useBuildBranchActions';
import { useBuildFilters } from './build-setup/hooks/useBuildFilters';
import { useBuildSessionKeybinds } from './build-setup/hooks/useBuildSessionKeybinds';

export function BuildSetupOverlay() {
  const buildSession = useBuildSession();
  const nodes = useNodes();
  const {
    setBuildDeliverable,
    setBuildScopeConfig,
    recomputeBuildSuggestions,
    toggleBuildInclude,
    toggleBuildExclude,
    toggleBuildPin,
    resetBuildToSuggested,
    generatePlanFromBuildSession,
    applyBuildScopeToPlan,
    endBuildSession,
  } = useBuildActions();

  useBuildSessionKeybinds(Boolean(buildSession), endBuildSession);

  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    pinnedOnly,
    setPinnedOnly,
    staleOnly,
    setStaleOnly,
    rootNode,
    includedNodeIds,
    excludedNodeIds,
    filteredIncluded,
    filteredExcluded,
  } = useBuildFilters(buildSession, nodes);

  const {
    branchIds,
    selectedBranchId,
    setSelectedBranchId,
    handleIncludeBranch,
    handleExcludeBranch,
    handlePinBranch,
    handleUnpinBranch,
  } = useBuildBranchActions(buildSession);

  if (!buildSession) return null;

  const currentList = activeTab === 'included' ? filteredIncluded : filteredExcluded;
  const isEditingPlanScope = Boolean(buildSession.targetPlanNodeId);
  const canGenerate = buildSession.deliverable.trim().length > 0;
  const canPrimaryAction = isEditingPlanScope
    ? includedNodeIds.length > 0
    : canGenerate;

  const handleIncludeToggle = (nodeId: string) => {
    if (activeTab === 'included') {
      toggleBuildExclude(nodeId);
    } else {
      toggleBuildInclude(nodeId);
    }
  };

  const primaryActionLabel = isEditingPlanScope
    ? 'Apply scope to plan'
    : 'Generate Plan v1';

  const handlePrimaryAction = () => {
    if (isEditingPlanScope) {
      applyBuildScopeToPlan();
    } else {
      generatePlanFromBuildSession();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-50 flex flex-col h-full bg-gray-50 dark:bg-gray-900"
      >
        <BuildSetupHeader rootNode={rootNode} onClose={endBuildSession} />

        {buildSession.impactGlobalDetected && (
          <div className="shrink-0 px-8 py-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-3 max-w-6xl mx-auto">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                  Global impact detected
                </h3>
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                  Major changes have been detected in the scope. Do you want to
                  recalculate suggestions?
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
          <BuildSetupSidebar
            buildSession={buildSession}
            roleFilter={roleFilter}
            pinnedOnly={pinnedOnly}
            staleOnly={staleOnly}
            branchIds={branchIds}
            selectedBranchId={selectedBranchId}
            onRoleFilterChange={setRoleFilter}
            onPinnedOnlyChange={setPinnedOnly}
            onStaleOnlyChange={setStaleOnly}
            onSelectedBranchIdChange={setSelectedBranchId}
            onIncludeBranch={handleIncludeBranch}
            onExcludeBranch={handleExcludeBranch}
            onPinBranch={handlePinBranch}
            onUnpinBranch={handleUnpinBranch}
            onDeliverableChange={setBuildDeliverable}
            onDirectionChange={(direction) => setBuildScopeConfig({ direction })}
            onMaxDepthChange={(maxDepth) => setBuildScopeConfig({ maxDepth })}
            onRecompute={() => recomputeBuildSuggestions()}
            onReset={resetBuildToSuggested}
            primaryActionLabel={primaryActionLabel}
            canPrimaryAction={canPrimaryAction}
            onPrimaryAction={handlePrimaryAction}
          />
          <BuildNodeList
            activeTab={activeTab}
            includedCount={includedNodeIds.length}
            excludedCount={excludedNodeIds.length}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onTabChange={setActiveTab}
            items={currentList}
            onIncludeToggle={handleIncludeToggle}
            onPinToggle={toggleBuildPin}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
