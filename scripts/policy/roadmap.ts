import type { SourceSpan } from './findings.js';

export type RoadmapStatus = 'todo' | 'in-progress' | 'blocked' | 'done' | 'cut';
export type RoadmapNode = {
  id: string;
  status: string | undefined;
  line: number;
  statusLoc?: SourceSpan;
  locations: Record<string, SourceSpan>;
  acceptance: { done: boolean; text: string; line: number }[];
  notes: string[];
  deps: string[];
  intent?: string;
  title?: string;
  breakout?: string;
  'superseded-by'?: string;
};
export type RoadmapBody = {
  nodes: RoadmapNode[];
  findings: { line: number; message: string }[];
};
export type AddressableNode = {
  id: string;
  status: string | undefined;
  deps: readonly string[];
  file: string;
  line: number;
};
