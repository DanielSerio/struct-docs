export type SourceSpan = { line: number; start: number; end: number };
export type RepairMetadata = {
  field: 'status' | 'index';
  actual: string | undefined;
  expected: string;
  location?: SourceSpan;
  applied?: boolean;
  withheld?: boolean;
};
type FindingDetails = { file: string; line: number; rule: string; message: string };
export type Finding = FindingDetails & (
  | { severity: 'error' | 'warning' }
  | { severity: 'repairable'; repair: RepairMetadata }
);
