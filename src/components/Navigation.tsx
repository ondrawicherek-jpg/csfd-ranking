"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";

const navItems = [
  { href: "/", label: "Přehled", icon: "⊞" },
  { href: "/hodnoceni", label: "Hodnocení", icon: "♦" },
  { href: "/moje-filmy", label: "Moje filmy", icon: "☰" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Top bar (desktop) */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 bg-bg-secondary border-b border-border items-center px-6 justify-between">
        <span className="font-semibold text-text-primary tracking-tight">Filmotéka</span>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-bg-card text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {user && (
          <button
            onClick={logout}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            {user.username} · Přepnout
          </button>
        )}
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-border flex">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                active ? "text-accent" : "text-text-muted"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
