import type { Match, SearchItem } from "./ranking";

// Request/context words should not turn an otherwise useful item description into
// a long bag of accidental matches. Shared by ranking and structured fallback.
const stop = new Set("the with and lost my near at in is it of to for was has have an a i me please help find looking left somewhere yesterday today their this that from on can you its had".split(" "));
export function queryWords(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? [])].filter(word => word.length > 1 && !stop.has(word));
}
const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
const colors: Record<string, string> = { black:"black", white:"white", red:"red", blue:"blue", navy:"blue", azure:"blue", green:"green", yellow:"yellow", orange:"orange", pink:"pink", purple:"purple", violet:"purple", gray:"grey", grey:"grey", brown:"brown", silver:"silver", gold:"gold", teal:"teal", beige:"beige", maroon:"maroon" };
const colorWords = (text: string) => new Set([...words(text)].flatMap(word => colors[word] ? [colors[word]] : []));

/** A semantic addition must support an explicitly stated color in public item facts.
 * Multi-color descriptions use any stated color; unspecified colors impose no gate.
 * Location names are deliberately excluded from an item's color evidence. */
export function supportsQueryColor(item: SearchItem, query: string): boolean {
  const requested = colorWords(query);
  if (!requested.size) return true;
  const present = colorWords([item.title, item.publicDescription, item.color].join(" "));
  return [...requested].some(color => present.has(color));
}

/** Explicit supported object types may use aliases. Otherwise match whole words,
 * at least half the query terms and an item/title anchor. A description-only
 * component (e.g. a laptop sleeve) is not an item. Attribute-only searches remain useful. */
export function structuredEligible(item: SearchItem, query: string): boolean {
  const tokens = queryWords(query);
  if (!supportsQuery(item, query)) return false;
  if (!tokens.length) return false;
  // An explicit supported type (including curated aliases such as holdall/duffel)
  // plus the color check is stronger evidence than incidental word coverage.
  if (itemTypes.some(type => type.aliases.some(alias => words(query).has(alias)))) return true;
  const text = words([item.title,item.publicDescription,item.category,item.color,item.publicLocation].join(" "));
  if (tokens.filter(token => text.has(token)).length * 2 < tokens.length) return false;
  const anchor = words([item.title,item.category].join(" "));
  const attributes = words([item.color,item.publicLocation].join(" "));
  const identity = tokens.filter(token => !colors[token]);
  return (identity.length > 0 && identity.some(token => anchor.has(token))) || tokens.every(token => attributes.has(token));
}

export function eligibleBaseline<T extends SearchItem>(rows: Match<T>[], query: string, limit: number): Match<T>[] {
  return rows.filter(row => structuredEligible(row.item, query)).slice(0,limit);
}

// Small explicit lost-property vocabulary, not an ID/query deny-list. A named
// object must describe the found item itself, not a component in its description.
// Unrecognized paraphrases still use the local model. Broad category searches
// remain broad, while recognized types (computer vs keyboard vs keys) stay distinct.
const itemTypes: {aliases: string[]; category?: string}[] = [
  {aliases:["bag","bags"],category:"bag"},
  {aliases:["backpack","backpacks","rucksack","rucksacks"]},
  {aliases:["duffel","duffels","holdall","holdalls"]},
  {aliases:["tote","totes"]},
  {aliases:["bottle","bottles","flask","flasks","thermos"]},
  {aliases:["key","keys","keyring","keyrings","keyfob"]},
  {aliases:["computer","computers","laptop","laptops","desktop","desktops"]},
  {aliases:["keyboard","keyboards"]},
  {aliases:["phone","phones","smartphone","smartphones"]},
  {aliases:["tablet","tablets"]},
  {aliases:["earbud","earbuds","earphone","earphones","headphone","headphones"]},
  {aliases:["calculator","calculators"]},
  {aliases:["camera","cameras"]},
  {aliases:["charger","chargers"]},
  {aliases:["sweatshirt","sweatshirts","hoodie","hoodies","jumper","jumpers","sweater","sweaters"]},
  {aliases:["jacket","jackets","coat","coats"]},
  {aliases:["scarf","scarves"]},
  {aliases:["hat","hats","cap","caps"]},
  {aliases:["glove","gloves"]},
  {aliases:["shoe","shoes","slipper","slippers","trainer","trainers","sneaker","sneakers"]},
  {aliases:["glasses","spectacles","eyeglasses"]},
  {aliases:["umbrella","umbrellas"]},
  {aliases:["violin","violins"]},
  {aliases:["cello","cellos"]},
  {aliases:["guitar","guitars"]},
  {aliases:["golf"]},
  {aliases:["bicycle","bicycles","bike","bikes"]},
  {aliases:["microwave","microwaves"]},
  {aliases:["ring","rings"]},
];
export function supportsQueryType(item: SearchItem, query: string): boolean {
  const requested = words(query);
  const types = itemTypes.filter(type => type.aliases.some(alias => requested.has(alias)));
  if (!types.length) return true;
  const title = words(item.title);
  const containers = ["case","cover","sleeve","holder"];
  if (containers.some(word => title.has(word)) && !containers.some(word => requested.has(word))) return false;
  return types.some(type => type.category === item.category || type.aliases.some(alias => title.has(alias)));
}
export function supportsQuery(item: SearchItem, query: string): boolean {
  return supportsQueryColor(item, query) && supportsQueryType(item, query);
}
