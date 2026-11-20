import { Skeleton } from "@/components/ui/skeleton";

export default function ItemLoading() {
  return (
    <main className="px-6 py-6 md:px-10 md:py-8">
      <Skeleton className="h-6 w-28" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[320px_1fr]">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-6">
          <Skeleton className="h-9 w-2/3" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((__, j) => (
                  <Skeleton key={j} className="h-10 w-20 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
