import { Check, Pin, PinOff, Search, X as XIcon } from 'lucide-react';
import { cn } from '@forky/shared-ui';
import type { BuildNodeListItem, BuildTab } from './hooks/useBuildFilters';

type BuildNodeListProps = {
  activeTab: BuildTab;
  includedCount: number;
  excludedCount: number;
  searchQuery: string;
  onSearchQueryChange: (next: string) => void;
  onTabChange: (next: BuildTab) => void;
  items: BuildNodeListItem[];
  onIncludeToggle: (nodeId: string) => void;
  onPinToggle: (nodeId: string) => void;
};

const getTierColor = (tier: number) => {
  switch (tier) {
    case 1:
      return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
    case 2:
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 3:
      return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
  }
};

export function BuildNodeList({
  activeTab,
  includedCount,
  excludedCount,
  searchQuery,
  onSearchQueryChange,
  onTabChange,
  items,
  onIncludeToggle,
  onPinToggle,
}: BuildNodeListProps) {
  const isIncluded = activeTab === 'included';
  const emptyLabel = searchQuery ? 'No nodes match your search' : 'No nodes in this list';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <button
              onClick={() => onTabChange('included')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'included'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              Included ({includedCount})
            </button>
            <button
              onClick={() => onTabChange('excluded')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'excluded'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              Excluded ({excludedCount})
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
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search nodes by prompt or summary..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-5xl mx-auto space-y-2">
          {items.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400 dark:text-gray-600 italic">{emptyLabel}</p>
            </div>
          ) : (
            items.map(({ node, scope, isPinned }) => {
              if (!scope) return null;

              return (
                <div
                  key={node.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onIncludeToggle(node.id)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5',
                        isIncluded
                          ? 'border-purple-500 bg-purple-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-purple-500'
                      )}
                    >
                      {isIncluded ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <XIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded',
                            getTierColor(scope.tier)
                          )}
                        >
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
                            {scope.branches.length} branch
                            {scope.branches.length > 1 ? 'es' : ''}
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
                      onClick={() => onPinToggle(node.id)}
                      className={cn(
                        'p-2 rounded-lg transition-colors flex-shrink-0',
                        isPinned
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                      title={isPinned ? 'Unpin' : 'Pin'}
                    >
                      {isPinned ? (
                        <Pin className="w-4 h-4" />
                      ) : (
                        <PinOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
