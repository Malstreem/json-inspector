import type { JsonPath } from './model';

export function formatJsonPath(path: JsonPath): string {
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === 'number') return `${formatted}[${segment}]`;
    if (/^[A-Za-z_$][\w$]*$/.test(segment)) return `${formatted}.${segment}`;
    return `${formatted}[${JSON.stringify(segment)}]`;
  }, '$');
}

export function serializeJsonValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) {
    throw new TypeError('This graph item cannot be represented as JSON.');
  }
  return serialized;
}
