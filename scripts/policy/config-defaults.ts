import { compileField } from './field-compiler.js';
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
        status: compileField({ kind: 'enum', values: ['draft', 'active', 'superseded'], required: true }),
        'superseded-by': compileField({ kind: 'reference' }),
      },
    },
    reviews: {
      type: 'review', owns: false, gitignored: true,
      fields: {
        subject: compileField({ kind: 'string', required: true }),
        template: compileField({ kind: 'reference', to: 'templates', required: true }),
      },
    },
  },
});
