"""Spanish SRT captions from GUION.md, timed by the narration's word timestamps.

Usage: python3 tools/captions.py <out.srt>
Text (with punctuation) comes from GUION.md; times from tools/voice_sections.json.
Cues: at most 2 lines of 42 characters, broken at punctuation when possible.
"""
import json, re, sys
MAXC, MAXDUR = 42, 6.0
guion = open('GUION.md').read().split('---', 1)[1]
texts = [s.split('\n', 1)[1].strip() for s in re.split(r'\n## ', guion)[1:]]
vs = json.load(open('tools/voice_sections.json'))
words = []
for txt, sec in zip(texts, vs['sections']):
    toks = txt.split()
    assert len(toks) == len(sec['words']), (len(toks), len(sec['words']), txt[:40])
    for i, (tok, (_, t)) in enumerate(zip(toks, sec['words'])):
        nxt = sec['words'][i + 1][1] if i + 1 < len(sec['words']) else sec['end']
        words.append({'t': tok, 's': t, 'e': min(nxt, t + 1.2), 'last': i + 1 == len(toks)})
# numbers read aloud are shown as figures on screen
PHRASES = [('ochenta y uno por ciento', '81 %'), ('ochenta y dos por ciento', '82 %'), ('cincuenta por ciento', '50 %')]
merged, i = [], 0
while i < len(words):
    for ph, fig in PHRASES:
        n = len(ph.split())
        span = words[i:i + n]
        if ' '.join(x['t'] for x in span).rstrip('.,:;').lower() == ph:
            tail = span[-1]['t'][len(ph.split()[-1]):]
            merged.append({'t': fig + tail, 's': span[0]['s'], 'e': span[-1]['e'], 'last': span[-1]['last']}); i += n; break
    else:
        merged.append(words[i]); i += 1
words = merged
cues, cur = [], []
def flush():
    if cur: cues.append(list(cur)); cur.clear()
for w in words:
    text = ' '.join(x['t'] for x in cur + [w])
    if cur and (len(text) > 2 * MAXC or w['e'] - cur[0]['s'] > MAXDUR):
        flush()
    cur.append(w)
    sentence_end = w['t'][-1] in '.:;?!'
    long_enough = len(' '.join(x['t'] for x in cur)) > MAXC * 0.9
    if w['last'] or (sentence_end and long_enough) or (w['t'][-1] == ',' and len(' '.join(x['t'] for x in cur)) > MAXC * 1.4):
        flush()
flush()
def two_lines(ws):
    s = ' '.join(x['t'] for x in ws)
    if len(s) <= MAXC: return s
    best = min(range(1, len(ws)), key=lambda i: abs(len(' '.join(x['t'] for x in ws[:i])) - len(s) / 2))
    return ' '.join(x['t'] for x in ws[:best]) + '\n' + ' '.join(x['t'] for x in ws[best:])
ts = lambda t: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round(t % 1 * 1000)) % 1000:03d}"
out = []
for i, c in enumerate(cues):
    end = c[-1]['e'] + 0.25
    if i + 1 < len(cues): end = min(end, cues[i + 1][0]['s'] - 0.05)
    out.append(f"{i + 1}\n{ts(c[0]['s'])} --> {ts(end)}\n{two_lines(c)}\n")
open(sys.argv[1], 'w', encoding='utf-8').write('\n'.join(out))
print(len(cues), 'cues')
