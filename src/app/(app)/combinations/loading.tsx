import { Skeleton } from "@/components/ui/skeleton";

export default function CombinationsLoading() {
  return (
    <main>
      <div className="px-6 pb-6 pt-8 md:px-10">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid gap-4 px-6 pb-10 sm:grid-cols-2 md:px-10 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-3">
            <div className="flex gap-1.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="aspect-square w-full rounded-md" />
              ))}
            </div>
            <Skeleton className="mt-3 h-5 w-32" />
          </div>
        ))}
      </div>
    </main>
  );
}
