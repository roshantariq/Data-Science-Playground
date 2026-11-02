export type WingId = 'machines' | 'feel'

export type Exhibit = {
  slug: string
  wing: WingId
  title: string
  line: string
  open: boolean
}

export const WINGS: Record<WingId, { title: string; intro: string }> = {
  machines: {
    title: 'How Machines Learn',
    intro: 'See what a model learns, and how it learns it.',
  },
  feel: {
    title: 'Data You Can Feel',
    intro: 'Your own clicks, keys and senses become the data.',
  },
}

// In wing order; a wing's exhibits run in the order listed here.
export const EXHIBITS: Exhibit[] = [
  {
    slug: 'overfitting',
    wing: 'machines',
    title: 'Overfitting Playground',
    line: 'Fit a curve. Then fit too well.',
    open: true,
  },
  {
    slug: 'gradient-descent',
    wing: 'machines',
    title: 'Gradient Descent Ski Slope',
    line: 'Roll downhill to the lowest error.',
    open: false,
  },
  {
    slug: 'be-the-algorithm',
    wing: 'machines',
    title: 'Be the Algorithm',
    line: 'Split the data by hand.',
    open: false,
  },
  {
    slug: 'neural-net-peek',
    wing: 'machines',
    title: 'Neural Net Peek',
    line: 'Watch neurons carve up the space.',
    open: false,
  },
  {
    slug: 'typing-dna',
    wing: 'feel',
    title: 'Typing DNA',
    line: 'Your rhythm is your fingerprint.',
    open: true,
  },
  {
    slug: 'sound-of-your-data',
    wing: 'feel',
    title: 'Sound of Your Data',
    line: 'Hear trends and outliers.',
    open: false,
  },
  {
    slug: 'regression-to-the-mean',
    wing: 'feel',
    title: 'Regression to the Mean, Live',
    line: 'Was your best round just luck?',
    open: false,
  },
  {
    slug: 'calibration-check',
    wing: 'feel',
    title: 'Calibration Check',
    line: 'How sure should you be?',
    open: false,
  },
]

export const isWing = (id: string | undefined): id is WingId =>
  id === 'machines' || id === 'feel'

export const wingExhibits = (wing: WingId) =>
  EXHIBITS.filter((e) => e.wing === wing)
