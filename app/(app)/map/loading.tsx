import { Skeleton } from '@/components/ui/Skeleton';

export default function MapLoading() {
  return (
    <div className="h-[calc(100vh-3.5rem)] w-full">
      <Skeleton className="h-full w-full" />
    </div>
  );
}
