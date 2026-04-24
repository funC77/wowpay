import type { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  BASE_URL: string;
  YIPAY_URL: string;
  YIPAY_PID: string;
  YIPAY_KEY: string;
}

let cachedEnv: Env | null = null;

export function setEnv(e: Env) {
  cachedEnv = e;
}

export function getEnv(): Env {
  if (!cachedEnv) {
    throw new Error('Environment not initialized');
  }
  return cachedEnv;
}
