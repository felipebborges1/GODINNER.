"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { users } from "@/data/mocks";
import { useAppContext } from "@/hooks/use-app-context";
import { normalize } from "@/lib/search";
import { averageReviewScore, formatRating } from "@/lib/review-rating";
import type { Restaurant } from "@/types";
import { AdminShell } from "./admin-shell";

const reasons = ["duplicado", "dados insuficientes", "fora da região", "conteúdo inválido", "outro"];

export function AdminRestaurantDetail({ id }: { id: string }) {
  const ctx = useAppContext();
  const restaurant = ctx.restaurants.find((item) => item.id === id);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [compareId, setCompareId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | "merge" | null>(null);
  const [draft, setDraft] = useState(restaurant);

  if (!restaurant || !draft) notFound();

  const reviews = ctx.reviews.filter((review) => review.restaurantId === restaurant.id);
  const duplicates = useMemo(
    () => ctx.restaurants.filter((candidate) => {
      if (candidate.id === restaurant.id || (candidate.status ?? "published") !== "published" || candidate.city !== restaurant.city) return false;
      const candidateName = normalize(candidate.name);
      const restaurantName = normalize(restaurant.name);
      return candidateName === restaurantName || candidateName.includes(restaurantName) || restaurantName.includes(candidateName);
    }),
    [ctx.restaurants, restaurant],
  );
  const author = users.find((user) => user.id === restaurant.submittedBy);
  const target = compareId ? ctx.restaurants.find((item) => item.id === compareId) : null;

  const update = <K extends keyof Restaurant>(key: K, value: Restaurant[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };
  const save = () => {
    const result = ctx.updateRestaurantAdmin(id, draft);
    ctx.showToast(result.ok ? "Dados salvos" : result.error ?? "Não foi possível salvar");
    if (result.ok) setEditing(false);
  };
  const moderate = async (kind: "approve" | "reject" | "merge") => {
    const result = kind === "approve"
      ? await ctx.approveRestaurant(id)
      : kind === "reject"
        ? ctx.rejectRestaurant(id, reason)
        : ctx.mergeRestaurant(id, compareId ?? "");
    ctx.showToast(result.ok ? "Moderação atualizada" : result.error ?? "Não foi possível atualizar a moderação");
    if (result.ok) {
      setReason("");
      setCompareId(null);
      setPendingAction(null);
    }
  };

  return (
    <AdminShell active="/admin/restaurants">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-orange-600">MODERAÇÃO</p>
          <h1 className="mt-1 text-3xl font-black">{restaurant.name}</h1>
          <p className="mt-2 text-sm text-stone-500">ID: {restaurant.id} · slug: {restaurant.slug}</p>
        </div>
        <Link href={`/restaurant/${restaurant.mergedIntoId ? ctx.restaurants.find((item) => item.id === restaurant.mergedIntoId)?.slug : restaurant.slug}`} className="rounded-xl bg-white px-4 py-3 text-sm font-bold shadow-sm">Ver perfil público</Link>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <Image src={restaurant.coverPhoto.url} alt={restaurant.name} width={960} height={500} className="aspect-[2/1] w-full rounded-2xl object-cover" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {editing ? <>
              <Field label="Nome"><input value={draft.name} onChange={(event) => update("name", event.target.value)} /></Field>
              <Field label="Endereço"><input value={draft.address} onChange={(event) => update("address", event.target.value)} /></Field>
              <Field label="Bairro"><input value={draft.neighborhood} onChange={(event) => update("neighborhood", event.target.value)} /></Field>
              <Field label="Cidade"><select value={draft.city} onChange={(event) => update("city", event.target.value as Restaurant["city"])}><option>Belo Horizonte</option><option>Nova Lima</option></select></Field>
              <Field label="Categoria"><select value={draft.category} onChange={(event) => update("category", event.target.value as Restaurant["category"])}><option value="restaurant">Restaurante</option><option value="bar">Bar</option></select></Field>
              <Field label="Culinárias"><input value={draft.cuisine.join(", ")} onChange={(event) => update("cuisine", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} /></Field>
              <Field label="Preço"><select value={draft.priceRange ?? ""} onChange={(event) => update("priceRange", event.target.value ? event.target.value as NonNullable<Restaurant["priceRange"]> : null)}><option value="">Não informado</option><option>$</option><option>$$</option><option>$$$</option><option>$$$$</option></select></Field>
              <Field label="Chef"><input value={draft.chef} onChange={(event) => update("chef", event.target.value)} /></Field>
              <Field label="Instagram"><input value={draft.instagram ?? ""} onChange={(event) => update("instagram", event.target.value)} /></Field>
              <Field label="Site"><input value={draft.site ?? ""} onChange={(event) => update("site", event.target.value)} /></Field>
              <Field label="Telefone"><input value={draft.phone ?? ""} onChange={(event) => update("phone", event.target.value)} /></Field>
              <Field label="Latitude"><input type="number" step="any" value={draft.coordinates?.latitude ?? ""} onChange={(event) => update("coordinates", { latitude: Number(event.target.value), longitude: draft.coordinates?.longitude ?? 0 })} /></Field>
              <Field label="Longitude"><input type="number" step="any" value={draft.coordinates?.longitude ?? ""} onChange={(event) => update("coordinates", { latitude: draft.coordinates?.latitude ?? 0, longitude: Number(event.target.value) })} /></Field>
              <button onClick={save} className="rounded-xl bg-stone-950 px-4 py-3 font-bold text-white">Salvar alterações</button>
            </> : <>
              <Info label="Endereço" value={restaurant.address} />
              <Info label="Local" value={`${restaurant.neighborhood} · ${restaurant.city}`} />
              <Info label="Tipo" value={restaurant.category} />
              <Info label="Culinárias" value={restaurant.cuisine.join(", ")} />
              <Info label="Preço" value={restaurant.priceRange ?? "Não informado"} />
              <Info label="Chef" value={restaurant.chef || "—"} />
              <Info label="Coordenadas" value={restaurant.coordinates ? `${restaurant.coordinates.latitude}, ${restaurant.coordinates.longitude}` : "Indisponíveis"} />
              <Info label="Instagram" value={restaurant.instagram || "—"} />
              <Info label="Site" value={restaurant.site || "—"} />
              <Info label="Telefone" value={restaurant.phone || "—"} />
            </>}
          </div>
          {!editing && <button onClick={() => setEditing(true)} className="mt-5 rounded-xl bg-stone-950 px-4 py-3 text-sm font-bold text-white">Editar dados</button>}
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="font-black">Auditoria</h2>
            <Info label="Status" value={restaurant.status ?? "published"} />
            <Info label="Enviado por" value={author?.name ?? "Legado"} />
            <Info label="Enviado em" value={restaurant.submittedAt ? new Date(restaurant.submittedAt).toLocaleString("pt-BR") : "—"} />
            <Info label="Moderado por" value={users.find((user) => user.id === restaurant.moderatedBy)?.name ?? "—"} />
            <Info label="Moderado em" value={restaurant.moderatedAt ? new Date(restaurant.moderatedAt).toLocaleString("pt-BR") : "—"} />
            <Info label="Duo Gourmet" value={restaurant.acceptsDuoGourmet === true ? "✓ Confirmado" : restaurant.acceptsDuoGourmet === false ? "Não parceiro" : "Não verificado"} />
            <Info label="Última verificação Duo" value={restaurant.duoGourmetCheckedAt ? new Date(restaurant.duoGourmetCheckedAt).toLocaleString("pt-BR") : "—"} />
            <Info label="Motivo" value={restaurant.rejectionReason ?? "—"} />
            {restaurant.mergedIntoId && <Info label="Mesclado em" value={ctx.restaurants.find((item) => item.id === restaurant.mergedIntoId)?.name ?? restaurant.mergedIntoId} />}
          </section>
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="font-black">Conteúdo associado</h2>
            <Info label="Reviews" value={String(reviews.length)} />
            <Info label="Média" value={formatRating(averageReviewScore(reviews))} />
            {reviews.map((review) => <div key={review.id} className="mt-3 border-t pt-3 text-sm"><b>Nota: {formatRating(review.rating)}</b>{review.ratingMethod === "dimensions" ? <p className="mt-1 text-stone-600">Comida: {review.foodRating} · Serviço: {review.serviceRating} · Ambiente: {review.ambienceRating}</p> : <p className="mt-1 text-stone-600">Avaliação geral</p>}</div>)}
            <Info label="Listas" value={String(ctx.lists.filter((list) => list.restaurantIds.includes(restaurant.id)).length)} />
            <Info label="Fotos" value={String(reviews.flatMap((review) => review.photos).length)} />
          </section>
          {restaurant.status === "pending_review" && <section className="rounded-3xl bg-stone-950 p-5 text-white">
            <h2 className="font-black">Decisão</h2>
            <button onClick={() => setPendingAction("approve")} className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-bold">Aprovar</button>
            <label className="mt-3 block text-sm font-bold">Motivo da rejeição
              <select aria-label="Motivo da rejeição" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg p-2 text-stone-900"><option value="">Selecione</option>{reasons.map((value) => <option key={value}>{value}</option>)}</select>
            </label>
            <button onClick={() => setPendingAction("reject")} className="mt-3 w-full rounded-xl bg-white/15 py-3 font-bold">Rejeitar</button>
          </section>}
        </aside>
      </div>

      {restaurant.status === "pending_review" && <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-black">Possíveis duplicados</h2>
        {duplicates.length ? duplicates.map((candidate) => <div key={candidate.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-3"><span><b>{candidate.name}</b><small className="block text-stone-500">{candidate.neighborhood} · {candidate.city}</small></span><button onClick={() => setCompareId(candidate.id)} className="rounded-lg bg-stone-950 px-3 py-2 text-sm font-bold text-white">Comparar</button></div>) : <p className="mt-3 text-sm text-stone-500">Nenhuma correspondência provável.</p>}
        {target && <div className="mt-5 rounded-2xl border p-4"><h3 className="font-black">Comparação</h3><div className="mt-3 grid gap-3 md:grid-cols-3"><b>Campo</b><b>Pendente</b><b>Existente</b>{(["name", "address", "neighborhood", "city", "category", "chef"] as const).map((key) => <div key={key} className="contents"><span>{key}</span><span>{String(restaurant[key])}</span><span>{String(target[key])}</span></div>)}</div><div className="mt-4 flex gap-2"><button onClick={() => setCompareId(null)} className="rounded-lg bg-stone-100 px-3 py-2 font-bold">Não é duplicado</button><button onClick={() => setPendingAction("merge")} className="rounded-lg bg-orange-500 px-3 py-2 font-bold text-white">Mesclar com existente</button></div></div>}
      </section>}

      {pendingAction && <div role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><h2 id="admin-confirm-title" className="text-lg font-black">Confirmar ação</h2><p className="mt-2 text-sm text-stone-600">{pendingAction === "approve" ? "Aprovar este restaurante?" : pendingAction === "reject" ? "Rejeitar este restaurante?" : "Mesclar este cadastro? Reviews e listas serão movidas."}</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setPendingAction(null)} className="rounded-lg bg-stone-100 px-4 py-2 font-bold">Cancelar</button><button onClick={() => moderate(pendingAction)} className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white">Confirmar</button></div></div></div>}
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-bold">{label}{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <p className="mt-3 text-sm"><b className="block text-xs uppercase text-stone-500">{label}</b>{value}</p>;
}
