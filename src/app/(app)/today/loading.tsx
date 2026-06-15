import { Skeleton } from "@/components/ui/skeleton";

export default function TodayLoading() {
  return (
    <main>
      <div className="px-6 pb-6 pt-8 md:px-10">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="space-y-6 px-6 pb-10 md:px-10">
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </main>
  );
}
