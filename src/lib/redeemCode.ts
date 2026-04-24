const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);

  let code = '';
  for (let i = 0; i < 16; i++) {
    code += CHARS[arr[i] % CHARS.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12)}`;
}
