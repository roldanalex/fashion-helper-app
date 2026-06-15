import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <main>
      <div className="px-6 pb-6 pt-8 md:px-10">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="max-w-2xl space-y-10 px-6 pb-10 md:px-10">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </main>
  );
}
