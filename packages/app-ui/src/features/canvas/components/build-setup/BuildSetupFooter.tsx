import { Wand2 } from 'lucide-react';
import { cn } from '@forky/shared-ui';

type BuildSetupFooterProps = {
  label: string;
  onClick: () => void;
  disabled: boolean;
};

export function BuildSetupFooter({ label, onClick, disabled }: BuildSetupFooterProps) {
  return (
    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
          disabled
            ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        )}
      >
        <Wand2 className="w-4 h-4" />
        {label}
      </button>
    </div>
  );
}
