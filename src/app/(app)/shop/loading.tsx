import { Skeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <main>
      <div className="px-6 pb-6 pt-8 md:px-10">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="grid gap-3 px-6 pb-10 sm:grid-cols-2 md:px-10 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </main>
  );
}
