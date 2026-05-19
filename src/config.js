export const API_BASE_URL  = 'https://api.themoviedb.org/3'
export const WATCH_REGION  = 'IN'   // India — matches Hotstar, JioCinema, Prime IN etc.

export const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer ' + process.env.NEXT_PUBLIC_TMDB_API_TOKEN,
  },
}
