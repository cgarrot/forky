'use client';

import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '@forky/shared';
import { Button } from '../../atoms/Button';

export interface CanvasControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onReset?: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  zoomLevel?: number;
  className?: string;
}

export const CanvasControls = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onReset,
  canZoomIn = true,
  canZoomOut = true,
  zoomLevel = 1,
  className,
}: CanvasControlsProps) => {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-30 flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2',
        className
      )}
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        icon={<ZoomOut className="h-4 w-4" />}
        aria-label="Zoom out"
      />

      <span className="text-sm font-medium text-gray-600 dark:text-gray-300 px-2 min-w-[50px] text-center">
        {Math.round(zoomLevel * 100)}%
      </span>

      <Button
        variant="secondary"
        size="sm"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        icon={<ZoomIn className="h-4 w-4" />}
        aria-label="Zoom in"
      />

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onFitView}
        icon={<Maximize2 className="h-4 w-4" />}
        aria-label="Fit view"
      />

      {onReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          icon={<RotateCcw className="h-4 w-4" />}
          aria-label="Reset view"
        />
      )}
    </div>
  );
};
