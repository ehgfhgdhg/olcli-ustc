/**
 * Configuration management for olcli
 */

import Conf from 'conf';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

interface OlcliConfig {
  sessionCookie?: string;
  lbSrvId?: string;
  csrf?: string;
  lastProject?: string;
  baseUrl?: string;
  sessionCookieName?: string;
  timeout?: number;
  loginEmail?: string;
  loginPassword?: string;
}

export interface PasswordCredentials {
  email: string;
  password: string;
}

const config = new Conf<OlcliConfig>({
  projectName: 'olcli',
  schema: {
    sessionCookie: { type: 'string' },
    lbSrvId: { type: 'string' },
    csrf: { type: 'string' },
    lastProject: { type: 'string' },
    baseUrl: { type: 'string' },
    sessionCookieName: { type: 'string' },
    timeout: { type: 'number' },
    loginEmail: { type: 'string' },
    loginPassword: { type: 'string' }
  }
});

export function getBaseUrl(): string {
  return process.env.OVERLEAF_BASE_URL || config.get('baseUrl') || 'https://latex.ustc.edu.cn';
}

export function setBaseUrl(url: string): void {
  config.set('baseUrl', url);
}

export function getTimeout(): number {
  return Number.parseInt(process.env.OVERLEAF_TIMEOUT || '') || config.get('timeout') || 10000;
}

export function setTimeout(ms: number): void {
  config.set('timeout', ms);
}

export function getPasswordCredentials(): PasswordCredentials | undefined {
  const email = process.env.OVERLEAF_EMAIL || config.get('loginEmail');
  const password = process.env.OVERLEAF_PASSWORD || config.get('loginPassword');
  if (!email || !password) return undefined;
  return { email, password };
}

export function setPasswordCredentials(email: string, password: string): void {
  config.set('loginEmail', email);
  config.set('loginPassword', password);
}

export function clearPasswordCredentials(): void {
  config.delete('loginEmail');
  config.delete('loginPassword');
}

export function getSessionCookieName(): string {
  return process.env.OVERLEAF_COOKIE_NAME || config.get('sessionCookieName') || 'overleaf.sid';
}

export function setSessionCookieName(name: string): void {
  config.set('sessionCookieName', name);
}

export function getSessionCookie(): string | undefined {
  // Check environment variable first
  if (process.env.OVERLEAF_SESSION) {
    return process.env.OVERLEAF_SESSION;
  }

  // Check .olauth file in current directory
  const olAuthPath = join(process.cwd(), '.olauth');
  if (existsSync(olAuthPath)) {
    try {
      const content = readFileSync(olAuthPath, 'utf-8').trim();
      // Parse cookie from olauth file (format: key=value or just value)
      if (content.includes('=')) {
        const cookies = content.split(';').map(c => c.trim());
        const cookieName = getSessionCookieName();
        const sessionCookie = cookies.find(c => c.startsWith(`${cookieName}=`));
        if (sessionCookie) {
          return sessionCookie.split('=')[1];
        }
      }
      return content;
    } catch {
      // Ignore errors
    }
  }

  // Check global config
  return config.get('sessionCookie');
}

export function setSessionCookie(cookie: string): void {
  config.set('sessionCookie', cookie);
}

export function getCsrf(): string | undefined {
  return config.get('csrf');
}

export function setCsrf(csrf: string): void {
  config.set('csrf', csrf);
}

export function getCookieJar(): Record<string, string> | undefined {
  const sid = config.get('sessionCookie');
  const lbId = config.get('lbSrvId');
  if (!sid) return undefined;

  const jar: Record<string, string> = {};
  const name = getSessionCookieName();
  jar[name] = sid;
  if (lbId) jar['lb_srv_id'] = lbId;
  return jar;
}

export function setCookieJar(cookies: Record<string, string>): void {
  const name = getSessionCookieName();
  if (cookies[name]) {
    setSessionCookie(cookies[name]);
  }
  if (cookies['lb_srv_id']) {
    config.set('lbSrvId', cookies['lb_srv_id']);
  }
}

export function getLastProject(): string | undefined {
  return config.get('lastProject');
}

export function setLastProject(projectId: string): void {
  config.set('lastProject', projectId);
}

export function clearConfig(): void {
  config.clear();
}

export function getConfigPath(): string {
  return config.path;
}

/**
 * Save session cookie in .olauth format for compatibility
 */
export function saveOlAuth(cookie: string, path?: string): void {
  const authPath = path || join(process.cwd(), '.olauth');
  writeFileSync(authPath, `${getSessionCookieName()}=${cookie}`, 'utf-8');
}
