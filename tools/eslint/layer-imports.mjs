import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layerOf } from './layer-path.mjs';

const allowed = {
  policy: ['policy'],
  read: ['policy', 'read'],
  render: ['policy', 'render'],
  roadmap: ['policy', 'read', 'roadmap'],
  check: ['policy', 'read', 'render', 'roadmap', 'check'],
  repair: ['policy', 'read', 'render', 'roadmap', 'repair'],
  commands: ['policy', 'read', 'render', 'roadmap', 'check', 'repair', 'commands'],
};
const known = (layer) => Object.hasOwn(allowed, layer);

export default {
  meta: {
    type: 'problem',
    // The root is required: context.cwd changes with where ESLint starts, which would turn
    // this rule off silently when it runs from a subdirectory.
    schema: {
      type: 'array', minItems: 1, maxItems: 1,
      items: [{
        type: 'object', required: ['root'], additionalProperties: false,
        properties: { root: { type: 'string' } },
      }],
    },
    messages: {
      forbidden: '{{from}} may not import {{to}}.',
      unknown: 'Undeclared scripts layer {{layer}}; use a declared layer or update the architecture.',
    },
  },
  create(context) {
    const filename = context.filename;
    const { root } = context.options[0];
    const from = layerOf(filename, root);
    if (from === null) return {};
    if (!known(from)) return {
      Program: (node) => context.report({ node, messageId: 'unknown', data: { layer: from } }),
    };
    const check = (node, source) => {
      if (typeof source !== 'string') return;
      let target;
      if (source.startsWith('file:')) target = fileURLToPath(source);
      else if (path.isAbsolute(source)) target = source;
      else if (source.startsWith('.')) target = path.resolve(path.dirname(filename), source);
      else return; // Builtins and installed packages are outside application layers.
      const to = layerOf(target, root);
      if (to === null) return;
      if (!known(to)) context.report({ node, messageId: 'unknown', data: { layer: to } });
      else if (!allowed[from].includes(to)) {
        context.report({ node, messageId: 'forbidden', data: { from, to } });
      }
    };
    return {
      ImportDeclaration: (node) => check(node, node.source.value),
      ExportNamedDeclaration: (node) => check(node, node.source?.value),
      ExportAllDeclaration: (node) => check(node, node.source.value),
      ImportExpression: (node) => check(node, node.source.value),
      CallExpression: (node) => {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
          check(node, node.arguments[0]?.value);
        }
      },
    };
  },
};
