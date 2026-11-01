// The same slug grammar is used by directory names, types and declared topics.
export const isKebabCase = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
