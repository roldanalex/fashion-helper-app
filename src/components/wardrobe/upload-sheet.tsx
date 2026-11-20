"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, ImagePlus, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChipGroup } from "@/components/onboarding/chip-group";
import { CATEGORIES } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { useTaxonomy } from "@/i18n/taxonomy";
import { compressWardrobePhoto } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { createPiece } from "@/app/(app)/wardrobe/actions";

export function UploadSheet({
  person,
}: {
  /** The Person the piece belongs to. */
  person: { id: string; name: string; isMinor: boolean; isSelf: boolean };
}) {
  const t = useTranslations("wardrobe.upload");
  const tx = useTaxonomy();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("top");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  // Children's pieces are tagged by hand by default: no photo needs to reach the AI.
  const [manual, setManual] = useState(person.isMinor);

  function pickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (!file) {
      toast.error(t("needPhoto"));
      return;
    }
    const supabase = createClient();
    try {
      setBusy(t("preparing"));
      const compressed = await compressWardrobePhoto(file);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const itemId = crypto.randomUUID();
      const path = `${user.id}/${person.id}/${itemId}.webp`;

      setBusy(t("uploading"));
      const { error: uploadError } = await supabase.storage
        .from("wardrobe")
        .upload(path, compressed, { contentType: "image/webp" });
      if (uploadError) throw uploadError;

      const created = await createPiece(person.id, {
        id: itemId,
        category,
        description: description.trim() || null,
        imagePath: path,
        manual,
      });
      if (created?.error) throw new Error(created.error);

      if (manual) {
        toast.success(t("photoSaved"));
      } else {
        setBusy(t("reading"));
        const res = await fetch("/api/items/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, personId: person.id }),
        });
        if (!res.ok) {
          toast.warning(t("analyzeFailed"));
        } else {
          toast.success(t("analyzed"));
        }
      }

      setOpen(false);
      pickFile(null);
      setDescription("");
      router.push(`/wardrobe/${itemId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(t("failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" aria-hidden /> {t("trigger")}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{person.isSelf ? t("title") : t("titleFor", { name: person.name })}</SheetTitle>
          <SheetDescription>
            {person.isMinor
              ? t("descriptionMinor")
              : t("description")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4">
          {/* Gallery picker */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {/* Camera capture — `capture` makes phones open the camera directly */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={preview ? t("changePhoto") : t("choosePhoto")}
            className="relative mx-auto flex aspect-square w-full max-w-48 cursor-pointer sm:max-w-60 items-center justify-center overflow-hidden rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {preview ? (
              <Image
                src={preview}
                alt={t("previewAlt")}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-2 text-sm">
                <ImagePlus className="size-6" aria-hidden />
                {t("tapToAdd")}
              </span>
            )}
          </button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="size-4" aria-hidden /> {t("takePhoto")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="size-4" aria-hidden /> {t("fromGallery")}
            </Button>
          </div>

          <ChipGroup
            label={t("kindLabel")}
            options={CATEGORIES.map((o) => ({ value: o, label: tx("category", o) }))}
            value={category}
            onChange={(v) => setCategory(v as string)}
          />

          <div className="space-y-2">
            <Label htmlFor="description">
              {t("aboutLabel")}
            </Label>
            <Textarea
              id="description"
              placeholder={t("aboutPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("aboutHint")}
              {person.isMinor && t("aboutHintMinor")}
            </p>
          </div>
        </div>

        {/* The upload action stays reachable at the bottom of the sheet on short phones. */}
        <div className="sticky bottom-0 border-t bg-popover px-4 pb-4 pt-3">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="manual-tags" className="text-sm">{t("manualLabel")}</Label>
              <p id="manual-tags-help" className="text-xs text-muted-foreground">
                {manual
                  ? t("manualOn")
                  : t("manualOff")}
              </p>
            </div>
            <Switch
              id="manual-tags"
              checked={manual}
              onCheckedChange={setManual}
              aria-describedby="manual-tags-help"
            />
          </div>
          <Button onClick={submit} disabled={!!busy} className="w-full gap-2" size="lg">
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> {busy}
              </>
            ) : (
              manual ? t("upload") : t("uploadAnalyze")
            )}
          </Button>
          <p className="sr-only" aria-live="polite">
            {busy ?? ""}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
