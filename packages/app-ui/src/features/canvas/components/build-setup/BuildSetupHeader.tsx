import { X } from 'lucide-react';
import type { Node } from '@forky/shared-core';

type BuildSetupHeaderProps = {
  rootNode: Node | null;
  onClose: () => void;
};

export function BuildSetupHeader({ rootNode, onClose }: BuildSetupHeaderProps) {
  return (
    <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Build Setup</h2>
        {rootNode && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            From: {rootNode.prompt.slice(0, 50)}
            {rootNode.prompt.length > 50 ? '...' : ''}
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="Close (Escape)"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
