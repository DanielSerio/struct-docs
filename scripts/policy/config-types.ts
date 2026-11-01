export type ConfigPath = readonly (string | number)[];
export type ConfigIssue = { path: ConfigPath; message: string };
export type ConfigFinding = {
  file: string;
  line: number;
  rule: 'config';
  severity: 'error';
  message: string;
};
export type FieldKind = 'string' | 'enum' | 'list' | 'reference';
export type FieldValidator = (value: unknown) => string | null;
export type FieldOptions = {
  kind: FieldKind;
  required?: boolean;
  values?: string[];
  to?: string;
};
export type DoctypeOptions = {
  type?: string;
  owns?: boolean;
  gitignored?: boolean;
  fields?: Record<string, FieldOptions | null>;
};
export type ConfigOptions = {
  ignore?: string[];
  living?: { gitignored?: boolean };
  doctypes?: Record<string, DoctypeOptions | null>;
};
export type FieldDefinition = FieldOptions & { required: boolean; validate: FieldValidator };
export type Doctype = {
  type: string;
  owns: boolean;
  gitignored: boolean;
  fields: Record<string, FieldDefinition>;
};
export type Config = {
  ignore: string[];
  living: { gitignored: boolean };
  doctypes: Record<string, Doctype>;
};
export type ConfigResult = {
  config: Config | undefined;
  findings: ConfigFinding[];
  lineAt: (path: ConfigPath) => number;
};
