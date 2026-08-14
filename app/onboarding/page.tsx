import { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default function OnboardingPage() {
  return <Suspense fallback={<main className="mx-auto max-w-xl px-4 py-12 text-sm font-bold text-stone-500">Preparando seu começo...</main>}><OnboardingFlow /></Suspense>;
}
