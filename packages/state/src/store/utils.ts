export function detectModeFromPrompt(prompt: string): 'explore' | 'build' {
  const text = prompt.trim().toLowerCase();
  if (!text) return 'explore';

  const buildSignals = [
    'plan',
    'build',
    'create',
    'implement',
    'generate',
    'roadmap',
    'deliverable',
    'mvp',
    'spec',
  ];

  const exploreSignals = ['explain', 'why', 'how', 'compare', 'summarize', 'resume'];

  const hasBuild = buildSignals.some((signal) => text.includes(signal));
  const hasExplore = exploreSignals.some((signal) => text.includes(signal));

  if (hasBuild && !hasExplore) return 'build';
  if (hasExplore && !hasBuild) return 'explore';
  if (text.includes('plan')) return 'build';
  return 'explore';
}

export function isCriticalPrompt(prompt: string): boolean {
  const text = prompt.trim().toLowerCase();
  if (!text) return false;

  const criticalSignals = [
    'contrainte',
    'constraint',
    'requirement',
    'exigence',
    'non-goal',
    'non goal',
    'risque',
    'risk',
    'decision',
    'decision',
    'must',
    'critical',
    'critique',
  ];

  return criticalSignals.some((signal) => text.includes(signal));
}
