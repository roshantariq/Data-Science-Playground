# Sound of Your Data: sample datasets

`build-samples.mjs` turns three public datasets into
`src/exhibits/sound-of-your-data/samples.json`, keeping only their number
columns. Built on Nov 22, 2026.

| Dataset                                          | File                                                                                          | Source                                                                          | Terms                                                                                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Titanic passengers (fare, age)                   | `titanic3.csv`                                                                                | https://hbiostat.org/data/repo/titanic3.csv                                     | Use is allowed with the note "Data obtained from http://hbiostat.org/data courtesy of the Vanderbilt University Department of Biostatistics." |
| Iris flowers (4 measurements)                    | `iris/bezdekIris.data` from https://archive.ics.uci.edu/static/public/53/iris.zip             | Fisher (1936), UCI Machine Learning Repository, https://doi.org/10.24432/C56C76 | CC BY 4.0, credit required                                                                                                                    |
| New York temperatures, 2025 (daily high and low) | `nyc.csv.gz` from https://www.ncei.noaa.gov/pub/data/ghcn/daily/by_station/USW00094728.csv.gz | NOAA GHCN-Daily, New York Central Park                                          | Public domain                                                                                                                                 |

To rebuild, download the three files into one folder (unzip the Iris file
into `iris/` there), then run:

```
node research/sound-of-your-data/build-samples.mjs <that folder>
```

The credits are shown under the chart in the exhibit and on the About page.

# Sound of Your Data: recorded instruments

`build-recordings.mjs` cuts single-note recordings into the short MP3s in
`src/exhibits/sound-of-your-data/recordings/`, one folder per instrument,
each file named by its MIDI note number, plus `tuning.json` (how many cents
each recording is off; the exhibit corrects for it). It finds where each
note starts, keeps 2.6 s of held notes (flute, clarinet, saxophone,
trumpet, cellos, organ) or up to 2.2 s of struck ones, fades the ends,
evens out the loudness, measures the pitch, and encodes at 80 kbps mono.
Held notes also have their loudness evened out after the first 0.3 s, so a
loop of their middle doesn't pulse. Some collections name notes an octave
off, so the measured pitch sets the octave. Built on Nov 22, 2026.

| Instrument     | Notes kept                                                                                                                                    | Source                                                                                     | Terms                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Flute          | `Woodwinds/Flute/susvib/LDFlute_susvib_{C3,E3,A3,C4,E4,A4,C5,E5,A5,C6}_v1_1.wav` (named an octave low)                                        | [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE)                          | CC0                                                                 |
| Clarinet       | `Woodwinds/Clarinet/susLong/DCClar_susLong_{D2,A#2,F3,A#3,D4,A#4,D5}_v3_rr1_sum.wav` (named an octave low; F#5 left out, it measures as F5)   | VSCO 2 CE                                                                                  | CC0                                                                 |
| Trumpet        | `Brass/Trumpet/susvib/Sum_SHTrumpet_susvib_{F2,A2,D#3,G3,D4,F4,A4,C5}_v2_rr1.wav` (named an octave low)                                       | VSCO 2 CE                                                                                  | CC0                                                                 |
| Cellos         | `Strings/Cello Section/susvib/susvib_{C1,G1,D2,A2,E3,B3,F4}_v3_1.wav` (named an octave low)                                                   | VSCO 2 CE                                                                                  | CC0                                                                 |
| Organ          | `Keys/Organ/Loud/Rode_Man3Open_{01,10,19,28,37,46,55,61}.wav` (key n is MIDI 35 + n)                                                          | VSCO 2 CE                                                                                  | CC0                                                                 |
| Piano          | `Keys/Upright Piano/Player_dyn2_rr1_{008,012,...,036}.wav` (file n is MIDI 21 + 2n, per its MappingChart.txt)                                 | VSCO 2 CE, recorded by Simon Dalzell of Ivy Audio                                          | CC0; credit to both encouraged                                      |
| Marimba        | `Percussion/Marimba/Marimba_hit_Outrigger_{C2,G2,B2,F3,C4,G4,B4,F5,C6}_loud_01.wav` (named an octave low: measured C2 is MIDI 48)             | VSCO 2 CE                                                                                  | CC0                                                                 |
| Harp           | `Strings/Harp/KSHarp_{D2,A2,E3,B3,F4,C5,G5,D6,A6}_mf.wav`                                                                                     | VSCO 2 CE                                                                                  | CC0                                                                 |
| Alto saxophone | `MIS Pitches - 2014/Woodwinds/Eb Alto Saxophone/AltoSax.vib.ff.{D3,G3,C4,F4,Bb4,Eb5,Ab5}.stereo.aif`                                          | [University of Iowa Musical Instrument Samples](https://theremin.music.uiowa.edu/MIS.html) | "may be downloaded and used for any projects, without restrictions" |
| Guitar         | `MIS/Piano_Other/guitar/Guitar.mf.{sulE.E2B2,sulA.A2B2,sulD.D3B3,sulG.G3B3,sulB.C4B4,sul_E.E4B4,sul_E.C5B5}.mono.aif`, first note of each run | University of Iowa                                                                         | as above                                                            |

To rebuild, download those files into `<folder>/<instrument>/`, named by
note (`C4.wav`, `Bb4.aif`, `A#2.wav`; organ and piano by their number: `10.wav`,
`008.wav`; guitar by the run's first note: `E2.aif`), then run:

```
node research/sound-of-your-data/build-recordings.mjs <folder> src/exhibits/sound-of-your-data/recordings
```
