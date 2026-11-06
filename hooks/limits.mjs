/**
 * Host timeouts, in seconds, that every manifest declares for each hook. The manifest validator
 * checks the manifests against these, so a hook's own deadline cannot drift from its host limit.
 */
export const HOOK_TIMEOUTS = { PostToolUse: 5, Stop: 15 };

/** Leave a second for Node to start and the host to read the output. */
export const deadlineFor = (event) => Date.now() + (HOOK_TIMEOUTS[event] - 1) * 1000;
