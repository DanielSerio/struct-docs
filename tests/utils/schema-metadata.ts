// Compiled validators are closures; compare schema data independently from function identity.
export const schemaMetadata = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value) ?? 'null');
