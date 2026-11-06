import { cpSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Stand in for the install `init` prints: give a fixture project this checkout's Commander. */
export function installCommander(project: string) {
  cpSync(resolve('node_modules/commander'), join(project, 'node_modules', 'commander'), { recursive: true });
}
