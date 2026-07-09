// Detects the visitor's country via IP geolocation so watch-provider lookups
// aren't hardcoded to one region. No permission prompt (unlike GPS), and more
// reliable than browser language (someone with English set as their language
// isn't necessarily in an English-speaking country).
const CACHE_KEY = 'cuedup_region'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h — country doesn't change often, avoid refetching every load
const FETCH_TIMEOUT = 2500 // don't let a slow/hung geo API delay the page

// Tried in order; a second provider means one outage doesn't fall all the
// way back to the hardcoded default for every visitor.
const GEO_PROVIDERS = [
  { url: 'https://ipapi.co/json/', getRegion: d => d.country_code },
  { url: 'https://ipwho.is/',      getRegion: d => d.country_code },
]

const isValidRegion = code => typeof code === 'string' && /^[A-Z]{2}$/.test(code)

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function detectRegion() {
  for (const provider of GEO_PROVIDERS) {
    try {
      const res = await fetchWithTimeout(provider.url, FETCH_TIMEOUT)
      if (!res.ok) continue
      const region = provider.getRegion(await res.json())
      if (isValidRegion(region)) return region
    } catch {
      // This provider failed or timed out — try the next one.
    }
  }
  return null
}

export async function getUserRegion(fallback = 'IN') {
  if (typeof window === 'undefined') return fallback

  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (cached && Date.now() - cached.ts < CACHE_TTL && isValidRegion(cached.region)) {
      return cached.region
    }
  } catch {
    // Corrupt cache entry — fall through and refetch.
  }

  const region = await detectRegion()
  if (!region) return fallback

  localStorage.setItem(CACHE_KEY, JSON.stringify({ region, ts: Date.now() }))
  return region
}

// Picks watch providers for the user's region, falling back to the app
// default region, then to whatever region TMDB actually returned data for.
export function pickWatchProviders(results, region, fallbackRegion) {
  if (!results) return null
  return results[region] || results[fallbackRegion] || Object.values(results)[0] || null
}
