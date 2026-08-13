import { Suspense } from "react";
import { SearchExplorer } from "@/components/search/search-explorer";
import { SearchResultsSkeleton } from "@/components/search/search-results-skeleton";

export default function SearchPage() {
  return <Suspense fallback={<SearchResultsSkeleton />}><SearchExplorer /></Suspense>;
}
