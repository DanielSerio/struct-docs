/**
 * Host timeouts, in seconds, that every manifest declares for each hook. The manifest validator
 * checks the manifests against these. They are generous because a host can spend seconds just
 * launching a hook (Codex's Windows sandbox under load has), and that time is not ours to control.
 */
export const HOOK_TIMEOUTS = { PostToolUse: 30, Stop: 60 };

/**
 * Each hook's own work budget, in seconds, counted from when the hook starts. It stays well under
 * the host timeout so feedback is prompt however long the launch took, and the hook always
 * finishes on its own rather than being killed.
 */
export const WORK_BUDGETS = { PostToolUse: 4, Stop: 14 };

export const deadlineFor = (event) => Date.now() + WORK_BUDGETS[event] * 1000;
