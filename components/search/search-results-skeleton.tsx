import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export function SearchResultsSkeleton() {
  return <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-10"><LoadingSkeleton className="h-9 w-52"/><LoadingSkeleton className="mt-5 h-12 max-w-xl"/><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <LoadingSkeleton key={index} className="h-80"/>)}</div></div>;
}
