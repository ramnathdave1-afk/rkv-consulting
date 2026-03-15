import { Skeleton } from '@/components/ui/Skeleton';

export default function MarketLoading() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
      <Skeleton className="h-48" />
    </div>
  );
}
