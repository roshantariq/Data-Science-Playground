# Reference tables for the Typing Rhythm exhibit: percentiles of the six stats for
# rounds of 5, 10 and 15 sentences, and the letter-pair norms Steadiness needs.
# The stats follow the browser's definitions: only letters, space and Backspace
# count, and any other key (Shift, punctuation) breaks the stream, so no gap spans it.
# Usage: python -P tables.py <zip> <metadata.txt> <n> <out.json>
import sys, zipfile, random, math, json
from multiprocessing import Pool
import numpy as np, pandas as pd

KEEP = set('abcdefghijklmnopqrstuvwxyz ')
LENGTHS = (5, 10, 15)
z = norms = None


def init(path, n=None):
    global z, norms
    z, norms = zipfile.ZipFile(path), n


def parse(pid):
    """Per sentence: (letters and spaces in the final text, keys in press order,
    uncorrected errors). A key is (press, release, char or 'BKSP'), or None for any other key."""
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
        # Some browsers left LETTER blank (or wrote Backspace as \x08); the key code still names the key.
        c = int(f[8]) if f[8].strip().isdigit() else 0
        k = 'BKSP' if f[7] == 'BKSP' or c == 8 else f[7].lower()
        if not k:
            k = ' ' if c == 32 else chr(c + 32) if 65 <= c <= 90 else ''
        s = sents.setdefault(f[1], (clean(f[3]), [], clean(f[2])))
        s[1].append((p, r, k) if k == 'BKSP' or k in KEEP else (p, None, None))
    out = []
    for typed, keys, target in sents.values():
        keys.sort(key=lambda x: x[0])
        keys = [None if k[2] is None else k for k in keys]
        if sum(k is not None for k in keys) >= 5:
            out.append((len(typed), keys, lev(target, typed)))
    return out


def clean(text):
    """Lowercase letters and spaces only, as in the exhibit's sentences."""
    return ''.join(c for c in text.lower() if c in KEEP)


def lev(a, b):
    """Edit distance: the fewest letters added, removed or changed to turn a into b."""
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def pairs(keys):
    """Neighbouring keys with no other key between them."""
    return [(a, b) for a, b in zip(keys, keys[1:]) if a and b]


def stats(sents):
    """The six stats for one round, or None if it is too short to measure."""
    chars = minutes = bk = roll = nroll = 0
    holds, iv = [], []
    for c, keys, unc in sents:
        pr = pairs(keys)
        gaps = [b[0] - a[0] for a, b in pr]
        if not gaps:
            return None
        # Time as if every gap were typed: the mean gap times the gaps between kept keys.
        minutes += np.mean(gaps) * (sum(k is not None for k in keys) - 1) / 60000
        chars += c
        bk += sum(k is not None and k[2] == 'BKSP' for k in keys) + unc
        nroll += len(pr)
        roll += sum(b[0] < a[1] for a, b in pr)
        holds += [k[1] - k[0] for k in keys if k and k[2] != 'BKSP' and 0 < k[1] - k[0] < 1000]
        iv += [(a[2] + b[2], b[0] - a[0]) for a, b in pr if 'BKSP' not in (a[2], b[2])]
    ms = np.array([t for _, t in iv if t > 0], float)
    if len(ms) < 50 or minutes <= 0 or chars == 0 or len(holds) <= 20:
        return None
    pause = 3 * np.median(ms)
    res, ws, ww = [], [], []
    for bg, t in iv:
        if 0 < t <= pause and bg in norms:
            r = math.log(t) - norms[bg]
            res.append(r)
            if bg[0] == ' ' and bg[1] != ' ':
                ws.append(r)
            elif ' ' not in bg:
                ww.append(r)
    if len(res) <= 30 or len(ws) <= 5 or len(ww) <= 20:
        return None
    return dict(
        speed=chars / 5 / minutes,  # wpm
        accuracy=bk / chars,  # mistakes (fixed with Backspace or left in) per character
        steadiness=float(np.std(res)),
        touch=float(np.std(holds) / np.mean(holds)),
        rollover=roll / nroll,
        wordstarts=float(np.mean(ws) - np.mean(ww)),
    )


def logsums(pid):
    acc = {}
    for _, keys, _ in parse(pid):
        for a, b in pairs(keys):
            t = b[0] - a[0]
            if 'BKSP' not in (a[2], b[2]) and 0 < t < 2000:
                s = acc.setdefault(a[2] + b[2], [0.0, 0])
                s[0] += math.log(t)
                s[1] += 1
    return acc


def rounds(pid):
    sents, rng = parse(pid), random.Random(pid)
    return pid, {n: stats(rng.sample(sents, n)) for n in LENGTHS if len(sents) >= n}


if __name__ == '__main__':
    ZIP, META, N, OUT = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    meta = pd.read_csv(META, sep='\t', on_bad_lines='skip', low_memory=False)
    meta['PARTICIPANT_ID'] = meta['PARTICIPANT_ID'].astype(str)
    with zipfile.ZipFile(ZIP) as zf:
        have = {n.split('/')[-1].split('_')[0] for n in zf.namelist() if n.endswith('_keystrokes.txt')}
    m = meta[(meta.LAYOUT == 'qwerty') & meta.KEYBOARD_TYPE.isin(['full', 'laptop'])
             & meta.PARTICIPANT_ID.isin(have)]
    m = m[pd.to_numeric(m.ERROR_RATE, errors='coerce') <= 25]
    ids = random.Random(1).sample(sorted(m.PARTICIPANT_ID), N)

    # Pass 1: each letter pair's mean log gap, from pairs seen 50+ times.
    tot = {}
    with Pool(16, init, (ZIP,)) as pool:
        for acc in pool.imap_unordered(logsums, ids, chunksize=50):
            for k, (s, c) in acc.items():
                t = tot.setdefault(k, [0.0, 0])
                t[0] += s
                t[1] += c
    nm = {k: s / c for k, (s, c) in tot.items() if c >= 50}

    # Pass 2: one random round of each length per typist.
    with Pool(16, init, (ZIP, nm)) as pool:
        res = dict(pool.imap_unordered(rounds, ids, chunksize=50))
    out = {'typists': {}, 'percentiles': {},
           'norms': {k: round(v, 3) for k, v in sorted(nm.items())}}
    for n in LENGTHS:
        df = pd.DataFrame([r[n] for r in res.values() if r.get(n)])
        out['typists'][n] = len(df)
        out['percentiles'][n] = {c: [float(f'{q:.4g}') for q in np.percentile(df[c], range(101))]
                                 for c in df}
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))

    # Check: speed against the dataset's own words per minute, over all 15 sentences.
    sp = pd.Series({p: r[15]['speed'] for p, r in res.items() if r.get(15)})
    wpm = pd.to_numeric(m.set_index('PARTICIPANT_ID').AVG_WPM_15, errors='coerce').reindex(sp.index)
    print('typists per length:', out['typists'], ' letter-pair norms:', len(nm))
    print(f'speed vs dataset wpm: r = {sp.corr(wpm):.3f}, mean difference = {(sp - wpm).mean():+.1f} wpm')
