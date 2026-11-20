"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { setLocale } from "@/app/actions/locale";

/** Language choice; saves at once and re-renders the app in the new language. */
export function LanguagePicker({ className, id }: { className?: string; id?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Select
      value={locale}
      onValueChange={(next) =>
        start(async () => {
          const res = await setLocale(next);
          if (res?.error) toast.error(res.error);
          else router.refresh();
        })
      }
    >
      <SelectTrigger id={id} className={className} aria-label={t("language")}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Globe className="size-4" aria-hidden />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((l) => (
          <SelectItem key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
