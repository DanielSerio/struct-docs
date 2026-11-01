import type { ParsedDocument } from './document.js';
import type { FieldDefinition } from './config-types.js';
import { compileField } from './field-compiler.js';
import { defaultConfig } from './config-defaults.js';

// Directory definitions, rather than authored type names, select customizable fields.
export function documentFields(document: ParsedDocument): Readonly<Record<string, FieldDefinition>> {
  const fields = Object.fromEntries(['title', 'type', 'purpose'].map((name) =>
    [name, compileField({ kind: 'string', required: true })]));
  const config = document.context?.config ?? defaultConfig();
  const directory = document.path.split('/')[0] ?? '';
  const doctype = Object.hasOwn(config.doctypes, directory) ? config.doctypes[directory] : undefined;
  return { ...fields, ...doctype?.fields };
}
