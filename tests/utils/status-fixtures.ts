import { breakoutSource, leafSource, rootSource } from './roadmap-checks.js';

/** Stale aggregate copies deliberately differ from the model's effective statuses. */
export function statusFiles() {
  return {
    'roadmaps/v1/index.md': rootSource('v1',
      '### billing <!-- status: done -->\nDeps: payments:auth\nBreakout: ./billing.md\n\n' + leafSource('later')),
    'roadmaps/v1/billing.md': breakoutSource('billing',
      leafSource('checkout', 'done') + '\n' + leafSource('webhooks', 'todo', 'Deps: checkout\n')),
    'roadmaps/payments/index.md': rootSource('payments', leafSource('auth', 'done')),
  };
}
