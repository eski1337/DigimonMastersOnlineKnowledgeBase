import json, sys
data = json.load(sys.stdin)
for d in data["docs"]:
    slug = d.get("slug","")
    wd = d.get("wildDigimon") or []
    npcs = d.get("npcs") or []
    if len(wd) > 0 or len(npcs) > 0:
        print(f"{slug}|wild={len(wd)}|npcs={len(npcs)}")
