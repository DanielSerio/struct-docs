import { compileField } from '../policy/field-compiler.js';
import type { FieldValidator } from '../policy/config-types.js';
import { documentReference } from '../policy/document-reference.js';
import { isKebabCase } from '../policy/kebab-case.js';
import { splitDep } from './dependency.js';

export type RoadmapField = { required: boolean; validate: FieldValidator };
const text = compileField({ kind: 'string', required: true });
export const statusField = compileField({ kind: 'enum', required: true,
  values: ['todo', 'in-progress', 'blocked', 'done', 'cut'] });
export const idValue: FieldValidator = (value) => typeof value === 'string' && isKebabCase(value)
  ? null : 'must be a kebab-case id';
export const supersededValue: FieldValidator = (value) => {
  const target = splitDep(value);
  return target?.roadmap ? null : 'must be a qualified `<roadmap>:<id>` reference';
};
const documentList: FieldValidator = (value) => {
  if (!Array.isArray(value)) return 'must be an inline list of document references';
  for (const reference of value) {
    const reason = documentReference(reference);
    if (reason) return reason;
  }
  return null;
};
const fileFields = { id: { required: true, validate: idValue }, title: text, status: statusField, intent: text,
  'superseded-by': { required: false, validate: supersededValue } };
// Two reference grammars meet here; each field stores its own validator value.
export const rootFields: Readonly<Record<string, RoadmapField>> = {
  ...fileFields, type: compileField({ kind: 'enum', values: ['roadmap'], required: true }),
  specs: { required: false, validate: documentList },
};
export const breakoutFields: Readonly<Record<string, RoadmapField>> = {
  ...fileFields, type: compileField({ kind: 'enum', values: ['roadmap-node'], required: true }),
};
export const forbiddenFields = new Set(['purpose', 'updated', 'date']);
export const bodyFields = new Set(['id', 'title', 'status', 'intent', 'acceptance', 'deps',
  'breakout', 'superseded-by', 'notes', 'line', 'statusLoc', 'locations']);
export const textValue = text.validate;
