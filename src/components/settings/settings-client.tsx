"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ChipGroup } from "@/components/onboarding/chip-group";
import { STYLE_PREFERENCES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { updateSettings } from "@/app/(app)/settings/actions";
import type { Profile } from "@/types/database";

export function SettingsClient({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [styles, setStyles] = useState<string[]>(profile.style_preferences);
  const [formality, setFormality] = useState(profile.preferred_formality ?? 5);
  const [location, setLocation] = useState(profile.home_location ?? "");

  function save() {
    startTransition(async () => {
      const res = await updateSettings({
        style_preferences: styles,
        preferred_formality: formality,
        home_location: location,
      });
      if (res?.error) toast.error(res.error);
      else toast.success("Settings saved");
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-8">
      <section className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="mt-1 font-medium">{email}</p>
      </section>

      <ChipGroup
        label="Your styles"
        options={STYLE_PREFERENCES}
        value={styles}
        onChange={(v) => setStyles(v as string[])}
        multiple
      />

      <div>
        <Label className="text-sm font-medium">
          Preferred formality ({formality}/10)
        </Label>
        <Slider
          className="mt-3"
          min={1}
          max={10}
          step={1}
          value={[formality]}
          onValueChange={([v]) => setFormality(v)}
          aria-label="Preferred formality"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="home">Home location</Label>
        <div className="relative">
          <MapPin
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="home"
            className="pl-9"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending} className="gap-2">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save changes
        </Button>
      </div>

      <Separator />

      <Button
        variant="outline"
        onClick={signOut}
        className="gap-2 text-muted-foreground"
      >
        <LogOut className="size-4" aria-hidden /> Sign out
      </Button>
    </div>
  );
}
