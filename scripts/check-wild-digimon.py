import json, sys
data = json.load(sys.stdin)
docs = data.get("docs", [])
if docs:
    d = docs[0]
    for w in d.get("wildDigimon", [])[:5]:
        print(json.dumps(w, indent=2))
