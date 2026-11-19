# Correlations, reliability and skill links for the candidate stats. Usage: python -P report.py full.csv
import sys
import numpy as np, pandas as pd

d = pd.read_csv(sys.argv[1], low_memory=False)
# Name -> (column, sign) so that higher is always better / more of the trait.
S = {
    'Speed': ('speed', 1), 'Corrections': ('corrections', -1), 'Uncorrected': ('uncorrected', -1),
    'Rollover': ('rollover', 1), 'Touch': ('touch_cv', -1), 'Steady raw': ('steady_raw', -1),
    'Steadiness': ('steady', -1), 'Flow': ('flow', -1), 'Flow 1s': ('flow_1s', -1),
    'Word starts': ('wordstart', -1), 'Reach': ('reach', -1), 'Recovery': ('recovery', -1),
    'Detect': ('detect', -1),
}
v = pd.DataFrame({n: s * d[c] for n, (c, s) in S.items()})
pd.set_option('display.width', 250, 'display.max_columns', 30, 'display.precision', 2)
print('typists:', len(d), '\nmissing %:\n', (v.isna().mean() * 100).round(1).to_string())
print('\nSpearman correlations (higher = better for every stat):')
print(v.corr('spearman'))

print('\nReliability: odd vs even sentences, projected with Spearman-Brown')
for n, (c, _) in S.items():
    r = d[[c + '_A', c + '_B']].corr('spearman').iloc[0, 1]
    proj = lambda k: k * r / (1 + (k - 1) * r)
    print(f'{n:12s} half={r:.2f}  5 sentences={proj(5 / 7.5):.2f}  15 sentences={proj(2):.2f}')

rk = v.rank()
course = d.HAS_TAKEN_TYPING_COURSE.astype(float)
fingers = d.FINGERS.map({'1-2': 1, '3-4': 2, '5-6': 3, '7-8': 4, '9-10': 5})
laptop = (d.KEYBOARD_TYPE == 'laptop').astype(float)


def partial(x, y, z):
    """Rank correlation of x and y after removing z (speed) from both."""
    m = x.notna() & y.notna() & z.notna()
    x, y, z = x[m].rank(), y[m].rank(), z[m].rank()
    rx = x - np.polyval(np.polyfit(z, x, 1), z)
    ry = y - np.polyval(np.polyfit(z, y, 1), z)
    return np.corrcoef(rx, ry)[0, 1]


print('\nLinks to skill signals and keyboard (raw / after removing speed):')
print(f'{"":12s} {"course":>13s} {"fingers":>13s} {"laptop":>13s}')
for n in S:
    cells = []
    for sig in (course, fingers, laptop):
        raw = pd.concat([v[n], sig], axis=1).corr('spearman').iloc[0, 1]
        cells.append(f'{raw:+.2f}/{partial(v[n], sig, v["Speed"]) if n != "Speed" else raw:+.2f}')
    print(f'{n:12s} ' + ' '.join(f'{c:>13s}' for c in cells))
