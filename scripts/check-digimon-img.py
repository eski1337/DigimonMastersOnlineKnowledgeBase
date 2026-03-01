import json, sys
data = json.load(sys.stdin)
for d in data.get("docs", [])[:3]:
    name = d["name"]
    img = d.get("mainImage")
    if isinstance(img, dict):
        print(f"{name} -> {img.get('url','NO_URL')}")
    else:
        print(f"{name} -> REF:{img}")
