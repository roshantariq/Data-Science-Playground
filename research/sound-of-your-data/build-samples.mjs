// Builds src/exhibits/sound-of-your-data/samples.json from the three real
// datasets, keeping only number columns. Run once by hand:
//   node research/sound-of-your-data/build-samples.mjs <folder with the downloads>
// The folder needs titanic3.csv, iris/bezdekIris.data and nyc.csv.gz (see
// README.md for where each comes from).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import Papa from 'papaparse'

const dir = process.argv[2]
if (!dir) throw new Error('Pass the folder that holds the downloads.')
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d
const numbers = (rows, key, d) =>
  rows
    .map((r) => r[key])
    .filter((v) => v !== '' && v !== null && v !== undefined)
    .map(Number)
    .filter(Number.isFinite)
    .map((v) => round(v, d))

// Titanic: every passenger in the file's order (first class first).
const titanic = Papa.parse(readFileSync(join(dir, 'titanic3.csv'), 'utf8'), {
  header: true,
  skipEmptyLines: true,
}).data

// Iris: 150 flowers, 50 of each species in turn.
const iris = readFileSync(join(dir, 'iris', 'bezdekIris.data'), 'utf8')
  .trim()
  .split('\n')
  .map((line) => line.split(','))
const irisColumn = (i) => iris.map((r) => round(Number(r[i]), 1))

// New York, Central Park: daily highs and lows for the last full year.
const YEAR = '2025'
const days = new Map()
for (const line of gunzipSync(readFileSync(join(dir, 'nyc.csv.gz')))
  .toString('utf8')
  .split('\n')) {
  const [, date, element, value, , quality] = line.split(',')
  if (!date?.startsWith(YEAR) || quality) continue // skip failed checks
  if (element !== 'TMAX' && element !== 'TMIN') continue
  const day = days.get(date) ?? {}
  day[element] = Number(value) / 10 // tenths of a degree Celsius
  days.set(date, day)
}
const ordered = [...days.keys()].sort().map((d) => days.get(d))

const samples = [
  {
    id: 'titanic',
    name: 'Titanic passengers',
    credit:
      'Data obtained from http://hbiostat.org/data courtesy of the Vanderbilt University Department of Biostatistics (titanic3, Thomas Cason and Frank Harrell).',
    columns: [
      { name: 'Fare paid (pounds)', values: numbers(titanic, 'fare', 2) },
      { name: 'Age (years)', values: numbers(titanic, 'age', 1) },
    ],
  },
  {
    id: 'iris',
    name: 'Iris flowers',
    credit:
      'Fisher, R. (1936). Iris [Dataset]. UCI Machine Learning Repository, https://doi.org/10.24432/C56C76 (CC BY 4.0).',
    columns: [
      { name: 'Petal length (cm)', values: irisColumn(2) },
      { name: 'Petal width (cm)', values: irisColumn(3) },
      { name: 'Sepal length (cm)', values: irisColumn(0) },
      { name: 'Sepal width (cm)', values: irisColumn(1) },
    ],
  },
  {
    id: 'nyc',
    name: `New York temperatures, ${YEAR}`,
    credit:
      'NOAA Global Historical Climatology Network Daily, station USW00094728 (New York Central Park). Public domain.',
    columns: [
      {
        name: 'Daily high (°C)',
        values: ordered.map((d) => d.TMAX).filter(Number.isFinite),
      },
      {
        name: 'Daily low (°C)',
        values: ordered.map((d) => d.TMIN).filter(Number.isFinite),
      },
    ],
  },
]

for (const s of samples)
  for (const c of s.columns) console.log(s.id, c.name, c.values.length)
writeFileSync(
  new URL(
    '../../src/exhibits/sound-of-your-data/samples.json',
    import.meta.url,
  ),
  JSON.stringify(samples),
)
