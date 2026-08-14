import { Suspense } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PeopleDiscovery } from "@/components/people/people-discovery";

export default function PeoplePage() {
  return <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12"><LoadingSkeleton className="h-10 w-72"/><LoadingSkeleton className="mt-3 h-5 w-full max-w-xl"/><div className="mt-8 grid gap-4 md:grid-cols-2"><LoadingSkeleton className="h-72"/><LoadingSkeleton className="h-72"/></div></div>}><PeopleDiscovery /></Suspense>;
}
