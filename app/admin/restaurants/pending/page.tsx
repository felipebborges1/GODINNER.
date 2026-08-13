import { Suspense } from "react";import { AdminRestaurants } from "@/components/admin/admin-restaurants";
export default function Page(){return <Suspense fallback={<div className="p-8">Carregando pendências…</div>}><AdminRestaurants pendingOnly/></Suspense>}
