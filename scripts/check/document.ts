import type { Rule } from '../policy/document.js';
import { filingRule } from './document-filing.js';
import { schemaRule } from './document-schema.js';

// Composition keeps each rule independently testable without a second document contract.
export const documentRule: Rule = (document) => [...filingRule(document), ...schemaRule(document)];
