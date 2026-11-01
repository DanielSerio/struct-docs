import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LineCounter, parseDocument } from 'yaml';
import { defaultConfig } from '../policy/config-defaults.js';
import type { Config, ConfigFinding, ConfigResult } from '../policy/config-types.js';
import { configIssues } from '../policy/config-validation.js';
import { sourceLine } from './config-source.js';

export const CONFIG_FILE = '.struct-docs.yml';

export function parseConfig(text: string, file = CONFIG_FILE): ConfigResult {
  const counter = new LineCounter();
  const document = parseDocument(text, { lineCounter: counter, prettyErrors: false });
  const lineAt = (path: readonly (string | number)[]) => sourceLine(document, counter, path);
  const findings: ConfigFinding[] = [...document.errors, ...document.warnings].map((error) => ({
    file, line: counter.linePos(error.pos[0]).line, rule: 'config', severity: 'error',
    message: error.message,
  }));
  if (findings.length) return { config: undefined, findings, lineAt };
  let value: unknown;
  try {
    // An empty file is an empty config; explicit null is a malformed configuration.
    value = document.contents === null ? {} : document.toJS();
  } catch (error) {
    findings.push({ file, line: 1, rule: 'config', severity: 'error',
      message: error instanceof Error ? error.message : 'cannot read YAML configuration' });
    return { config: undefined, findings, lineAt };
  }
  findings.push(...configIssues(value).map(({ path, message }): ConfigFinding => ({
    file, line: lineAt(path), rule: 'config', severity: 'error', message,
  })));
  if (findings.length) return { config: undefined, findings, lineAt };
  const defaults = defaultConfig();
  const options = value as Partial<Config>;
  const config = { ...defaults, ...options, living: { ...defaults.living, ...options.living } };
  return { config, findings, lineAt };
}

export function loadConfig(repoRoot: string): ConfigResult {
  const file = join(repoRoot, CONFIG_FILE);
  try {
    return parseConfig(readFileSync(file, 'utf8'), file);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { config: defaultConfig(), findings: [], lineAt: () => 1 };
    }
    // Filesystem failures are execution failures, not invented document findings.
    throw error;
  }
}
