const fallbackToPoster = (e) => { e.currentTarget.src = '/No-Poster.png' }

// Deterministic hue per name so the same person always gets the same colour.
function nameHue(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

/**
 * Cast/crew photo with a graceful fallback: people without a TMDB photo get
 * a coloured initials tile instead of the generic "poster not available" image.
 */
export default function PersonAvatar({ profilePath, name }) {
  if (profilePath) {
    return (
      <img
        src={`https://image.tmdb.org/t/p/w185/${profilePath}`}
        alt={name}
        onError={fallbackToPoster}
      />
    )
  }
  const hue = nameHue(name)
  return (
    <div
      className="person-initials"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 38% 26%), hsl(${(hue + 40) % 360} 42% 18%))` }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}
