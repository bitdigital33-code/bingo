import { randomUUID } from 'node:crypto';

export function createId(length = 24) {
  return randomUUID().replace(/-/g, '').slice(0, length);
}
