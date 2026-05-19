/**
 * Shared module-level API cache.
 *
 * Lives outside React so it survives navigation (component unmounts/remounts).
 * Features:
 *  - TTL per request type
 *  - Stale-while-revalidate: returns cached data instantly, refreshes in background
 *  - In-flight deduplication: same URL fired concurrently shares one Promise
 *  - LRU-ish eviction when cache exceeds MAX entries
 */

const store    = new Map() // url → { data, ts }
const inflight = new Map() // url → Promise<data>
const MAX      = 300

export const TTL = {
  browse:      3 * 60 * 1000,  //  3 min  — trending/now-playing lists
  detail:     15 * 60 * 1000,  // 15 min  — movie / person detail pages (rarely change)
  suggestions: 3 * 60 * 1000,  //  3 min  — search dropdown
}

// Stale-while-revalidate window: serve stale for this long while revalidating in bg
const SWR_WINDOW = {
  browse:      5 * 60 * 1000,  //  5 min
  detail:     30 * 60 * 1000,  // 30 min
  suggestions: 5 * 60 * 1000,  //  5 min
}

/** Return cached entry (may be stale), or null if not present at all. */
export function getCached(url, ttl) {
  const hit = store.get(url)
  if (!hit) return null
  if (Date.now() - hit.ts < ttl) return hit.data  // fresh
  return null
}

/** Return stale data if within the SWR window, otherwise null. */
function getStale(url, ttl, swrWindow) {
  const hit = store.get(url)
  if (!hit) return null
  const age = Date.now() - hit.ts
  if (age < ttl + swrWindow) return hit.data  // stale but within SWR window
  return null
}

function doFetch(url, options) {
  const promise = fetch(url, options)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .then(data => {
      if (store.size >= MAX) store.delete(store.keys().next().value)
      store.set(url, { data, ts: Date.now() })
      inflight.delete(url)
      return data
    })
    .catch(err => {
      inflight.delete(url)
      throw err
    })
  inflight.set(url, promise)
  return promise
}

/**
 * Fetch with deduplication + TTL caching + stale-while-revalidate.
 *
 * - Fresh cache hit  → instant return, no network
 * - Stale but in SWR → instant return of stale data, revalidate in background
 * - No cache         → await network, return result
 */
export async function cachedFetch(url, options, ttl = TTL.detail, swrWindow) {
  // Resolve SWR window
  const swr = swrWindow ??
    (ttl === TTL.browse      ? SWR_WINDOW.browse :
     ttl === TTL.suggestions ? SWR_WINDOW.suggestions :
                               SWR_WINDOW.detail)

  // Fresh hit — return immediately
  const fresh = getCached(url, ttl)
  if (fresh !== null) return fresh

  // In-flight dedup — join existing request
  if (inflight.has(url)) return inflight.get(url)

  // Stale-while-revalidate — return stale instantly, refresh in background
  const stale = getStale(url, ttl, swr)
  if (stale !== null) {
    doFetch(url, options) // fire-and-forget background refresh
    return stale
  }

  // Cache miss — wait for network
  return doFetch(url, options)
}

/**
 * Fire-and-forget warm-up. Silently fills the cache so the next
 * navigation is instant. Safe to call speculatively.
 */
export function prefetch(url, options, ttl = TTL.detail) {
  if (getCached(url, ttl) !== null) return  // already fresh
  if (inflight.has(url)) return             // already loading
  cachedFetch(url, options, ttl).catch(() => {})
}

/**
 * Manually insert data into the cache (e.g. from a parent response
 * that already contains child data — avoids a child fetch entirely).
 */
export function warmCache(url, data) {
  if (store.size >= MAX) store.delete(store.keys().next().value)
  store.set(url, { data, ts: Date.now() })
}
