"use client";

import { useState } from "react";
import { REVIEW_TOPICS, type ReviewRatingDetails } from "@/lib/review-criteria";
import { formatRating } from "@/lib/review-rating";

export function ReviewCriteriaDetails({ details }: { details: ReviewRatingDetails | null | undefined }) {
  const [open, setOpen] = useState(false);
  const detailedTopics = details ? (Object.keys(REVIEW_TOPICS) as Array<keyof typeof REVIEW_TOPICS>).filter((topic) => details[topic].mode === "criteria") : [];
  if (!details || !detailedTopics.length) return null;
  return <section className="mt-3 border-t border-stone-100 pt-3"><button type="button" onClick={() => setOpen((current) => !current)} className="text-sm font-black text-orange-700 underline underline-offset-4" aria-expanded={open}>Ver critérios</button>{open && <div className="mt-3 grid gap-3">{detailedTopics.map((topic) => { const definition = REVIEW_TOPICS[topic]; const detail = details[topic]; const values = Object.values(detail.criteria).filter((value): value is number => typeof value === "number"); const score = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; return <div key={topic} className="rounded-2xl bg-stone-50 p-3"><p className="text-sm font-black">{definition.label} <span className="font-semibold text-stone-500">· média {formatRating(score)}</span></p><ul className="mt-2 grid gap-1 text-xs text-stone-600">{definition.criteria.map(([id, label]) => typeof detail.criteria[id] === "number" ? <li key={id}>{label}: <b className="text-stone-900">{formatRating(detail.criteria[id])}</b></li> : null)}</ul></div>; })}</div>}</section>;
}
