"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Layers,
  Settings,
  ShieldCheck,
  Shirt,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_CREDIT, APP_VERSION } from "@/lib/constants";

const baseNavItems = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/wardrobe", label: "Wardrobe", icon: Shirt },
  { href: "/combinations", label: "Outfits", icon: Layers },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };

export function AppShell({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 flex-col border-r bg-sidebar px-3 py-6 md:flex">
        <Link href="/today" className="px-3 font-serif text-lg tracking-wide">
          Aether <span className="text-primary">Wardrobe</span>
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-200",
                  active
                    ? "bg-sidebar-accent font-medium text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto px-3 text-[11px] leading-relaxed text-muted-foreground">
          v{APP_VERSION}
          <br />
          {APP_CREDIT}
        </p>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        {children}
        <footer className="mt-auto px-6 pb-4 pt-10 text-center text-[11px] text-muted-foreground md:hidden">
          v{APP_VERSION} · {APP_CREDIT}
        </footer>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur md:hidden"
      >
        <div
          className={cn(
            "grid pb-[env(safe-area-inset-bottom)]",
            isAdmin ? "grid-cols-6" : "grid-cols-5",
          )}
        >
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
