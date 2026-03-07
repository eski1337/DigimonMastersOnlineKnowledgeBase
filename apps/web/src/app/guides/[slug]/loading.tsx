import { Skeleton } from '@/components/ui/skeleton';

export default function GuideDetailLoading() {
  return (
    <div className="container py-8 max-w-4xl">
      <Skeleton className="h-10 w-2/3 mb-4" />
      <Skeleton className="h-5 w-1/4 mb-8" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
