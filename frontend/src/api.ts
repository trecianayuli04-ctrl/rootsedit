import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { storage } from "@/src/utils/storage";

export const TOKEN_KEY = "rollow_token";
const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (f: () => void) => {
  onUnauthorized = f;
};

export async function api<T = any>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const token = await storage.secureGet<string | null>(TOKEN_KEY, null);
  const res = await fetch(BASE + path, {
    method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && token) onUnauthorized?.();
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Terjadi kesalahan, coba lagi");
  return data as T;
}

export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return { data, loading, error, reload: load };
}

export const rp = (n: number | null | undefined) => {
  const v = Math.round(n || 0);
  return `${v < 0 ? "-" : ""}Rp ${String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

export const num = (s: string) => parseFloat((s || "").replace(",", ".")) || 0;
