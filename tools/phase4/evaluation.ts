import type { SearchItem, Match } from "../../src/lib/search/ranking.ts";
export type Case = {
  id: string; kind: string; school: string; query: string; relevant: string[];
  rationale: string; filters?: { category?: string; color?: string; from?: string; to?: string };
};
export function scoped(items: SearchItem[], c: Case): SearchItem[] {
  const f = c.filters ?? {};
  return items.filter(i => i.organizationSlug === c.school &&
    (!f.category || i.category === f.category) && (!f.color || i.color === f.color) &&
    (!f.from || i.foundDate >= f.from) && (!f.to || i.foundDate <= f.to))
    .sort((a,b) => a.id.localeCompare(b.id));
}
// Same deterministic public-field counterpart used by Founder B's offline evaluator.
// This is not a SQL policy test. Use eval:search:live for real database/HTTP evidence.
export function baseline(items: SearchItem[], query: string): Match[] {
  const stop = new Set(["the","with","and","lost","my","near","at","in","is","it","of","to","for","was","has","have","an"]);
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1 && !stop.has(t));
  return items.map(item => ({item, score: tokens.filter(t =>
    [item.title,item.publicDescription,item.category,item.color,item.publicLocation].join(" ").toLowerCase().includes(t)).length}))
    .filter(row => row.score > 0)
    .sort((a,b) => b.score-a.score || b.item.foundDate.localeCompare(a.item.foundDate) || a.item.id.localeCompare(b.item.id))
    .slice(0,3).map(({item}) => ({item,reasons:["Matching public item details"],method:"structured"}));
}
export function assess(c: Case, rows: Match[]) {
  const top = rows.slice(0,3);
  const rank = top.findIndex(row => c.relevant.includes(row.item.id));
  return {
    hit: rank >= 0, reciprocalRank: rank < 0 ? 0 : 1/(rank+1),
    falsePositive: c.relevant.length === 0 && top.length > 0,
    leaks: rows.filter(row => row.item.organizationSlug !== c.school).length,
    filterLeaks: rows.filter(row => !scoped([row.item],c).length).length,
  };
}
