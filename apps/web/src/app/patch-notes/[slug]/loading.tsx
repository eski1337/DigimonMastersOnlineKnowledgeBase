import { Skeleton } from '@/components/ui/skeleton';

export default function PatchNoteDetailLoading() {
  return (
    <div className="container py-8 max-w-4xl">
      <Skeleton className="h-10 w-2/3 mb-2" />
      <Skeleton className="h-4 w-1/4 mb-8" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
