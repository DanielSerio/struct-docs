import type { AddressableNode } from '../policy/roadmap.js';
import type { Finding } from '../policy/findings.js';
import type { RoadmapFile } from './files.js';
import { createRoadmapModel } from './model.js';
import type { RoadmapModel } from './model.js';
import { splitDep } from './dependency.js';

export type DependencyIndex = ReadonlyMap<string, ReadonlyMap<string, AddressableNode>>;

export function indexRoadmaps(roadmaps: ReadonlyMap<string, readonly RoadmapFile[]>, models?: ReadonlyMap<string, RoadmapModel>) {
  return new Map([...roadmaps].map(([name, files]) => [name, (models?.get(name) ?? createRoadmapModel(files)).byId]));
}
export function resolveDep(index: DependencyIndex, from: string, value: string) {
  const dep = splitDep(value);
  return dep ? index.get(dep.roadmap ?? from)?.get(dep.id) ?? null : null;
}
export const resolverFor = (index: DependencyIndex, from: string) => (value: string) => resolveDep(index, from, value);

/** Ported unresolved-dependency check; invalid grammar is left to the field validator. */
export function unresolvedDeps(roadmaps: ReadonlyMap<string, readonly RoadmapFile[]>, index: DependencyIndex): Finding[] {
  const findings: Finding[] = [];
  for (const [name, files] of roadmaps) for (const file of files) for (const node of file.nodes) {
    for (const value of node.deps) {
      if (!splitDep(value) || resolveDep(index, name, value)) continue;
      findings.push({ file: file.rel, line: node.locations.deps?.line ?? node.line,
        rule: 'roadmap-dependency', severity: 'error', message: `\`${node.id}\`: dep \`${value}\` resolves to no node` });
    }
  }
  return findings;
}

/** Qualified addresses keep same-named nodes in separate roadmaps distinct during traversal. */
export function findCycles(index: DependencyIndex): string[][] {
  const state = new Map<string, 'open' | 'done'>();
  const cycles: string[][] = [];
  const walk = (name: string, id: string, stack: string[]) => {
    const key = `${name}:${id}`;
    if (state.get(key) === 'done') return;
    if (state.get(key) === 'open') { cycles.push(stack.slice(stack.indexOf(key))); return; }
    state.set(key, 'open');
    for (const value of index.get(name)?.get(id)?.deps ?? []) {
      const dep = splitDep(value);
      const target = dep && (dep.roadmap ?? name);
      if (dep && target && index.get(target)?.has(dep.id)) walk(target, dep.id, [...stack, `${target}:${dep.id}`]);
    }
    state.set(key, 'done');
  };
  for (const [name, nodes] of index) for (const id of nodes.keys()) walk(name, id, [`${name}:${id}`]);
  return cycles;
}
