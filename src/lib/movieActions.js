import { supabase } from './supabase'

// ── Simple module-level cache for Supabase reads ─────────────────
const cache = new Map()
const TTL   = 5 * 60 * 1000  // 5 min

function cacheGet(key) {
  const hit = cache.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.ts > TTL) { cache.delete(key); return undefined }
  return hit.data
}
function cacheSet(key, data) { cache.set(key, { data, ts: Date.now() }) }
function cacheDelete(...keys) { keys.forEach(k => cache.delete(k)) }

// ── In-flight dedup for Supabase calls ───────────────────────────
// Prevents the same query firing twice if called concurrently
const inflight = new Map()

async function dedupedQuery(key, queryFn) {
  const cached = cacheGet(key)
  if (cached !== undefined) return cached
  if (inflight.has(key)) return inflight.get(key)
  const promise = queryFn().then(result => {
    cacheSet(key, result)
    inflight.delete(key)
    return result
  }).catch(err => {
    inflight.delete(key)
    throw err
  })
  inflight.set(key, promise)
  return promise
}

// ── Saved-movie-IDs set (one shared query per session) ───────────
let _savedIds     = null
let _savedIdsUser = null

export async function getUserSavedMovieIds(userId) {
  if (_savedIds && _savedIdsUser === userId) return _savedIds
  const playlists = await getUserPlaylists(userId)
  if (!playlists.length) {
    _savedIds = new Set(); _savedIdsUser = userId; return _savedIds
  }
  const { data } = await supabase
    .from('playlist_items')
    .select('movie_id')
    .in('playlist_id', playlists.map(p => p.id))
  _savedIds = new Set((data || []).map(r => String(r.movie_id)))
  _savedIdsUser = userId
  return _savedIds
}

export function markMovieSaved(movieId)   { _savedIds?.add(String(movieId)) }
export function markMovieUnsaved(movieId) { _savedIds?.delete(String(movieId)) }
/** Call on logout or user-switch so the next read rebuilds from the new user's playlists. */
export function resetSavedIds() { _savedIds = null; _savedIdsUser = null }

// ── Playlists ─────────────────────────────────────────────────────

export async function getUserPlaylists(userId) {
  return dedupedQuery(`playlists:${userId}`, async () => {
    const { data, error } = await supabase
      .from('playlists')
      .select('id, name, created_at, share_token')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  })
}

export async function createPlaylist(userId, name, ownerName = '') {
  const { data, error } = await supabase
    .from('playlists')
    .insert({ user_id: userId, name: name.trim(), owner_name: ownerName.trim() })
    .select()
    .single()
  if (error) throw error
  cacheDelete(`playlists:${userId}`)
  // Reset the saved-IDs set so it rebuilds on the next read (new playlist means
  // the set is stale — especially important when auto-creating "Library").
  _savedIds = null
  return data
}

export async function deletePlaylist(userId, playlistId) {
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId)
    .eq('user_id', userId)
  if (error) throw error
  cacheDelete(`playlists:${userId}`, `playlist_items:${playlistId}`)
}

export async function updatePlaylist(userId, playlistId, name) {
  const { data, error } = await supabase
    .from('playlists')
    .update({ name: name.trim() })
    .eq('id', playlistId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  cacheDelete(`playlists:${userId}`)
  return data
}

export async function addToPlaylist(userId, playlistId, movieId, movieTitle, moviePosterPath, mediaType = 'movie') {
  const { error } = await supabase
    .from('playlist_items')
    .upsert(
      { playlist_id: playlistId, movie_id: String(movieId), movie_title: movieTitle, movie_poster_path: moviePosterPath, media_type: mediaType },
      { onConflict: 'playlist_id,movie_id' }
    )
  if (error) throw error
  cacheDelete(`playlist_items:${playlistId}`, `movie_playlists:${userId}:${movieId}`)
  markMovieSaved(movieId)
}

// Batch version — single round-trip for adding many items at once (e.g. "Add all" in franchise)
export async function addManyToPlaylist(userId, playlistId, movies) {
  const rows = movies.map(m => ({
    playlist_id:       playlistId,
    movie_id:          String(m.id),
    movie_title:       m.title || m.name || '',
    movie_poster_path: m.poster_path || null,
    media_type:        m.mediaType || 'movie',
  }))
  const { error } = await supabase
    .from('playlist_items')
    .upsert(rows, { onConflict: 'playlist_id,movie_id' })
  if (error) throw error
  cacheDelete(`playlist_items:${playlistId}`)
  movies.forEach(m => { cacheDelete(`movie_playlists:${userId}:${m.id}`); markMovieSaved(m.id) })
}

export async function removeFromPlaylist(userId, playlistId, movieId) {
  const { error } = await supabase
    .from('playlist_items')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('movie_id', String(movieId))
  if (error) throw error
  cacheDelete(`playlist_items:${playlistId}`, `movie_playlists:${userId}:${movieId}`)
  const stillIn = await getMoviePlaylists(userId, movieId)
  if (!stillIn.length) markMovieUnsaved(movieId)
}

export async function getPlaylistItems(playlistId) {
  return dedupedQuery(`playlist_items:${playlistId}`, async () => {
    const { data, error } = await supabase
      .from('playlist_items')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('added_at', { ascending: false })
    if (error) throw error
    return data || []
  })
}

/**
 * Fetch all items for multiple playlists in one query.
 * Also populates the per-playlist cache so getPlaylistItems() hits instantly after.
 */
export async function getAllPlaylistItemsBatch(playlistIds) {
  if (!playlistIds.length) return {}
  const { data, error } = await supabase
    .from('playlist_items')
    .select('*')
    .in('playlist_id', playlistIds)
    .order('added_at', { ascending: false })
  if (error) throw error
  const byPlaylist = {}
  for (const id of playlistIds) byPlaylist[id] = []
  for (const item of (data || [])) byPlaylist[item.playlist_id].push(item)
  for (const [id, items] of Object.entries(byPlaylist)) {
    cacheSet(`playlist_items:${id}`, items)
  }
  return byPlaylist
}

export async function getMoviePlaylists(userId, movieId) {
  return dedupedQuery(`movie_playlists:${userId}:${String(movieId)}`, async () => {
    const playlists = await getUserPlaylists(userId)
    const playlistIds = playlists.map(p => p.id)
    if (!playlistIds.length) return []
    const { data } = await supabase
      .from('playlist_items')
      .select('playlist_id')
      .eq('movie_id', String(movieId))
      .in('playlist_id', playlistIds)
    return (data || []).map(r => r.playlist_id)
  })
}

// ── Shared playlists ─────────────────────────────────────────────

export async function updatePlaylistOwnerName(userId, playlistId, ownerName) {
  const { error } = await supabase
    .from('playlists')
    .update({ owner_name: ownerName.trim() })
    .eq('id', playlistId)
    .eq('user_id', userId)
  if (error) throw error
  cacheDelete(`playlists:${userId}`)
}

export async function enablePlaylistSharing(userId, playlistId, ownerName = '') {
  const token = crypto.randomUUID()
  const { error } = await supabase
    .from('playlists')
    .update({ share_token: token, owner_name: ownerName.trim() })
    .eq('id', playlistId)
    .eq('user_id', userId)
  if (error) throw error
  cacheDelete(`playlists:${userId}`)
  return token
}

/**
 * Fetch a shared playlist + its items in ONE query using a Supabase join.
 * Was: 2 sequential round trips. Now: 1.
 */
export async function getSharedPlaylist(shareToken) {
  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, created_at, owner_name, playlist_items(*)')
    .eq('share_token', shareToken)
    .single()
  if (error) throw error
  const { playlist_items: items, ...playlist } = data
  const sortedItems = (items || []).sort((a, b) =>
    new Date(b.added_at) - new Date(a.added_at)
  )
  return { playlist, items: sortedItems }
}

/**
 * Copy a shared playlist into the current user's account.
 * Fetching shared items and creating the new playlist now run in parallel.
 */
export async function copySharedPlaylist(userId, shareToken, name) {
  // Run in parallel — creating the playlist doesn't depend on the items
  const [{ items }, newPlaylist] = await Promise.all([
    getSharedPlaylist(shareToken),
    createPlaylist(userId, name),
  ])
  if (items.length) {
    const { error } = await supabase
      .from('playlist_items')
      .insert(items.map(item => ({
        playlist_id:       newPlaylist.id,
        movie_id:          item.movie_id,
        movie_title:       item.movie_title,
        movie_poster_path: item.movie_poster_path,
        media_type:        item.media_type,
      })))
    if (error) throw error
    cacheDelete(`playlist_items:${newPlaylist.id}`)
  }
  return newPlaylist
}

// ── Reminders ────────────────────────────────────────────────────

let _reminderIds     = null
let _reminderIdsUser = null

export async function getUserReminderIds(userId) {
  if (_reminderIds && _reminderIdsUser === userId) return _reminderIds
  const { data } = await supabase
    .from('reminders')
    .select('movie_id')
    .eq('user_id', userId)
  _reminderIds = new Set((data || []).map(r => String(r.movie_id)))
  _reminderIdsUser = userId
  return _reminderIds
}

export function markReminded(movieId)   { _reminderIds?.add(String(movieId)) }
export function markUnreminded(movieId) { _reminderIds?.delete(String(movieId)) }
export function resetReminderIds()      { _reminderIds = null; _reminderIdsUser = null }

export async function addReminder(userId, movieId, movieTitle, moviePosterPath, mediaType = 'movie', releaseDate = null) {
  const { error } = await supabase
    .from('reminders')
    .upsert(
      { user_id: userId, movie_id: String(movieId), movie_title: movieTitle, movie_poster_path: moviePosterPath, media_type: mediaType, release_date: releaseDate },
      { onConflict: 'user_id,movie_id' }
    )
  if (error) throw error
  markReminded(movieId)
}

export async function removeReminder(userId, movieId) {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', String(movieId))
  if (error) throw error
  markUnreminded(movieId)
}

export async function getUserReminders(userId) {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── Favourites ────────────────────────────────────────────────────

let _favIds     = null
let _favIdsUser = null

export async function getUserFavoriteIds(userId) {
  if (_favIds && _favIdsUser === userId) return _favIds
  const { data } = await supabase
    .from('favorites')
    .select('movie_id')
    .eq('user_id', userId)
  _favIds = new Set((data || []).map(r => String(r.movie_id)))
  _favIdsUser = userId
  return _favIds
}

export function markFavorited(movieId)   { _favIds?.add(String(movieId)) }
export function markUnfavorited(movieId) { _favIds?.delete(String(movieId)) }
/** Call on logout / user-switch so the cache rebuilds for the new user. */
export function resetFavoriteIds()       { _favIds = null; _favIdsUser = null }

export async function addToFavorites(userId, movieId, movieTitle, moviePosterPath, mediaType = 'movie') {
  const { error } = await supabase
    .from('favorites')
    .upsert(
      { user_id: userId, movie_id: String(movieId), movie_title: movieTitle, movie_poster_path: moviePosterPath, media_type: mediaType },
      { onConflict: 'user_id,movie_id' }
    )
  if (error) throw error
  markFavorited(movieId)
}

export async function removeFromFavorites(userId, movieId) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', String(movieId))
  if (error) throw error
  markUnfavorited(movieId)
}

export async function getFavorites(userId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── Watchlist ─────────────────────────────────────────────────────

export async function isInWatchlist(userId, movieId) {
  return dedupedQuery(`wl:${userId}:${movieId}`, async () => {
    const { data } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .maybeSingle()
    return !!data
  })
}

export async function addToWatchlist(userId, movieId, movieTitle, moviePosterPath) {
  const { error } = await supabase
    .from('watchlist')
    .insert({ user_id: userId, movie_id: movieId, movie_title: movieTitle, movie_poster_path: moviePosterPath })
  if (error) throw error
  cacheSet(`wl:${userId}:${movieId}`, true)
}

export async function removeFromWatchlist(userId, movieId) {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', movieId)
  if (error) throw error
  cacheSet(`wl:${userId}:${movieId}`, false)
}

// ── Watch Diary (watched) ────────────────────────────────────────────────────

let _watchedIds     = null
let _watchedIdsUser = null

/** Set of movie_ids ('tv-<id>' for shows) the user has marked watched. */
export async function getWatchedIds(userId) {
  if (_watchedIds && _watchedIdsUser === userId) return _watchedIds
  const { data } = await supabase
    .from('watched')
    .select('movie_id')
    .eq('user_id', userId)
  _watchedIds = new Set((data || []).map(r => String(r.movie_id)))
  _watchedIdsUser = userId
  return _watchedIds
}

export function markWatched(movieId)   { _watchedIds?.add(String(movieId)) }
export function markUnwatched(movieId) { _watchedIds?.delete(String(movieId)) }
/** Call on logout / user-switch so the cache rebuilds for the new user. */
export function resetWatchedIds()      { _watchedIds = null; _watchedIdsUser = null }

export async function addToWatched(userId, movieId, movieTitle, moviePosterPath, mediaType = 'movie', watchedAt = null) {
  const row = {
    user_id: userId,
    movie_id: String(movieId),
    movie_title: movieTitle,
    movie_poster_path: moviePosterPath,
    media_type: mediaType,
  }
  if (watchedAt) row.watched_at = watchedAt
  const { error } = await supabase
    .from('watched')
    .upsert(row, { onConflict: 'user_id,movie_id' })
  if (error) throw error
  markWatched(movieId)
}

export async function removeFromWatched(userId, movieId) {
  const { error } = await supabase
    .from('watched')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', String(movieId))
  if (error) throw error
  markUnwatched(movieId)
}

/** Full diary rows, newest watched first. */
export async function getWatched(userId) {
  const { data, error } = await supabase
    .from('watched')
    .select('*')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── Episode Progress ──────────────────────────────────────────────────────────

/** Key used in the per-show episode progress cache. */
const epKey = (userId, showId) => `ep:${userId}:${showId}`

/** Returns a Set of "S{n}E{n}" strings for episodes the user has watched. */
export async function getShowEpisodeProgress(userId, showId) {
  return dedupedQuery(epKey(userId, showId), async () => {
    const { data, error } = await supabase
      .from('episode_progress')
      .select('season_number, episode_number')
      .eq('user_id', userId)
      .eq('show_id', String(showId))
    if (error) throw error
    return new Set((data || []).map(r => `S${r.season_number}E${r.episode_number}`))
  })
}

export async function markEpisodeWatched(userId, showId, seasonNumber, episodeNumber) {
  const { error } = await supabase
    .from('episode_progress')
    .upsert(
      { user_id: userId, show_id: String(showId), season_number: seasonNumber, episode_number: episodeNumber },
      { onConflict: 'user_id,show_id,season_number,episode_number' }
    )
  if (error) throw error
  const key = epKey(userId, showId)
  const cached = cacheGet(key)
  if (cached) cached.add(`S${seasonNumber}E${episodeNumber}`)
}

export async function markEpisodeUnwatched(userId, showId, seasonNumber, episodeNumber) {
  const { error } = await supabase
    .from('episode_progress')
    .delete()
    .eq('user_id', userId)
    .eq('show_id', String(showId))
    .eq('season_number', seasonNumber)
    .eq('episode_number', episodeNumber)
  if (error) throw error
  const key = epKey(userId, showId)
  const cached = cacheGet(key)
  if (cached) cached.delete(`S${seasonNumber}E${episodeNumber}`)
}

/**
 * Batch-fetch watched episode counts for multiple shows.
 * Returns a Map<showId, watchedCount>.
 */
export async function getShowsEpisodeCounts(userId, showIds) {
  if (!showIds.length) return new Map()
  const { data, error } = await supabase
    .from('episode_progress')
    .select('show_id')
    .eq('user_id', userId)
    .in('show_id', showIds.map(String))
  if (error) throw error
  const counts = new Map()
  for (const row of (data || [])) {
    counts.set(row.show_id, (counts.get(row.show_id) || 0) + 1)
  }
  return counts
}

// ── Comments ─────────────────────────────────────────────────────────────────

export async function getComments(movieId) {
  const { data, error } = await supabase
    .from('movie_comments')
    .select('*')
    .eq('movie_id', String(movieId))
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data || []
}

export async function addComment(userId, movieId, username, content) {
  const { data, error } = await supabase
    .from('movie_comments')
    .insert({ user_id: userId, movie_id: String(movieId), username, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteComment(commentId, userId) {
  const { error } = await supabase
    .from('movie_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)
  if (error) throw error
}
