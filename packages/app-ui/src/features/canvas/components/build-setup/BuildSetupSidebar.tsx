import { RotateCcw } from 'lucide-react';
import type { BuildScopeDirection, BuildSessionState } from '@forky/state';
import type { RoleFilter } from './hooks/useBuildFilters';
import { BuildSetupFooter } from './BuildSetupFooter';

type BuildSetupSidebarProps = {
  buildSession: BuildSessionState;
  roleFilter: RoleFilter;
  pinnedOnly: boolean;
  staleOnly: boolean;
  branchIds: string[];
  selectedBranchId: string;
  onRoleFilterChange: (next: RoleFilter) => void;
  onPinnedOnlyChange: (next: boolean) => void;
  onStaleOnlyChange: (next: boolean) => void;
  onSelectedBranchIdChange: (next: string) => void;
  onIncludeBranch: () => void;
  onExcludeBranch: () => void;
  onPinBranch: () => void;
  onUnpinBranch: () => void;
  onDeliverableChange: (next: string) => void;
  onDirectionChange: (next: BuildScopeDirection) => void;
  onMaxDepthChange: (next: number) => void;
  onRecompute: () => void;
  onReset: () => void;
  primaryActionLabel: string;
  canPrimaryAction: boolean;
  onPrimaryAction: () => void;
};

export function BuildSetupSidebar({
  buildSession,
  roleFilter,
  pinnedOnly,
  staleOnly,
  branchIds,
  selectedBranchId,
  onRoleFilterChange,
  onPinnedOnlyChange,
  onStaleOnlyChange,
  onSelectedBranchIdChange,
  onIncludeBranch,
  onExcludeBranch,
  onPinBranch,
  onUnpinBranch,
  onDeliverableChange,
  onDirectionChange,
  onMaxDepthChange,
  onRecompute,
  onReset,
  primaryActionLabel,
  canPrimaryAction,
  onPrimaryAction,
}: BuildSetupSidebarProps) {
  return (
    <div className="w-80 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto">
      <div className="p-4 space-y-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Deliverable <span className="text-red-500">*</span>
          </label>
          <textarea
            value={buildSession.deliverable}
            onChange={(e) => onDeliverableChange(e.target.value)}
            placeholder="Ex: Project plan to build a web application"
            rows={3}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
          {!buildSession.deliverable.trim() && (
            <p className="text-xs text-orange-600 dark:text-orange-400">
              The deliverable is required to generate the plan
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
              const next = e.target.value;
              const direction: BuildScopeDirection =
                next === 'parents' || next === 'children' || next === 'both' ? next : 'both';
              onDirectionChange(direction);
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
            onChange={(e) => onMaxDepthChange(parseInt(e.target.value, 10))}
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
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                const next = e.target.value as RoleFilter;
                if (
                  next === 'all' ||
                  next === 'conversation' ||
                  next === 'source' ||
                  next === 'challenger' ||
                  next === 'plan' ||
                  next === 'artifact'
                ) {
                  onRoleFilterChange(next);
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
                onChange={(e) => onPinnedOnlyChange(e.target.checked)}
                className="accent-purple-500"
              />
              Pinned only
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={staleOnly}
                onChange={(e) => onStaleOnlyChange(e.target.checked)}
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
                onChange={(e) => onSelectedBranchIdChange(e.target.value)}
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
                  onClick={onIncludeBranch}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Include branch
                </button>
                <button
                  onClick={onExcludeBranch}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Exclude branch
                </button>
                <button
                  onClick={onPinBranch}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Pin branch
                </button>
                <button
                  onClick={onUnpinBranch}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Unpin branch
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={onRecompute}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Recompute suggestions
            </button>
            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to suggested
            </button>
          </div>
        </div>

        <BuildSetupFooter
          label={primaryActionLabel}
          onClick={onPrimaryAction}
          disabled={!canPrimaryAction}
        />
      </div>
    </div>
  );
}
