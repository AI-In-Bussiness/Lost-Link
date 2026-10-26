/** Public allow-list: private fields on an accidental wider DTO never enter embeddings. */
export type SearchItem = {
  id: string; organizationSlug: string; title: string; publicDescription: string;
  category: string; color: string; publicLocation: string; foundDate: string;
};
export type Match<T extends SearchItem = SearchItem> = { item: T; reasons: string[]; method: "structured" | "hybrid" };
export const MAX_CANDIDATES = 50;
export const DIMENSIONS = 256;
export const MODEL = "text-embedding-3-small";
// Provisional relevance gate. Calibrate against the committed evaluation before enabling publicly.
export const MIN_SIMILARITY = 0.45;
export function publicText(item: SearchItem): string {
  return [item.title, item.publicDescription, item.category, item.color, item.publicLocation].join("\n");
}
export function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length || [...a, ...b].some(n => !Number.isFinite(n))) throw new Error("Invalid embedding");
  const norm = Math.hypot(...a) * Math.hypot(...b);
  if (!norm) throw new Error("Empty embedding");
  return a.reduce((sum, n, i) => sum + n * b[i], 0) / norm;
}
/** Reciprocal rank fusion v1; scores are internal ranking signals, never ownership probabilities. */
export function rank<T extends SearchItem>(items: T[], vectors: number[][], query: number[], baseline: Match<T>[], limit: number): Match<T>[] {
  if (items.length !== vectors.length) throw new Error("Missing embeddings");
  const semantic = items.map((item, i) => ({item, similarity: cosine(query, vectors[i])}))
    .filter(row => row.similarity >= MIN_SIMILARITY)
    .sort((a,b) => b.similarity-a.similarity || b.item.foundDate.localeCompare(a.item.foundDate) || a.item.id.localeCompare(b.item.id));
  const current = new Map(items.map(item => [item.id, item]));
  const scores = new Map<string, {item:T; score:number; semantic:boolean; reasons:string[]}>();
  baseline.forEach((row, i) => {
    const item = current.get(row.item.id);
    if (item) scores.set(item.id, {item, score:1/(60+i+1), semantic:false, reasons:row.reasons});
  });
  semantic.forEach((row, i) => {
    const existing = scores.get(row.item.id);
    scores.set(row.item.id, {item:row.item, score:(existing?.score ?? 0)+1/(60+i+1), semantic:true,
      reasons:[...(existing?.reasons ?? []), "Similar public description (AI); staff must verify ownership"]});
  });
  return [...scores.values()].sort((a,b) => b.score-a.score || b.item.foundDate.localeCompare(a.item.foundDate) || a.item.id.localeCompare(b.item.id))
    .slice(0,limit).map(row => ({item:row.item, reasons:row.reasons, method:row.semantic ? "hybrid" : "structured"}));
}
