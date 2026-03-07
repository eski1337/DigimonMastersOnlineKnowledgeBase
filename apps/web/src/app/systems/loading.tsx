import { Skeleton } from '@/components/ui/skeleton';

export default function SystemsLoading() {
  return (
    <div className="container py-8">
      <Skeleton className="h-10 w-1/3 mb-2" />
      <Skeleton className="h-5 w-2/3 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
