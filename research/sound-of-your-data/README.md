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
