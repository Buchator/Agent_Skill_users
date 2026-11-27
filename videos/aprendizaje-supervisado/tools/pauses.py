"""Rebuild the narration with one even pause between script sections.

Usage: python3 tools/pauses.py <tts.json> <raw.wav> <out.wav>
Cuts the single HeyGen take at its [pause] markers, keeps each section's speech
(with a short pre-roll and decay tail), and joins them with a fixed word-to-word
gap, so every change of idea gets the same short, natural pause.
Writes tools/voice_sections.json with the new word times.
"""
import json, subprocess, sys
GAP = 0.75          # seconds from the last word of a section to the first word of the next
PRE, POST = 0.06, 0.14
tts, raw, out = sys.argv[1:4]
d = json.load(open(tts))
w = d['original_words']
secs, cur = [], []
for x in w:
    if x['text'].strip('[]').lower() == 'pause':
        secs.append(cur); cur = []
    else:
        cur.append(x)
secs.append(cur)
assert len(secs) == 10, len(secs)
filters, labels, sections, t = [], [], [], 0.0
for k, s in enumerate(secs):
    a = max(0.0, s[0]['start_time'] - PRE)
    b = s[-1]['end_time'] + POST
    seg_len = b - a
    shift = t - a                         # new time = old time + shift
    sections.append({'start': s[0]['start_time'] + shift, 'end': s[-1]['end_time'] + shift,
                     'words': [(x['text'], round(x['start_time'] + shift, 3)) for x in s]})
    filters.append(f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS[s{k}]")
    labels.append(f"[s{k}]")
    t += seg_len
    if k < len(secs) - 1:
        sil = GAP - POST - PRE
        filters.append(f"anullsrc=r=44100:cl=mono,atrim=duration={sil:.3f}[z{k}]")
        labels.append(f"[z{k}]")
        t += sil
fc = ";".join(filters) + ";" + "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[out]"
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-filter_complex', fc, '-map', '[out]', '-ac', '1', '-ar', '44100', out], check=True)
json.dump({'total': round(t, 3), 'sections': sections}, open('tools/voice_sections.json', 'w'), ensure_ascii=False)
print('total', round(t, 2))
for k, s in enumerate(sections):
    print(k, round(s['start'], 2), round(s['end'], 2), ' '.join(x[0] for x in s['words'][:4]))
