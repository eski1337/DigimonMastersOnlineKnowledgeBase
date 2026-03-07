import { Skeleton } from '@/components/ui/skeleton';

export default function ItemDetailLoading() {
  return (
    <div className="container py-8 max-w-4xl">
      <Skeleton className="h-10 w-2/3 mb-4" />
      <Skeleton className="h-5 w-1/3 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
