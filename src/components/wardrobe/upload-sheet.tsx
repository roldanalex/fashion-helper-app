"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { compressWardrobePhoto } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

export function UploadSheet() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("top");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function pickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (!file) {
      toast.error("Add a photo of the piece first");
      return;
    }
    const supabase = createClient();
    try {
      setBusy("Preparing photo…");
      const compressed = await compressWardrobePhoto(file);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const itemId = crypto.randomUUID();
      const path = `${user.id}/${itemId}.webp`;

      setBusy("Uploading…");
      const { error: uploadError } = await supabase.storage
        .from("wardrobe")
        .upload(path, compressed, { contentType: "image/webp" });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("clothing_items")
        .insert({
          id: itemId,
          user_id: user.id,
          category,
          description: description.trim() || null,
          image_url: path,
        });
      if (insertError) throw insertError;

      setBusy("Reading the piece…");
      const res = await fetch("/api/items/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) {
        toast.warning(
          "Uploaded, but the stylist couldn't read it — you can re-analyze from the item page.",
        );
      } else {
        toast.success("Piece analyzed — review its tags");
      }

      setOpen(false);
      pickFile(null);
      setDescription("");
      router.push(`/wardrobe/${itemId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" aria-hidden /> Add piece
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Add a piece</SheetTitle>
          <SheetDescription>
            One clear photo on a flat surface or hanger works best.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto px-4 pb-6">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex aspect-square w-full max-w-60 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {preview ? (
              <Image
                src={preview}
                alt="Selected clothing item"
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-2 text-sm">
                <ImagePlus className="size-6" aria-hidden />
                Tap to add photo
              </span>
            )}
          </button>

          <ChipGroup
            label="What kind of piece is it?"
            options={[...CATEGORIES]}
            value={category}
            onChange={(v) => setCategory(v as string)}
          />

          <div className="space-y-2">
            <Label htmlFor="description">
              Tell the stylist about it (optional)
            </Label>
            <Textarea
              id="description"
              placeholder="e.g. White pique polo, slim fit, from Lacoste"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Mentioning the material — pique, knit, merino — makes tagging far
              more accurate.
            </p>
          </div>

          <Button onClick={submit} disabled={!!busy} className="w-full gap-2">
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> {busy}
              </>
            ) : (
              "Upload & analyze"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
