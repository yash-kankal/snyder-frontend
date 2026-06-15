'use client'
import { useState } from 'react'
import Link from 'next/link'

/* ── Reusable legal modal ────────────────────────────────────────── */
function LegalModal({ title, onClose, children }) {
  return (
    <div className="legal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={e => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2 className="legal-modal-title">{title}</h2>
          <button className="legal-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
        <div className="legal-modal-body">{children}</div>
      </div>
    </div>
  )
}

function PrivacyPolicy({ onClose }) {
  return (
    <LegalModal title="Privacy Policy" onClose={onClose}>
      <p className="legal-updated">Last updated: May 2026</p>

      <h3>1. Who We Are</h3>
      <p>CuedUp is a free, personal movie and TV tracking application. We are an independent project and are not affiliated with, endorsed by, or certified by The Movie Database (TMDB).</p>

      <h3>2. Information We Collect</h3>
      <p>We collect only the minimum information necessary to provide the service:</p>
      <ul>
        <li><strong>Account data</strong> — your email address and display name when you sign up, used solely to identify your account.</li>
        <li><strong>Watchlist data</strong> — the movies and TV shows you save to your playlists, stored so you can access them across devices.</li>
        <li><strong>Authentication tokens</strong> — session tokens managed by Supabase to keep you signed in.</li>
      </ul>
      <p>We do <strong>not</strong> collect your payment information, browsing history outside of CuedUp, or any sensitive personal data.</p>

      <h3>3. How We Use Your Information</h3>
      <ul>
        <li>To create and maintain your account.</li>
        <li>To save and sync your watchlists and playlists.</li>
        <li>To send a one-time email verification when you register.</li>
      </ul>
      <p>We do <strong>not</strong> sell, rent, or share your personal information with third parties for marketing purposes.</p>

      <h3>4. Third-Party Services</h3>
      <ul>
        <li><strong>TMDB (The Movie Database)</strong> — all movie and TV metadata, posters, and ratings are fetched from the TMDB API. Your use of CuedUp is also subject to TMDB's terms. We do not send your personal data to TMDB.</li>
        <li><strong>Supabase</strong> — our backend database and authentication provider. Your account data is stored securely on Supabase's infrastructure.</li>
        <li><strong>Google OAuth</strong> — if you choose to sign in with Google, Google's privacy policy governs that interaction.</li>
      </ul>

      <h3>5. Data Retention</h3>
      <p>Your data is retained for as long as your account is active. You may delete your account at any time from your profile settings, which permanently removes all associated data.</p>

      <h3>6. Cookies &amp; Local Storage</h3>
      <p>We use browser local storage only to persist your authentication session. We do not use advertising cookies or third-party tracking.</p>

      <h3>7. Children's Privacy</h3>
      <p>CuedUp is not directed at children under 13. We do not knowingly collect data from anyone under 13 years of age.</p>

      <h3>8. Changes to This Policy</h3>
      <p>We may update this Privacy Policy periodically. Continued use of CuedUp after changes constitutes acceptance of the updated policy.</p>

      <h3>9. Contact</h3>
      <p>Questions about this policy? Reach out via the CuedUp GitHub repository or the contact details listed on the site.</p>
    </LegalModal>
  )
}

function TermsOfService({ onClose }) {
  return (
    <LegalModal title="Terms of Service" onClose={onClose}>
      <p className="legal-updated">Last updated: May 2026</p>

      <h3>1. Acceptance of Terms</h3>
      <p>By accessing or using CuedUp, you agree to these Terms of Service. If you do not agree, please do not use the application.</p>

      <h3>2. Free Service</h3>
      <p>CuedUp is completely <strong>free to use</strong>. We do not charge for any feature now or in the foreseeable future. There are no premium tiers, subscriptions, or hidden fees.</p>

      <h3>3. TMDB Attribution</h3>
      <p>This product uses the TMDB API but is <strong>not endorsed or certified by TMDB</strong>. All movie and TV show data — including titles, descriptions, posters, ratings, and release dates — is provided by <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">The Movie Database (TMDB)</a> under their API terms of use.</p>
      <ul>
        <li>TMDB data is used solely to display metadata within CuedUp. We do not redistribute or resell TMDB data.</li>
        <li>All intellectual property rights in TMDB data remain with TMDB and their respective rights holders.</li>
        <li>By using CuedUp you also agree to comply with <a href="https://www.themoviedb.org/terms-of-use" target="_blank" rel="noopener noreferrer">TMDB's Terms of Use</a> and <a href="https://www.themoviedb.org/api-terms-of-use" target="_blank" rel="noopener noreferrer">API Terms of Use</a>.</li>
      </ul>

      <h3>4. No Piracy — Strict Content Policy</h3>
      <p>CuedUp is a <strong>metadata-only</strong> application. We:</p>
      <ul>
        <li>Do <strong>not</strong> host, stream, distribute, or link to any pirated, unlicensed, or unauthorised copies of movies or TV shows.</li>
        <li>Do <strong>not</strong> provide any means to download or access copyrighted content without proper authorisation.</li>
        <li>Only display publicly available metadata (titles, posters, synopses, ratings) sourced from TMDB.</li>
      </ul>
      <p>Any attempt to use CuedUp to facilitate copyright infringement is strictly prohibited and may result in immediate account termination.</p>

      <h3>5. User Accounts</h3>
      <ul>
        <li>You are responsible for maintaining the security of your account credentials.</li>
        <li>You must provide accurate information when registering.</li>
        <li>One account per person. Creating accounts to harass others is prohibited.</li>
        <li>You may delete your account at any time; deletion is permanent.</li>
      </ul>

      <h3>6. Acceptable Use</h3>
      <p>You agree not to:</p>
      <ul>
        <li>Attempt to reverse-engineer, scrape, or overload the service or the TMDB API.</li>
        <li>Use CuedUp for any unlawful purpose.</li>
        <li>Attempt to gain unauthorised access to other users' accounts or data.</li>
        <li>Introduce malware or otherwise interfere with the service.</li>
      </ul>

      <h3>7. Intellectual Property</h3>
      <p>Movie posters, artwork, and metadata are the property of their respective studios and rights holders, provided via TMDB. The CuedUp name, logo, and original application code are our own.</p>

      <h3>8. Disclaimer of Warranties</h3>
      <p>CuedUp is provided <strong>"as is"</strong> without warranties of any kind. We do not guarantee uninterrupted availability or the accuracy of TMDB data. TMDB data accuracy is the responsibility of TMDB and its contributors.</p>

      <h3>9. Limitation of Liability</h3>
      <p>To the fullest extent permitted by law, CuedUp and its creators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>

      <h3>10. Modifications</h3>
      <p>We reserve the right to modify or discontinue CuedUp at any time without notice. We may update these Terms — continued use after changes constitutes acceptance.</p>

      <h3>11. Governing Law</h3>
      <p>These Terms are governed by applicable law. Any disputes shall be resolved in the jurisdiction where the service operators are based.</p>
    </LegalModal>
  )
}

/* ── Footer ──────────────────────────────────────────────────────── */
export default function Footer() {
  const [modal, setModal] = useState(null) // 'privacy' | 'terms' | null

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-left">
            <span className="footer-brand">CuedUp &copy; 2026</span>
            <div className="footer-links">
              <Link className="footer-link" href="/genres">Browse by Genre</Link>
              <span className="footer-dot" aria-hidden="true">·</span>
              <button className="footer-link" onClick={() => setModal('privacy')}>Privacy Policy</button>
              <span className="footer-dot" aria-hidden="true">·</span>
              <button className="footer-link" onClick={() => setModal('terms')}>Terms of Service</button>
            </div>
          </div>

          <a
            className="footer-tmdb"
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            title="This product uses the TMDB API but is not endorsed or certified by TMDB"
          >
            <span className="footer-tmdb-label">Data from</span>
            <img
              src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
              alt="TMDB"
              className="footer-tmdb-logo"
            />
          </a>
        </div>
      </footer>

      {modal === 'privacy' && <PrivacyPolicy onClose={() => setModal(null)} />}
      {modal === 'terms'   && <TermsOfService onClose={() => setModal(null)} />}
    </>
  )
}
