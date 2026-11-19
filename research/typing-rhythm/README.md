# Typing Rhythm: choosing the stats

These scripts check which typing stats are worth showing in the Typing Rhythm exhibit. A good stat measures something real, isn't just speed again, and gives a similar result each time someone types.

## Data

The [136M Keystrokes dataset](https://userinterfaces.aalto.fi/136Mkeystrokes/) from Aalto University: key-down and key-up times for about 168,000 people, each typing 15 sentences. It isn't stored here. Download `Keystrokes.zip` (1.5 GB) into `data/`, which git ignores, then extract `Keystrokes/files/metadata_participants.txt` from it into `data/`.

Licence: non-commercial use with attribution. Please cite:

> Vivek Dhakal, Anna Maria Feit, Per Ola Kristensson and Antti Oulasvirta. 2018. Observations on Typing from 136 Million Keystrokes. In Proceedings of the 2018 CHI Conference on Human Factors in Computing Systems (CHI '18). ACM. https://doi.org/10.1145/3173574.3174220

## Run

Needs Python 3.11 with numpy and pandas. From `research/typing-rhythm`:

```sh
python -P stats.py data/Keystrokes.zip data/metadata_participants.txt 10000 data/full.csv
python -P report.py data/full.csv
```

The exhibit's reference tables come from every typist who passes the same filters (162,056):

```sh
python -P tables.py data/Keystrokes.zip data/metadata_participants.txt 162056 ../../src/exhibits/typing-rhythm/tables.json
npx prettier --write ../../src/exhibits/typing-rhythm/tables.json
```

`tables.py` works out the six exhibit stats the way the browser does. Only letters, space and Backspace count, and any other key breaks the stream, so no gap spans it. It takes one random round of 5, 10 and 15 sentences per typist and saves each stat's percentiles. It also saves each letter pair's mean log gap, which Steadiness and Word starts measure against. Speed comes out about 6 wpm above the dataset's own figure, since Shift and punctuation time is left out.

`stats.py` reads the zip directly, samples typists on QWERTY desktop or laptop keyboards, and works out every candidate stat for all 15 sentences, the odd sentences and the even sentences. `report.py` prints how the stats relate to each other and how repeatable each one is (odd against even sentences). It also prints how each stat relates to two skill signals people reported themselves (typing course, number of fingers) and to keyboard type, before and after taking speed out.

## Checks against the paper

On 8,957 typists: speed correlates 0.98 with the dataset's own figure, rollover 0.96, corrections 0.998 and uncorrected errors 0.94. Rollover against speed comes out at r = 0.73, the same value the paper reports.

## Result (November 2026)

| Stat        | With speed | Repeatable over 5 sentences | Outcome         |
| ----------- | ---------- | --------------------------- | --------------- |
| Speed       |            | 0.94                        | Score and chart |
| Accuracy    | 0.38       | 0.55                        | Score and chart |
| Steadiness  | 0.28       | 0.65                        | Score and chart |
| Touch       | 0.10       | 0.82                        | Chart only      |
| Rollover    | 0.73       | 0.97                        | Chart only      |
| Word starts | 0.60       | 0.80                        | Chart only      |
| Flow        | 0.77       | 0.79                        | Dropped: speed  |
| Reach       | −0.17      | 0.36                        | Dropped: noisy  |
| Recovery    | −0.04      | 0.40                        | Dropped: noisy  |

Accuracy is only moderately repeatable over 5 sentences, so a round defaults to 10 sentences, where it rises to about 0.71.
