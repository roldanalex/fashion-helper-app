import { Skeleton } from "@/components/ui/skeleton";

export default function StylistLoading() {
  return (
    <main>
      <div className="px-6 pb-6 pt-8 md:px-10">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-4 px-6 md:px-10">
        <Skeleton className="h-7 w-3/4" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </main>
  );
}
