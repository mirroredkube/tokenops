"use client";

import { useEffect, useMemo, useState } from "react";

type ConsentMap = {
  necessary: boolean; // always true (locked)
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

const COOKIE_NAME = "regula_consent_v1";
const COOKIE_DAYS = 180;

function readConsent(): ConsentMap | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

function writeConsent(map: ConsentMap) {
  const value = encodeURIComponent(JSON.stringify(map));
  const maxAge = COOKIE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function defaultConsent(): ConsentMap {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  };
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  const initial = useMemo(() => readConsent() ?? defaultConsent(), []);
  const [consent, setConsent] = useState<ConsentMap>(initial);

  useEffect(() => {
    // show banner only if no stored consent
    setVisible(readConsent() === null);
  }, []);

  const acceptAll = () => {
    const all: ConsentMap = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    writeConsent(all);
    setConsent(all);
    setVisible(false);
    setOpenSettings(false);
  };

  const rejectAll = () => {
    const none: ConsentMap = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    writeConsent(none);
    setConsent(none);
    setVisible(false);
    setOpenSettings(false);
  };

  const saveSettings = () => {
    writeConsent(consent);
    setVisible(false);
    setOpenSettings(false);
  };

  // expose a global opener for footer link (optional)
  useEffect(() => {
    (window as any).openCookieSettings = () => setOpenSettings(true);
  }, []);

  return (
    <>
      {/* Banner */}
      {visible && !openSettings && (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-5xl p-4">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/95 text-neutral-100 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm md:max-w-3xl md:pr-6">
                We use cookies to operate the site (necessary), and—if you allow—to
                improve analytics, save preferences, and personalize content.
                Read our{" "}
                <a href="/privacy" className="underline hover:opacity-90">
                  Privacy Policy
                </a>
                .
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpenSettings(true)}
                  className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                >
                  Manage settings
                </button>
                <button
                  onClick={rejectAll}
                  className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                >
                  Reject all
                </button>
                <button
                  onClick={acceptAll}
                  className="rounded-md bg-emerald-500 px-3 py-2 text-sm text-neutral-900 hover:bg-emerald-400"
                >
                  Accept all
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {openSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950 text-neutral-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 p-4">
              <div>
                <h3 className="text-lg font-semibold">Cookie settings</h3>
                <p className="mt-1 text-sm text-neutral-400">
                  Enable or disable categories. Necessary cookies are always on.
                </p>
              </div>
              <button
                onClick={() => setOpenSettings(false)}
                className="rounded-md px-2 py-1 text-neutral-400 hover:bg-white/10"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-4 text-sm">
              <Category
                title="Necessary"
                desc="Required for core site functionality (authentication, security, basic preferences)."
                checked
                locked
              />
              <Category
                title="Analytics"
                desc="Anonymous usage statistics to improve features and performance."
                checked={consent.analytics}
                onChange={(v) => setConsent((c) => ({ ...c, analytics: v }))}
              />
              <Category
                title="Preferences"
                desc="Saves UI choices like theme and language for your next visit."
                checked={consent.preferences}
                onChange={(v) => setConsent((c) => ({ ...c, preferences: v }))}
              />
              <Category
                title="Marketing"
                desc="Personalization and remarketing (never sold to third parties)."
                checked={consent.marketing}
                onChange={(v) => setConsent((c) => ({ ...c, marketing: v }))}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 p-4">
              <button
                onClick={rejectAll}
                className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
              >
                Reject all
              </button>
              <button
                onClick={acceptAll}
                className="rounded-md bg-emerald-500 px-3 py-2 text-sm text-neutral-900 hover:bg-emerald-400"
              >
                Accept all
              </button>
              <button
                onClick={saveSettings}
                className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
              >
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Category({
  title,
  desc,
  checked,
  onChange,
  locked,
}: {
  title: string;
  desc: string;
  checked?: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div>
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-neutral-400">{desc}</div>
      </div>
      <div className="shrink-0">
        {locked ? (
          <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-neutral-300">Always on</span>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={!!checked}
              onChange={(e) => onChange?.(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            <span className="text-xs text-neutral-300">Enabled</span>
          </label>
        )}
      </div>
    </div>
  );
}
