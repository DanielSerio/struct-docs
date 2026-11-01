import type { Config } from './config-types.js';

// Return independent defaults: one project's normalization cannot mutate another's.
export const defaultConfig = (): Config => ({
  ignore: [],
  living: { gitignored: true },
  doctypes: {
    product: { type: 'prd', owns: true, gitignored: false, fields: {} },
    specs: {
      type: 'spec', owns: true, gitignored: false,
      fields: {
        status: { kind: 'enum', values: ['draft', 'active', 'superseded'], required: true },
        'superseded-by': { kind: 'reference', required: false },
      },
    },
    reviews: {
      type: 'review', owns: false, gitignored: true,
      fields: {
        subject: { kind: 'string', required: true },
        template: { kind: 'reference', to: 'templates', required: true },
      },
    },
  },
});
