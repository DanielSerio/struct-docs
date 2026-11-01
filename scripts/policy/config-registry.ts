import { compileField } from './field-compiler.js';
import { defaultConfig } from './config-defaults.js';
import type { Config, ConfigOptions, Doctype, DoctypeOptions } from './config-types.js';

function mergeDoctype(options: DoctypeOptions, inherited?: Doctype): Doctype {
  const fields = { ...inherited?.fields };
  for (const [name, field] of Object.entries(options.fields ?? {})) {
    if (field === null) delete fields[name];
    // Replace a field as a unit: changing kind must not inherit incompatible options.
    else fields[name] = compileField(field);
  }
  const gitignored = options.gitignored ?? inherited?.gitignored ?? false;
  const type = options.type ?? inherited?.type;
  if (type === undefined) throw new Error('validate doctype types before building the registry');
  return {
    type, gitignored, fields,
    owns: gitignored ? false : options.owns ?? inherited?.owns ?? true,
  };
}

/** Build only after validation: callers never receive a partially applied schema. */
export function mergeConfig(options: ConfigOptions): Config {
  const defaults = defaultConfig();
  const doctypes = defaults.doctypes;
  for (const [name, doctype] of Object.entries(options.doctypes ?? {})) {
    if (doctype === null) delete doctypes[name];
    else doctypes[name] = mergeDoctype(doctype, Object.hasOwn(doctypes, name) ? doctypes[name] : undefined);
  }
  return {
    ignore: options.ignore ?? defaults.ignore,
    living: { ...defaults.living, ...options.living },
    doctypes,
  };
}
