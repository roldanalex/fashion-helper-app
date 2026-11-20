"use client";

import { useState } from "react";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  CalendarDays,
  Ellipsis,
  Layers,
  Loader2,
  MessageCircle,
  Settings,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_CREDIT, APP_VERSION } from "@/lib/constants";
import { GenerationBanner } from "@/components/shared/generation-banner";
import { AetherLogo } from "@/components/shared/aether-logo";
import {
  MobilePersonBar,
  SidebarPersonSwitcher,
  type PersonOption,
} from "@/components/people/person-switcher";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** `label` is a key in the nav namespace. */
type NavItem = { href: string; label: string; icon: LucideIcon };

/** Everyday destinations: the mobile tab bar shows these plus "More". */
const primaryNavItems: NavItem[] = [
  { href: "/today", label: "today", icon: CalendarDays },
  { href: "/stylist", label: "stylist", icon: MessageCircle },
  { href: "/wardrobe", label: "wardrobe", icon: Shirt },
  { href: "/combinations", label: "outfits", icon: Layers },
];

/** Less frequent destinations: in the sidebar on desktop, in "More" on mobile. */
const secondaryNavItems: NavItem[] = [
  { href: "/family", label: "family", icon: Users },
  { href: "/shop", label: "shop", icon: ShoppingBag },
  { href: "/settings", label: "settings", icon: Settings },
];

const adminNavItem: NavItem = { href: "/admin", label: "admin", icon: ShieldCheck };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Shows a spinner in place of the icon while this link's navigation is pending. */
function NavIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 className={cn(className, "animate-spin")} aria-hidden />
  ) : (
    <Icon className={className} aria-hidden />
  );
}

export function AppShell({
  children,
  isAdmin = false,
  people = [],
  activeId = "",
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
  /** Everyone this Account dresses; the switcher shows when there are two or more. */
  people?: PersonOption[];
  activeId?: string;
}) {
  const t = useTranslations("nav");
  const showSwitcher = people.length > 1;
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreItems = isAdmin ? [...secondaryNavItems, adminNavItem] : secondaryNavItems;
  const allItems = [...primaryNavItems, ...moreItems];
  const moreActive = moreItems.some((i) => isActive(pathname, i.href));

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 flex-col border-r bg-sidebar px-3 py-6 md:flex">
        <Link
          href="/today"
          className="rounded-md px-2 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <AetherLogo className="h-11" />
        </Link>
        {showSwitcher && <SidebarPersonSwitcher people={people} activeId={activeId} />}
        <nav className={cn("flex flex-col gap-1", showSwitcher ? "mt-6" : "mt-8")} aria-label={t("mainLabel")}>
          {allItems.map(({ href, label, icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200",
                  active
                    ? "bg-sidebar-accent font-medium text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <NavIcon icon={icon} className="size-4" />
                {t(label)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-3">
          <Link
            href="/welcome"
            className="inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <BookOpen className="size-4" aria-hidden />
            {t("howItWorks")}
          </Link>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            v{APP_VERSION}
            <br />
            {APP_CREDIT}
          </p>
        </div>
      </aside>

      {/* Content. Bottom padding clears the tab bar and the iOS home indicator. */}
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {showSwitcher && <MobilePersonBar people={people} activeId={activeId} />}
        <GenerationBanner />
        {children}
        <footer className="mt-auto px-6 pb-4 pt-10 text-center text-xs text-muted-foreground md:hidden">
          v{APP_VERSION} · {APP_CREDIT}
        </footer>
      </div>

      {/* Mobile bottom tab bar: four destinations plus More, all in the thumb zone. */}
      <nav
        aria-label={t("mainLabel")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          {primaryNavItems.map(({ href, label, icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs transition-colors duration-200 focus-visible:-outline-offset-4",
                  active ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                <NavIcon icon={icon} className="size-5" />
                {t(label)}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(
              "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 text-xs transition-colors duration-200 focus-visible:-outline-offset-4",
              moreActive ? "font-medium text-primary" : "text-muted-foreground",
            )}
          >
            <Ellipsis className="size-5" aria-hidden />
            {t("more")}
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl md:hidden">
          <SheetHeader className="pb-0">
            <SheetTitle className="font-serif text-xl">{t("more")}</SheetTitle>
            <SheetDescription className="sr-only">
              {t("moreDescription")}
            </SheetDescription>
          </SheetHeader>
          <nav aria-label={t("more")} className="flex flex-col px-2 pb-4">
            {[...moreItems, { href: "/welcome", label: "howItWorks", icon: BookOpen }].map(
              ({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center gap-4 rounded-lg px-3 text-base transition-colors",
                      active ? "bg-accent text-primary" : "hover:bg-accent",
                    )}
                  >
                    <Icon className="size-5 text-muted-foreground" aria-hidden />
                    {t(label)}
                  </Link>
                );
              },
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
