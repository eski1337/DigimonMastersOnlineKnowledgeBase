import json, sys
data = json.load(sys.stdin)
d = data["docs"][0]
print("wildDigimon:", len(d.get("wildDigimon") or []))
print("npcs:", len(d.get("npcs") or []))
print("portals:", len(d.get("portals") or []))
print("description:", (d.get("description") or "")[:80])
img = d.get("image")
mi = d.get("mapImage")
print("image:", img.get("filename") if isinstance(img, dict) else img)
print("mapImage:", mi.get("filename") if isinstance(mi, dict) else mi)
