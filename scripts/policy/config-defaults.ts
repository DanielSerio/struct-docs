import type { Config } from './config-types.js';

// Return independent defaults: one project's normalization cannot mutate another's.
export const defaultConfig = (): Config => ({
  ignore: [],
  living: { gitignored: true },
  doctypes: {
    product: { type: 'prd' },
    specs: {
      type: 'spec',
      fields: {
        status: { kind: 'enum', values: ['draft', 'active', 'superseded'], required: true },
        'superseded-by': { kind: 'reference' },
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
