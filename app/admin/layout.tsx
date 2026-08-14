import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) redirect("/login?next=/admin");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.user.id).maybeSingle();
    if (profile?.role !== "admin") return <main className="grid min-h-screen place-items-center bg-stone-950 p-6 text-center text-white"><div><p className="text-sm font-black text-orange-400">ADMIN GODINNER</p><h1 className="mt-2 text-3xl font-black">Acesso restrito</h1><p className="mt-3 text-stone-300">Esta área é exclusiva para moderação.</p></div></main>;
  }
  return children;
}
