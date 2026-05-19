'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { FRANCHISES } from '../data/franchises'
import { FRANCHISE_POSTERS } from '../data/franchise-posters'
import { usePageMeta } from '../lib/usePageMeta'
import Footer from '../components/Footer'

const IMG = 'https://image.tmdb.org/t/p/w342'

function FanCard({ fr }) {
  const posters = FRANCHISE_POSTERS[fr.slug] || []

  return (
    <Link href={`/franchise/${fr.slug}`} className="fr-fan-card" style={{ '--fan-color': fr.color }}>
      <div className="fr-fan-stack">
        {posters[0] && <img src={`${IMG}${posters[0]}`} alt="" className="fr-fan-poster fr-fan-poster--back"  loading="lazy" />}
        {posters[1] && <img src={`${IMG}${posters[1]}`} alt="" className="fr-fan-poster fr-fan-poster--mid"   loading="lazy" />}
        {(posters[2] || posters[0]) && (
          <img src={`${IMG}${posters[2] || posters[0]}`} alt="" className="fr-fan-poster fr-fan-poster--front" loading="lazy" />
        )}
      </div>
      <div className="fr-fan-info">
        <span className="fr-fan-name">{fr.name}</span>
        <span className="fr-fan-tag">{fr.tagline}</span>
      </div>
    </Link>
  )
}

export default function FranchisesListPage() {
  usePageMeta('All Franchises', 'Browse every movie franchise on CuedUp — MCU, Star Wars, Harry Potter and more.')
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <main>
      <div className="pattern" />
      <div className="wrapper" style={{ paddingTop: 'calc(72px + 2rem)', paddingBottom: '3rem' }}>

        <div className="franchises-list-header">
          <div className="franchises-list-title">Popular Franchises</div>
          <p className="franchises-list-sub">{FRANCHISES.length} franchises</p>
        </div>

        <div className="fr-fan-grid">
          {FRANCHISES.map(fr => <FanCard key={fr.slug} fr={fr} />)}
        </div>

      </div>
      <Footer />
    </main>
  )
}
