// Curated genre list for the /genre/[slug] SEO landing pages.
// movieId / tvId are TMDB genre IDs (they differ between movie & TV; some
// genres only exist for one medium — tvId/movieId is null in that case).

export const GENRES = [
  { slug: 'action',      name: 'Action',      movieId: 28,    tvId: 10759, blurb: 'High-octane action movies and series — fights, chases, and explosions.' },
  { slug: 'adventure',   name: 'Adventure',   movieId: 12,    tvId: 10759, blurb: 'Epic journeys and adventure films and shows worth the watch.' },
  { slug: 'animation',   name: 'Animation',   movieId: 16,    tvId: 16,    blurb: 'The best animated movies and series for every age.' },
  { slug: 'comedy',      name: 'Comedy',      movieId: 35,    tvId: 35,    blurb: 'Comedies and sitcoms to make you laugh out loud.' },
  { slug: 'crime',       name: 'Crime',       movieId: 80,    tvId: 80,    blurb: 'Gripping crime thrillers, heists, and detective stories.' },
  { slug: 'documentary', name: 'Documentary', movieId: 99,    tvId: 99,    blurb: 'Eye-opening documentaries and docuseries.' },
  { slug: 'drama',       name: 'Drama',       movieId: 18,    tvId: 18,    blurb: 'Powerful drama films and series that stay with you.' },
  { slug: 'family',      name: 'Family',      movieId: 10751, tvId: 10751, blurb: 'Family-friendly movies and shows everyone can enjoy.' },
  { slug: 'fantasy',     name: 'Fantasy',     movieId: 14,    tvId: 10765, blurb: 'Magical worlds and fantasy epics across film and TV.' },
  { slug: 'history',     name: 'History',     movieId: 36,    tvId: null,  blurb: 'Historical films that bring the past to life.' },
  { slug: 'horror',      name: 'Horror',      movieId: 27,    tvId: null,  blurb: 'Spine-chilling horror movies to keep you up at night.' },
  { slug: 'mystery',     name: 'Mystery',     movieId: 9648,  tvId: 9648,  blurb: 'Twisty mysteries and whodunits across movies and series.' },
  { slug: 'romance',     name: 'Romance',     movieId: 10749, tvId: null,  blurb: 'Romance films from sweeping epics to rom-coms.' },
  { slug: 'sci-fi',      name: 'Science Fiction', movieId: 878, tvId: 10765, blurb: 'Mind-bending sci-fi movies and series.' },
  { slug: 'thriller',    name: 'Thriller',    movieId: 53,    tvId: null,  blurb: 'Edge-of-your-seat thrillers you won’t be able to pause.' },
  { slug: 'war',         name: 'War',         movieId: 10752, tvId: 10768, blurb: 'War movies and series — courage, conflict, and history.' },
  { slug: 'western',     name: 'Western',     movieId: 37,    tvId: 37,    blurb: 'Classic and modern Westerns across film and TV.' },
  { slug: 'kids',        name: 'Kids',        movieId: null,  tvId: 10762, blurb: 'Kids’ shows that are fun, safe, and endlessly rewatchable.' },
]

export const findGenreBySlug = (slug) => GENRES.find(g => g.slug === slug) || null
