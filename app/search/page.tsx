import { Suspense } from "react";
import { SearchExplorer } from "@/components/search/search-explorer";
import { SearchResultsSkeleton } from "@/components/search/search-results-skeleton";
import { isAiSearchEnabled } from "@/lib/ai/config";

export default function SearchPage() {
  return <Suspense fallback={<SearchResultsSkeleton />}><SearchExplorer aiSearchEnabled={isAiSearchEnabled()} /></Suspense>;
}
