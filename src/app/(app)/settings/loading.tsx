import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <main>
      <div className="px-6 pb-6 pt-8 md:px-10">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="max-w-xl space-y-8 px-6 pb-10 md:px-10">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-36" />
      </div>
    </main>
  );
}
