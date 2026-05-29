import JsonLd from './JsonLd'
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_IMAGE } from './seo'

/**
 * Site-wide structured data — rendered once in the root layout.
 *
 * - Organization: powers brand knowledge-panel + logo in search results.
 * - WebSite + SearchAction: enables the Google "sitelinks search box".
 */
export default function SiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: DEFAULT_IMAGE,
        },
        description: DEFAULT_DESCRIPTION,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/browse?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }

  return <JsonLd data={data} />
}
