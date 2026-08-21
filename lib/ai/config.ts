/** Server-side configuration for the experimental GODINNER AI Search. */
export function isAiSearchEnabled() {
  return process.env.GODINNER_AI_SEARCH_ENABLED?.trim().toLowerCase() === "true";
}

export function getAiSearchModel() {
  return process.env.OPENAI_AI_SEARCH_MODEL?.trim() || "gpt-5-mini";
}

export function hasOpenAiApiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
