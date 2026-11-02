import { useParams } from 'react-router'
import { WingSection } from '../components/WingSection.tsx'
import { isWing } from '../exhibits.ts'
import { NotFound } from './NotFound.tsx'

export function Wing() {
  const { wing } = useParams()
  if (!isWing(wing)) return <NotFound />
  return <WingSection wing={wing} heading="h1" />
}
