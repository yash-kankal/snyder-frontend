/**
 * Sitemap generator for CuedUp.
 *
 * Fetches the most popular movies, TV shows, and people from TMDB
 * and writes public/sitemap.xml so Google can discover all pages.
 *
 * Usage:
 *   NEXT_PUBLIC_TMDB_API_TOKEN=your_token node scripts/generate-sitemap.js
 *
 * Or add to package.json scripts:
 *   "sitemap": "node scripts/generate-sitemap.js"
 * and run: npm run sitemap
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { SITE_URL as DEFAULT_SITE_URL } from '../src/lib/seo.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────
const SITE_URL   = process.env.SITE_URL || DEFAULT_SITE_URL
const PAGES      = 5   // 5 pages × 20 results = 100 items per type
const RATE_DELAY = 250 // ms between requests (TMDB rate limit)

// Read TMDB token from env or from .env / .env.local files
let TOKEN = process.env.NEXT_PUBLIC_TMDB_API_TOKEN || process.env.VITE_TMDB_API_TOKEN
if (!TOKEN) {
  for (const file of ['.env.local', '.env']) {
    try {
      const envFile = readFileSync(resolve(__dirname, '..', file), 'utf8')
      const match   = envFile.match(/(?:NEXT_PUBLIC_TMDB_API_TOKEN|VITE_TMDB_API_TOKEN)=(.+)/)
      if (match?.[1]?.trim()) { TOKEN = match[1].trim(); break }
    } catch {
      // Missing env files are fine; the token may be provided by the shell.
    }
  }
}
if (!TOKEN) {
  console.error('❌  NEXT_PUBLIC_TMDB_API_TOKEN not found. Set it in .env or as an env var.')
  process.exit(1)
}

const headers = { accept: 'application/json', Authorization: `Bearer ${TOKEN}` }
const sleep   = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchPage(endpoint) {
  const res = await fetch(`https://api.themoviedb.org/3${endpoint}`, { headers })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`)
  return res.json()
}

async function collectIds(endpoint, pages) {
  const ids = []
  for (let p = 1; p <= pages; p++) {
    try {
      const data = await fetchPage(`${endpoint}?page=${p}`)
      ids.push(...(data.results || []).map(r => r.id))
      process.stdout.write('.')
      if (p < pages) await sleep(RATE_DELAY)
    } catch (err) {
      console.warn(`\n⚠️  Skipped ${endpoint} page ${p}: ${err.message}`)
    }
  }
  return ids
}

function xmlUrl(loc, priority = '0.8', changefreq = 'weekly') {
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

async function generate() {
  console.log('🗺️  Generating sitemap for', SITE_URL)

  // Static pages
  const staticUrls = [
    xmlUrl(`${SITE_URL}/`, '1.0', 'daily'),
    xmlUrl(`${SITE_URL}/browse`, '0.9', 'daily'),
    xmlUrl(`${SITE_URL}/anime`, '0.7', 'weekly'),
  ]

  // Movies
  process.stdout.write('Fetching movies ')
  const movieIds = await collectIds('/movie/popular', PAGES)
  console.log(` → ${movieIds.length} movies`)
  const movieUrls = [...new Set(movieIds)].map(id => xmlUrl(`${SITE_URL}/movie/${id}`))

  // TV Shows
  process.stdout.write('Fetching TV shows ')
  const tvIds = await collectIds('/tv/popular', PAGES)
  console.log(` → ${tvIds.length} shows`)
  const tvUrls = [...new Set(tvIds)].map(id => xmlUrl(`${SITE_URL}/tv/${id}`, '0.7'))

  // Trending people
  process.stdout.write('Fetching people ')
  const personIds = await collectIds('/trending/person/week', Math.min(PAGES, 3))
  console.log(` → ${personIds.length} people`)
  const personUrls = [...new Set(personIds)].map(id => xmlUrl(`${SITE_URL}/person/${id}`, '0.6'))

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticUrls,
    ...movieUrls,
    ...tvUrls,
    ...personUrls,
    '</urlset>',
  ].join('\n')

  const outPath = resolve(__dirname, '../public/sitemap.xml')
  writeFileSync(outPath, xml, 'utf8')

  const total = staticUrls.length + movieUrls.length + tvUrls.length + personUrls.length
  console.log(`✅  Wrote ${total} URLs to public/sitemap.xml`)
}

generate().catch(err => { console.error('\n❌', err.message); process.exit(1) })
