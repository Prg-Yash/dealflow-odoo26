/**
 * Mobile auth client — mirrors web/lib/auth-client.ts
 * Better Auth REST endpoints, same baseURL.
 * ponytail: plain fetch, no SDK (better-auth/react is web-only).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Prefer environment variable, then dynamic Expo host IP, then localhost fallback
const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
const API = process.env.EXPO_PUBLIC_API_URL || (debuggerHost ? `http://${debuggerHost}:4000` : 'http://localhost:4000');

async function post(path: string, body: object) {
  const token = await AsyncStorage.getItem('auth_token');
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Request failed');
  return data;
}

async function get(path: string) {
  const token = await AsyncStorage.getItem('auth_token');
  const res = await fetch(`${API}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Request failed');
  return data;
}

export async function getPortalQuotations() {
  return get('/api/portal/active-quotes');
}

export async function getQuotationDetails(token: string) {
  return get(`/api/portal/quotations/${token}`);
}

export async function postQuotationComment(token: string, text: string) {
  return post(`/api/portal/quotations/${token}/comments`, { text });
}

export async function postCounterProposal(token: string, changes: any, reason: string) {
  return post(`/api/portal/quotations/${token}/counter-proposal`, { changes, reason });
}

export async function signQuotation(token: string, fullName: string, title?: string, company?: string) {
  return post(`/api/portal/quotations/${token}/sign`, {
    signature: { fullName, title, company },
  });
}

export async function signIn(email: string, password: string) {
  const data = await post('/api/auth/sign-in/email', { email, password });
  if (data.token) await AsyncStorage.setItem('auth_token', data.token);
  if (data.user) await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
  return data;
}

export async function signUp(email: string, password: string, name: string) {
  const data = await post('/api/auth/sign-up/email', { email, password, name });
  if (data.token) await AsyncStorage.setItem('auth_token', data.token);
  if (data.user) await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
  return data;
}

export async function signOut() {
  await post('/api/auth/sign-out', {}).catch(() => {});
  await AsyncStorage.multiRemove(['auth_token', 'auth_user', 'auth_role', 'auth_org', 'auth_email']);
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem('auth_user');
  return raw ? JSON.parse(raw) : null;
}

// ponytail: inferRoleFromEmail mirrors web/lib/roles.ts — no extra dep needed
export function inferRole(email: string): string {
  const e = email.toLowerCase();
  if (e.includes('admin')) return 'admin';
  if (e.includes('manager') || e.includes('elena')) return 'manager';
  if (e.includes('finance') || e.includes('marcus')) return 'finance';
  if (e.includes('buyer') || e.includes('acme') || e.includes('customer')) return 'customer';
  return 'sales_rep';
}
