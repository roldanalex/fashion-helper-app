"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { setActivePerson } from "@/app/(app)/people/actions";

export interface PersonOption {
  id: string;
  name: string;
  isSelf: boolean;
  isMinor: boolean;
}

export function PersonInitial({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-serif text-sm text-primary",
        className,
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function PersonList({
  people,
  activeId,
  onChosen,
}: {
  people: PersonOption[];
  activeId: string;
  onChosen?: () => void;
}) {
  const t = useTranslations("nav.people");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string | null>(null);

  function choose(person: PersonOption) {
    setTarget(person.id);
    start(async () => {
      const res = await setActivePerson(person.id);
      if (res?.error) toast.error(res.error);
      else {
        onChosen?.();
        router.refresh();
      }
      setTarget(null);
    });
  }

  return (
    <ul className="flex flex-col gap-1" aria-label={t("listLabel")}>
      {people.map((p) => {
        const active = p.id === activeId;
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => !active && choose(p)}
              aria-current={active ? "true" : undefined}
              disabled={pending}
              className={cn(
                "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left transition-colors",
                active ? "bg-accent text-primary" : "hover:bg-accent",
              )}
            >
              <PersonInitial name={p.name} />
              <span className="flex-1">
                {p.name}
                {p.isSelf && <span className="text-sm text-muted-foreground"> {t("you")}</span>}
              </span>
              {pending && target === p.id ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : active ? (
                <Check className="size-4" aria-hidden />
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Desktop: a compact "Dressing: …" control under the logo in the sidebar. */
export function SidebarPersonSwitcher({ people, activeId }: { people: PersonOption[]; activeId: string }) {
  const t = useTranslations("nav.people");
  const active = people.find((p) => p.id === activeId) ?? people[0];
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 px-1">
      <p className="px-2 text-xs text-muted-foreground" id="dressing-label">
        {t("dressing")}
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="sidebar-people"
        aria-describedby="dressing-label"
        className="mt-1 flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-sidebar-accent"
      >
        <PersonInitial name={active.name} className="size-6 text-xs" />
        <span className="flex-1 truncate">{active.name}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <div id="sidebar-people" hidden={!open} className="mt-1 text-sm">
        <PersonList people={people} activeId={activeId} onChosen={() => setOpen(false)} />
        <Link
          href="/settings#people"
          className="mt-1 flex min-h-10 items-center gap-2 rounded-md px-3 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <UserPlus className="size-4" aria-hidden /> {t("addPerson")}
        </Link>
      </div>
    </div>
  );
}

/** Mobile: a slim bar at the top of every app page that opens a sheet. */
export function MobilePersonBar({ people, activeId }: { people: PersonOption[]; activeId: string }) {
  const t = useTranslations("nav.people");
  const active = people.find((p) => p.id === activeId) ?? people[0];
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 border-b bg-background/95 px-6 text-sm backdrop-blur md:hidden"
      >
        <span className="text-muted-foreground">{t("dressing")}</span>
        <PersonInitial name={active.name} className="size-6 text-xs" />
        <span className="font-medium">{active.name}</span>
        <ChevronDown className="ml-auto size-4 text-muted-foreground" aria-hidden />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl md:hidden">
          <SheetHeader className="pb-0">
            <SheetTitle className="font-serif text-xl">{t("sheetTitle")}</SheetTitle>
            <SheetDescription>{t("sheetDescription")}</SheetDescription>
          </SheetHeader>
          <div className="px-2 pb-4">
            <PersonList people={people} activeId={activeId} onChosen={() => setOpen(false)} />
            <Link
              href="/settings#people"
              onClick={() => setOpen(false)}
              className="mt-1 flex min-h-12 items-center gap-3 rounded-lg px-3 text-base text-muted-foreground hover:bg-accent"
            >
              <UserPlus className="size-5" aria-hidden /> {t("addPerson")}
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
