import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve paths before enforcing boundaries, so ../ and absolute imports agree.
const allowed = {
  policy: ['policy'],
  read: ['policy', 'read'],
  render: ['policy', 'render'],
  roadmap: ['policy', 'read', 'roadmap'],
  check: ['policy', 'read', 'render', 'roadmap', 'check'],
  repair: ['policy', 'read', 'render', 'roadmap', 'repair'],
  commands: ['policy', 'read', 'render', 'roadmap', 'check', 'repair', 'commands'],
};
const layer = (filename) => filename.replaceAll('\\', '/').match(/\/scripts\/([^/]+)\//)?.[1];

export default {
  meta: {
    type: 'problem', schema: [],
    messages: { forbidden: '{{from}} may not import {{to}}.' },
  },
  create(context) {
    const filename = context.filename;
    const from = layer(filename);
    if (!from || !allowed[from]) return {};
    const check = (node, source) => {
      if (typeof source !== 'string') return;
      let target;
      if (source.startsWith('file:')) target = fileURLToPath(source);
      else if (path.isAbsolute(source)) target = source;
      else if (source.startsWith('.')) target = path.resolve(path.dirname(filename), source);
      else return; // Node builtins and external packages are outside application layers.
      const to = layer(target);
      if (to && !allowed[from].includes(to)) {
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
