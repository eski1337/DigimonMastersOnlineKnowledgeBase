import json, sys
data = json.load(sys.stdin)
for d in sorted(data.get('docs', []), key=lambda x: (x.get('world',''), x.get('area',''), x.get('sortOrder',0))):
    wc = len(d.get('wildDigimon') or [])
    print(f"{d['slug']}|{d.get('area','')}|{wc}")
