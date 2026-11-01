import type { ConfigIssue, ConfigPath } from './config-types.js';
import { isRecord, optionTypes, stringList, unknownOptions } from './config-shape.js';
import { registryIssues } from './config-registry-validation.js';

function fieldsIssues(value: unknown, path: ConfigPath): ConfigIssue[] {
  if (!isRecord(value)) return [{ path, message: '`fields` must be a mapping' }];
  return Object.entries(value).flatMap(([name, field]) => {
    const at = [...path, name];
    if (field === null) return [];
    if (!isRecord(field)) return [{ path: at, message: 'field must be a mapping or null' }];
    const issues = unknownOptions(field, ['kind', 'required', 'values', 'to'], at);
    issues.push(...optionTypes(field, { kind: 'string', required: 'boolean', to: 'string' }, at));
    if (!Object.hasOwn(field, 'kind')) issues.push({ path: at, message: 'field requires `kind`' });
    if (Object.hasOwn(field, 'values') && !stringList(field.values)) {
      issues.push({ path: [...at, 'values'], message: '`values` must be a list of strings' });
    }
    return issues;
  });
}

function doctypesIssues(value: unknown): ConfigIssue[] {
  if (!isRecord(value)) return [{ path: ['doctypes'], message: '`doctypes` must be a mapping' }];
  return Object.entries(value).flatMap(([name, doctype]) => {
    const path = ['doctypes', name];
    if (doctype === null) return [];
    if (!isRecord(doctype)) return [{ path, message: 'doctype must be a mapping or null' }];
    const issues = unknownOptions(doctype, ['type', 'owns', 'gitignored', 'fields'], path);
    issues.push(...optionTypes(doctype, { type: 'string', owns: 'boolean', gitignored: 'boolean' }, path));
    if (Object.hasOwn(doctype, 'fields')) issues.push(...fieldsIssues(doctype.fields, [...path, 'fields']));
    return issues;
  });
}

export function configIssues(value: unknown): ConfigIssue[] {
  if (!isRecord(value)) return [{ path: [], message: 'configuration must be a mapping' }];
  const issues = unknownOptions(value, ['ignore', 'living', 'doctypes'], []);
  if (Object.hasOwn(value, 'ignore') && !stringList(value.ignore)) {
    issues.push({ path: ['ignore'], message: '`ignore` must be a list of strings' });
  }
  if (Object.hasOwn(value, 'living')) {
    if (!isRecord(value.living)) issues.push({ path: ['living'], message: '`living` must be a mapping' });
    else {
      issues.push(...unknownOptions(value.living, ['gitignored'], ['living']));
      issues.push(...optionTypes(value.living, { gitignored: 'boolean' }, ['living']));
    }
  }
  if (Object.hasOwn(value, 'doctypes')) issues.push(...doctypesIssues(value.doctypes));
  return [...issues, ...registryIssues(value)];
}
