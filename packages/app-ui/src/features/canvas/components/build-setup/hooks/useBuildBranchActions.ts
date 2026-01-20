import { useCallback, useMemo, useState } from 'react';
import { useBuildActions } from '@forky/state';
import type { BuildSessionState } from '@forky/state';

export function useBuildBranchActions(buildSession: BuildSessionState | null) {
  const {
    includeBuildBranch,
    excludeBuildBranch,
    pinBuildBranch,
    unpinBuildBranch,
  } = useBuildActions();
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const branchIds = useMemo(() => {
    if (!buildSession) return [];
    const set = new Set<string>();
    for (const scoped of buildSession.scopeNodes.values()) {
      for (const branch of scoped.branches) {
        set.add(branch);
      }
    }
    return Array.from(set).sort();
  }, [buildSession]);

  const activeBranchId = useMemo(() => {
    if (!buildSession) return '';
    if (selectedBranchId && branchIds.includes(selectedBranchId)) {
      return selectedBranchId;
    }
    return branchIds[0] ?? '';
  }, [branchIds, buildSession, selectedBranchId]);

  const handleIncludeBranch = useCallback(() => {
    if (activeBranchId) {
      includeBuildBranch(activeBranchId);
    }
  }, [activeBranchId, includeBuildBranch]);

  const handleExcludeBranch = useCallback(() => {
    if (activeBranchId) {
      excludeBuildBranch(activeBranchId);
    }
  }, [activeBranchId, excludeBuildBranch]);

  const handlePinBranch = useCallback(() => {
    if (activeBranchId) {
      pinBuildBranch(activeBranchId);
    }
  }, [activeBranchId, pinBuildBranch]);

  const handleUnpinBranch = useCallback(() => {
    if (activeBranchId) {
      unpinBuildBranch(activeBranchId);
    }
  }, [activeBranchId, unpinBuildBranch]);

  return {
    branchIds,
    selectedBranchId: activeBranchId,
    setSelectedBranchId,
    handleIncludeBranch,
    handleExcludeBranch,
    handlePinBranch,
    handleUnpinBranch,
  };
}
