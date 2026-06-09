'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { FRANCHISES } from '../data/franchises'
import { usePageMeta } from '../lib/usePageMeta'
import { useRevealOnScroll } from '../lib/useRevealOnScroll'
import Footer from '../components/Footer'

const BACKDROP = 'https://image.tmdb.org/t/p/w780'
const hideOnError = (e) => { e.currentTarget.style.display = 'none' }

function FanCard({ fr }) {
  return (
    <Link href={`/franchise/${fr.slug}`} className="fr-fan-card" style={{ '--fan-color': fr.color }}>
      <div className="fr-fan-stack">
        {fr.backdrop && (
          <img src={`${BACKDROP}${fr.backdrop}`} alt={fr.name} className="fr-fan-poster" loading="lazy" onError={hideOnError} />
        )}
        <div className="fr-fan-info">
          <span className="fr-fan-name">{fr.name}</span>
          <span className="fr-fan-tag">{fr.tagline}</span>
        </div>
      </div>
    </Link>
  )
}

export default function FranchisesListPage() {
  usePageMeta('All Franchises', 'Browse every movie franchise on CuedUp — MCU, Star Wars, Harry Potter and more.')
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const gridRef = useRef(null)
  useRevealOnScroll(gridRef, [])

  return (
    <main>

      <div className="wrapper" style={{ paddingTop: 'calc(72px + 2rem)', paddingBottom: '3rem' }}>

        <div className="franchises-list-header page-fade-in">
          <h1 className="franchises-list-title">Popular Franchises</h1>
          <p className="franchises-list-sub">{FRANCHISES.length} franchises</p>
        </div>

        <div className="fr-fan-grid" ref={gridRef}>
          {FRANCHISES.map(fr => <FanCard key={fr.slug} fr={fr} />)}
        </div>

      </div>
      <Footer />
    </main>
  )
}
