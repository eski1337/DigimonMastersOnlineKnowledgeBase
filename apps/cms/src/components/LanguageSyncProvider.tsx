import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from 'payload/components/utilities';

/* ───────────────────────────────────────────────────────────────────────────
   LanguageSyncProvider
   ─────────────────────────────────────────────────────────────────────────
   Syncs the Payload admin language selection with the user's
   `preferredLanguage` field in the database so it persists across
   sessions, devices, and privacy/incognito mode.

   On mount (after login):
     1. Read `preferredLanguage` from the user profile in DB
     2. If it differs from the current cookie, set the cookie + reload
        so Payload picks it up on next render

   On language change (user picks a different language in the admin):
     → Detect via MutationObserver on <html lang="…">
     → PATCH the user profile to persist to DB
   ───────────────────────────────────────────────────────────────────────── */

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

const LanguageSyncProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const didRestoreRef = useRef(false);
  const prevLangRef = useRef<string>('');
  const userRef = useRef(user);
  userRef.current = user;

  const saveToDb = useCallback((lng: string) => {
    const u = userRef.current;
    if (!u) return;
    fetch(`${window.location.origin}/api/users/${(u as any).id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLanguage: lng }),
    }).catch(() => {/* non-critical */});
  }, []);

  // ── On mount: restore language from DB ────────────────────────────
  useEffect(() => {
    if (!user || didRestoreRef.current) return;
    didRestoreRef.current = true;

    const dbLang = (user as any).preferredLanguage;
    const cookieLang = getCookie('payload-lng');
    prevLangRef.current = cookieLang || document.documentElement.lang || 'en';

    if (dbLang && dbLang !== cookieLang) {
      // DB has a preferred language that differs from cookie — apply it
      setCookie('payload-lng', dbLang);
      // Payload reads the cookie on page load, so reload to apply
      window.location.reload();
    } else if (!dbLang && cookieLang) {
      // User has no DB preference yet — save current cookie value to DB
      saveToDb(cookieLang);
    }
  }, [user, saveToDb]);

  // ── Watch for language changes via <html lang="…"> attribute ──────
  useEffect(() => {
    if (!user) return;

    const observer = new MutationObserver(() => {
      const currentLang = document.documentElement.lang;
      if (currentLang && currentLang !== prevLangRef.current) {
        prevLangRef.current = currentLang;
        saveToDb(currentLang);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });

    return () => observer.disconnect();
  }, [user, saveToDb]);

  return <>{children}</>;
};

export default LanguageSyncProvider;
