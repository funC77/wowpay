import crypto from 'crypto';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(): string {
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += CHARS[crypto.randomInt(0, CHARS.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12)}`;
}
