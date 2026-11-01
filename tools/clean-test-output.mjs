import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Anchor at this script, so running it from elsewhere cannot delete another project's dist.
rmSync(fileURLToPath(new URL('../dist', import.meta.url)), { recursive: true, force: true });
