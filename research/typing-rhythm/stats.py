# Candidate Typing Rhythm stats on a sample of the Aalto 136M dataset.
# Usage: python -P stats.py <zip> <metadata.txt> <n> <out.csv>
import sys, zipfile, random, math
from multiprocessing import Pool
import numpy as np, pandas as pd

ZIP, META, N, OUT = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
LEFT = set('qwertasdfgzxcvb')
RIGHT = set('yuiophjklnm')


def parse(pid):
    """Per sentence: input text and the char keys (press, release, key) in press order."""
    with zipfile.ZipFile(ZIP) as z:
        raw = z.read(f'Keystrokes/files/{pid}_keystrokes.txt').decode('utf-8', 'replace')
    sents = {}
    for line in raw.split('\n')[1:]:
        f = line.rstrip('\r').split('\t')
        if len(f) != 9:
            continue
        try:
            p, r = int(f[5]), int(f[6])
        except ValueError:
            continue
        k = f[7]
        s = sents.setdefault(f[1], (f[2], f[3], [], []))
        s[3].append(p)  # every key, Shift included, for the speed clock
        if k == 'BKSP' or len(k) == 1:
            s[2].append((p, r, k if k == 'BKSP' else k.lower()))
    out = []
    for target, text, keys, allp in sents.values():
        keys.sort(key=lambda x: x[0])
        if len(keys) >= 5:
            out.append((text, keys, target, max(allp) - min(allp)))
    return pid, out


def lev(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def intervals(sents):
    """Forward-typing intervals: (bigram, ms, kind). Skips anything touching a backspace."""
    out = []
    for _, keys, *_ in sents:
        for a, b in zip(keys, keys[1:]):
            if a[2] == 'BKSP' or b[2] == 'BKSP':
                continue
            out.append(((a[2], b[2]), b[0] - a[0]))
    return out


def stats(sents, norms, hard, easy):
    """All candidate stats for one set of sentences. Lower is better unless noted."""
    if len(sents) < 3:
        return None
    wpm, chars, bk, unc, roll, nroll, holds = [], 0, 0, 0, 0, 0, []
    for text, keys, target, dur in sents:
        if dur > 0:
            wpm.append(len(text) / 5 / (dur / 60000))
        chars += len(text)
        unc += lev(target, text) / max(len(target), len(text), 1)
        bk += sum(k[2] == 'BKSP' for k in keys)
        for a, b in zip(keys, keys[1:]):
            nroll += 1
            roll += b[0] < a[1]
        holds += [k[1] - k[0] for k in keys if k[2] != 'BKSP' and 0 < k[1] - k[0] < 1000]
    iv = intervals(sents)
    ms = np.array([t for _, t in iv if t > 0], float)
    if len(ms) < 50 or not wpm:
        return None
    med = np.median(ms)
    pause = 3 * med
    # Letter-corrected residuals (log ms minus the population norm for that pair).
    res, ws, ww, hr, er = [], [], [], [], []
    for (a, b), t in iv:
        if t <= 0 or t > pause:
            continue
        lt = math.log(t)
        n = norms.get((a, b))
        if n is not None:
            r = lt - n
            res.append(r)
            if a == ' ' and b.isalpha():
                ws.append(r)
            elif a.isalpha() and b.isalpha():
                ww.append(r)
            if (a, b) in hard:
                hr.append(r)
            elif (a, b) in easy:
                er.append(r)
    # Recovery: each run of backspaces, time from the key before it to the next
    # forward key, in units of the typist's normal interval per key involved.
    rec, runlen = [], []
    for _, keys, *_ in sents:
        i = 1
        while i < len(keys):
            if keys[i][2] == 'BKSP':
                j = i
                while j < len(keys) and keys[j][2] == 'BKSP':
                    j += 1
                if j < len(keys):
                    n = j - i
                    rec.append((keys[j][0] - keys[i - 1][0]) / med / (n + 1))
                    runlen.append(n)
                i = j
            else:
                i += 1
    return dict(
        speed=np.mean(wpm),  # higher better
        corrections=bk / chars,
        uncorrected=unc / len(sents),
        rollover=roll / nroll,  # higher = more overlap
        touch_cv=np.std(holds) / np.mean(holds) if len(holds) > 20 else np.nan,
        hold_ms=np.mean(holds) if holds else np.nan,
        steady_raw=np.std(np.log(ms[ms <= pause])),
        steady=np.std(res) if len(res) > 30 else np.nan,
        flow=np.mean(ms > pause),
        flow_1s=np.mean(ms > 1000),
        wordstart=(np.mean(ws) - np.mean(ww)) if len(ws) > 5 and len(ww) > 20 else np.nan,
        # How much more you lose than average on hard letter pairs than on easy ones.
        reach=(np.mean(hr) - np.mean(er)) if len(hr) > 10 and len(er) > 10 else np.nan,
        recovery=np.median(rec) if len(rec) >= 3 else np.nan,
        detect=np.mean(runlen) if len(runlen) >= 3 else np.nan,
    )


if __name__ == '__main__':
    meta = pd.read_csv(META, sep='\t', on_bad_lines='skip', low_memory=False)
    with zipfile.ZipFile(ZIP) as z:
        have = {n.split('/')[-1].split('_')[0] for n in z.namelist() if n.endswith('_keystrokes.txt')}
    meta['PARTICIPANT_ID'] = meta['PARTICIPANT_ID'].astype(str)
    m = meta[(meta.LAYOUT == 'qwerty') & meta.KEYBOARD_TYPE.isin(['full', 'laptop'])
             & meta.PARTICIPANT_ID.isin(have)]
    m = m[pd.to_numeric(m.ERROR_RATE, errors='coerce') <= 25]
    ids = random.Random(1).sample(list(m.PARTICIPANT_ID), N)
    with Pool(8) as pool:
        data = dict(pool.map(parse, ids, chunksize=50))
    # Population norm per letter pair: mean log interval, from pairs seen 50+ times.
    acc = {}
    for sents in data.values():
        for bg, t in intervals(sents):
            if 0 < t < 2000:
                acc.setdefault(bg, []).append(math.log(t))
    norms = {k: float(np.mean(v)) for k, v in acc.items() if len(v) >= 50}
    # Hard and easy letter pairs: slowest and fastest third of the letter-to-letter pairs.
    ll = sorted((v, k) for k, v in norms.items() if k[0].isalpha() and k[1].isalpha())
    third = len(ll) // 3
    easy, hard = {k for _, k in ll[:third]}, {k for _, k in ll[-third:]}
    rows = []
    for pid, sents in data.items():
        full, odd, even = (stats(s, norms, hard, easy) for s in (sents, sents[0::2], sents[1::2]))
        if full and odd and even:
            rows.append({'pid': pid, **full, **{k + '_A': v for k, v in odd.items()},
                         **{k + '_B': v for k, v in even.items()}})
    df = pd.DataFrame(rows).merge(meta, left_on='pid', right_on='PARTICIPANT_ID')
    df.to_csv(OUT, index=False)
    print('typists:', len(df), ' letter-pair norms:', len(norms))
