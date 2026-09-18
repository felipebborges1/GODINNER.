"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { getCriteriaCount, getTopicCriteriaScore, REVIEW_TOPICS, type ReviewTopic, type ReviewTopicDetail } from "@/lib/review-criteria";
import { formatRating } from "@/lib/review-rating";
import { RatingInput } from "./rating-input";

export function DetailedRatingInput({ topic, value, onChange }: { topic: ReviewTopic; value: ReviewTopicDetail; onChange: (value: ReviewTopicDetail) => void }) {
  const [expanded, setExpanded] = useState(value.mode === "criteria");
  const definition = REVIEW_TOPICS[topic];
  const criteriaScore = getTopicCriteriaScore(value);
  const criteriaCount = getCriteriaCount(value);
  const useDetails = () => { onChange({ ...value, mode: "criteria" }); setExpanded(true); };
  const useGeneral = () => { onChange({ ...value, mode: "general" }); setExpanded(false); };
  const updateCriterion = (id: string, rating: number | null) => onChange({ ...value, criteria: { ...value.criteria, [id]: rating } });

  return <section className="overflow-hidden rounded-2xl bg-stone-100" aria-labelledby={`rating-topic-${topic}`}>
    <div className="p-3">
      {value.mode === "general" ? <><RatingInput label={definition.label} value={value.generalRating} onChange={(rating) => onChange({ ...value, generalRating: rating })}/><button type="button" onClick={useDetails} className="mt-3 text-sm font-black text-orange-700 underline underline-offset-4">Avaliar em detalhes</button></> : <div className="flex items-center justify-between gap-3 rounded-xl bg-orange-50 px-3 py-3 text-xs text-orange-800"><span><b>{definition.label}: {formatRating(criteriaScore)}</b>{criteriaCount ? ` · baseada em ${criteriaCount} ${criteriaCount === 1 ? "critério" : "critérios"}` : " · avalie pelo menos um critério"}</span><button type="button" onClick={useGeneral} className="shrink-0 font-black underline underline-offset-2">Usar nota geral</button></div>}
    </div>
    {value.mode === "criteria" && <div className="border-t border-stone-200 bg-white">
      <button type="button" onClick={() => setExpanded((current) => !current)} className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-black" aria-expanded={expanded}>
        <span>{expanded ? "Ocultar critérios" : "Ver critérios"}</span><ChevronDown size={18} className={expanded ? "rotate-180 transition-transform" : "transition-transform"}/>
      </button>
      {expanded && <div className="grid gap-3 px-3 pb-4">
        {definition.criteria.map(([id, label, description]) => <div key={id} className="rounded-2xl bg-stone-50 p-3"><RatingInput label={label} value={value.criteria[id] ?? null} onChange={(rating) => updateCriterion(id, rating)}/><p className="mt-1 text-xs leading-5 text-stone-500">{description}</p><button type="button" onClick={() => updateCriterion(id, null)} className="mt-2 text-xs font-bold text-stone-600 underline underline-offset-2">Não se aplica / Não avaliei</button></div>)}
      </div>}
    </div>}
  </section>;
}
