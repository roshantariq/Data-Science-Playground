import { useParams } from 'react-router'
import { WingSection } from '../components/WingSection.tsx'
import { isWing, WINGS } from '../exhibits.ts'
import { NotFound } from './NotFound.tsx'

export function Wing() {
  const { wing } = useParams()
  if (!isWing(wing)) return <NotFound />
  return (
    <>
      <title>{`${WINGS[wing].title} – Data Science Playground`}</title>
      <WingSection wing={wing} heading="h1" />
    </>
  )
}
