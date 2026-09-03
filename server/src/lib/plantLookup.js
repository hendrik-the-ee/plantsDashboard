const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'plantsDashboard/1.0 (local garden plant tracker; contact: local)';

const NON_PLANT_DESC =
  /\b(virus|bacterium|insect|moth|beetle|album|record label|family name|given name|surname|asteroid|painting|video game|company|hotel|commune|village|town|municipality|actor|composer|scholarly article|protein|gene|disambiguation)\b/i;
const PLANT_DESC =
  /\b(species|plant|herb|vegetable|cultivar|crop|fruit|flower|squash|grass|genus of plants|rose family|edible|maize)\b/i;

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, { retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await sleep(900 * (attempt + 1));
      continue;
    }
    throw new Error(`Lookup request failed (${res.status})`);
  }
}

function emptyResult(queriedName, extras = {}) {
  return {
    species: null,
    matchType: 'NONE',
    confidence: 0,
    source: 'wikidata',
    sourceLabel: 'Wikidata',
    sourceUrl: 'https://www.wikidata.org/',
    wikipediaUrl: null,
    queriedName,
    ...extras,
  };
}

function taxonNameFromEntity(entity) {
  return entity?.claims?.P225?.[0]?.mainsnak?.datavalue?.value ?? null;
}

function wikipediaUrlFromEntity(entity) {
  const title = entity?.sitelinks?.enwiki?.title;
  if (!title) return null;
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`;
}

function descriptionOf(entity) {
  return entity?.descriptions?.en?.value ?? '';
}

function labelOf(entity) {
  return entity?.labels?.en?.value ?? '';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholeWord(haystack, needle) {
  if (!haystack || !needle) return false;
  return new RegExp(`(?:^|[^\\p{L}])${escapeRegExp(needle)}(?:[^\\p{L}]|$)`, 'iu').test(
    haystack,
  );
}

function scoreEntity(entity, query) {
  const taxon = taxonNameFromEntity(entity);
  if (!taxon) return -1;

  const desc = descriptionOf(entity);
  const label = labelOf(entity);
  const labelLower = label.toLowerCase();
  const q = query.toLowerCase();
  const wikiTitle = entity?.sitelinks?.enwiki?.title?.toLowerCase() ?? '';

  if (NON_PLANT_DESC.test(desc) && !PLANT_DESC.test(desc)) return -1;

  let score = 10;
  if (labelLower === q || wikiTitle === q) score += 55;
  else if (hasWholeWord(labelLower, q) || hasWholeWord(wikiTitle, q)) score += 35;
  else if (labelLower.includes(q) && q.length >= 5) score += 10;

  if (PLANT_DESC.test(desc)) score += 30;
  if (/\bhybrid species\b/i.test(desc)) score += 15;
  if (/\bgenus of plants\b/i.test(desc)) score += 5;
  if (/\bcultivar\b/i.test(desc)) score += 10;
  if (/\bspecies of\b/i.test(desc)) score += 20;
  if (/\bmaize\b|\bcultivated as a food crop\b/i.test(desc)) score += 25;

  // Prefer taxa whose Wikipedia page title matches the common name closely.
  if (wikiTitle && (wikiTitle === q || hasWholeWord(wikiTitle, q))) score += 15;

  return score;
}

function pickBest(entities, ids, query) {
  let best = null;
  let bestScore = -1;
  for (const id of [...new Set(ids)]) {
    const entity = entities[id];
    if (!entity || entity.missing) continue;
    const score = scoreEntity(entity, query);
    if (score > bestScore) {
      bestScore = score;
      best = entity;
    }
  }
  return { best, bestScore };
}

async function searchWikidataIds(query) {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: query,
    language: 'en',
    uselang: 'en',
    type: 'item',
    limit: '8',
    format: 'json',
    origin: '*',
  });
  const data = await fetchJson(`${WIKIDATA_API}?${params}`);
  return (data.search ?? []).map((row) => row.id).filter(Boolean);
}

async function wikipediaCandidateIds(query) {
  const searchParams = new URLSearchParams({
    action: 'opensearch',
    search: query,
    limit: '4',
    namespace: '0',
    format: 'json',
    origin: '*',
  });
  const search = await fetchJson(`${WIKIPEDIA_API}?${searchParams}`);
  const titles = search[1] ?? [];
  if (titles.length === 0) return [];

  const queryParams = new URLSearchParams({
    action: 'query',
    prop: 'pageprops',
    ppprop: 'wikibase_item',
    redirects: '1',
    titles: titles.join('|'),
    format: 'json',
    origin: '*',
  });
  const pages = await fetchJson(`${WIKIPEDIA_API}?${queryParams}`);
  return Object.values(pages.query?.pages ?? {})
    .map((page) => page.pageprops?.wikibase_item)
    .filter(Boolean);
}

async function fetchEntities(ids) {
  const unique = [...new Set(ids)].slice(0, 12);
  if (unique.length === 0) return {};

  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: unique.join('|'),
    props: 'claims|descriptions|labels|sitelinks',
    languages: 'en',
    format: 'json',
    origin: '*',
  });
  const data = await fetchJson(`${WIKIDATA_API}?${params}`);
  return data.entities ?? {};
}

function singularFallback(query) {
  if (/ies$/i.test(query)) return query.replace(/ies$/i, 'y');
  if (/ses$/i.test(query)) return query.replace(/es$/i, '');
  if (/s$/i.test(query) && !/ss$/i.test(query)) return query.slice(0, -1);
  return null;
}

function toResult(best, bestScore, queriedName) {
  return {
    species: taxonNameFromEntity(best),
    matchType: bestScore >= 60 ? 'EXACT' : 'FUZZY',
    confidence: Math.min(99, Math.max(50, bestScore)),
    source: 'wikidata',
    sourceLabel: 'Wikidata',
    sourceUrl: `https://www.wikidata.org/wiki/${best.id}`,
    wikipediaUrl: wikipediaUrlFromEntity(best),
    queriedName,
    label: labelOf(best) || null,
    description: descriptionOf(best) || null,
  };
}

async function resolveQuery(query, scoreAs) {
  let ids = [];
  try {
    ids = await wikipediaCandidateIds(query);
  } catch {
    ids = [];
  }

  let entities = await fetchEntities(ids);
  let { best, bestScore } = pickBest(entities, ids, scoreAs);
  if (bestScore >= 40) return { best, bestScore };

  const searchIds = await searchWikidataIds(query);
  entities = { ...entities, ...(await fetchEntities(searchIds)) };
  return pickBest(entities, [...ids, ...searchIds], scoreAs);
}

/**
 * Look up a scientific name via Wikidata (P225 taxon name) with Wikipedia link.
 */
export async function lookupSpecies(name) {
  const queriedName = name.trim();
  if (!queriedName) return emptyResult(queriedName);

  const cacheKey = queriedName.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    let { best, bestScore } = await resolveQuery(queriedName, queriedName);

    if (!best || bestScore < 0) {
      const singular = singularFallback(queriedName);
      if (singular && singular.toLowerCase() !== queriedName.toLowerCase()) {
        ({ best, bestScore } = await resolveQuery(singular, singular));
      }
    }

    const value =
      !best || bestScore < 0
        ? emptyResult(queriedName)
        : toResult(best, bestScore, queriedName);
    cache.set(cacheKey, { at: Date.now(), value });
    return value;
  } catch (err) {
    throw new Error(err.message || 'Wikidata lookup failed');
  }
}
