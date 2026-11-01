import type { FieldDefinition, FieldKind, FieldOptions, FieldValidator } from './config-types.js';
import { documentReference } from './document-reference.js';

const stringValue: FieldValidator = (value) =>
  typeof value === 'string' && value.trim().length > 0 ? null : 'must be a nonempty string';
const listValue: FieldValidator = (value) =>
  Array.isArray(value) && value.every((item: unknown) => stringValue(item) === null)
    ? null : 'must be a list of nonempty strings';

// Grammar functions are values on each field, so checks need no per-kind dispatch.
const grammars: Record<FieldKind, (options: FieldOptions) => FieldValidator> = {
  string: () => stringValue,
  list: () => listValue,
  enum: (options) => {
    const values = [...(options.values ?? [])];
    return (value) => typeof value === 'string' && values.includes(value)
      ? null : `must be one of ${values.join(' | ')}`;
  },
  reference: ({ to }) => (value) => documentReference(value, to),
};

/** Compile only validated options; validators never print, read files or mutate input. */
export function compileField(options: FieldOptions): FieldDefinition {
  return { ...options, ...(options.values ? { values: [...options.values] } : {}),
    required: options.required ?? false, validate: grammars[options.kind](options) };
}
