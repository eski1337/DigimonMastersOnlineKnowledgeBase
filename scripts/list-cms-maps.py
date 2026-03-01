import json, sys
data = json.load(sys.stdin)
for d in data["docs"]:
    slug = d.get("slug","")
    world = d.get("world","")
    area = d.get("area","")
    name = d.get("name","")
    imgs = d.get("images") or []
    img_count = len(imgs) if isinstance(imgs, list) else 0
    print(f"{slug}|{world}|{area}|{name}|imgs={img_count}")
