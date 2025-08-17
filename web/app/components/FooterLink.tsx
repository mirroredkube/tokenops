"use client";

export function CookieSettingsLink() {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        (window as any).openCookieSettings?.();
      }}
      className="hover:underline"
    >
      Cookie settings
    </a>
  );
}
