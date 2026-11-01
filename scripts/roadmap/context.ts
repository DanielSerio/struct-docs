import type { Config } from '../policy/config-types.js';
import type { DocumentContext, ParsedDocument } from '../policy/document.js';
import { roadmapFiles } from './files.js';
import type { RoadmapFile } from './files.js';
import { createRoadmapModel } from './model.js';
import type { RoadmapModel } from './model.js';
import { indexRoadmaps } from './deps.js';
import type { DependencyIndex } from './deps.js';

export type RoadmapContext = DocumentContext & {
  readonly roadmapDocuments: readonly ParsedDocument[];
  readonly roadmaps: ReadonlyMap<string, readonly RoadmapFile[]>;
  readonly models: ReadonlyMap<string, RoadmapModel>;
  readonly depIndex: DependencyIndex;
};

/** Failed files remain in roadmapDocuments even though they cannot supply modeled nodes. */
export function createRoadmapContext(config: Config, documents: readonly ParsedDocument[]): RoadmapContext {
  const roadmapDocuments = documents.filter((document) => document.classification.cls === 'roadmap');
  const roadmaps = roadmapFiles(roadmapDocuments);
  const models = new Map([...roadmaps].map(([name, files]) => [name, createRoadmapModel(files)]));
  return { config, documents, roadmapDocuments, roadmaps, models, depIndex: indexRoadmaps(roadmaps, models) };
}
