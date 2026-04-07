import { createHash } from 'node:crypto';

/** SHA-256 hex digest for build-time client page password gate. */
export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
