import { isAbsolute, sep } from 'node:path';

/**
 * Whether a result of `relative(base, target)` stays at or below its base. Every containment
 * check uses this one test, so `..`, `../x` and another drive are refused the same way
 * everywhere; callers that need a path strictly below the base also refuse ''.
 */
export const isWithin = (local: string) => !isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`);
