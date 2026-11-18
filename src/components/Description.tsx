import { useEffect } from 'react'

/** Sets the page's meta description while mounted (one tag, from index.html). */
export function Description({ text }: { text: string }) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    )
    if (!meta) return
    const previous = meta.content
    meta.content = text
    return () => {
      meta.content = previous
    }
  }, [text])
  return null
}
