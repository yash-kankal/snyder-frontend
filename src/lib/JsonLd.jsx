/**
 * Renders a JSON-LD structured data <script> block.
 * Google parses this to generate rich snippets in search results.
 * Safe: we serialise our own data — no user input involved.
 */
export default function JsonLd({ data }) {
  if (!data) return null
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
