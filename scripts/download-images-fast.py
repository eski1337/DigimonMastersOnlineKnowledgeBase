"""
Fast image downloader for new Digimon.
Uses short timeouts and multiple URL patterns via Wayback Machine.
"""
import re
import requests
import time
from urllib.parse import quote

CMS_URL = "http://localhost:3001"

def login():
    r = requests.post(f"{CMS_URL}/api/users/login", json={
        "email": "lukas.bohn@icloud.com",
        "password": "ilovecf123"
    })
    return r.cookies if r.status_code == 200 else None

def get_all_digimon():
    all_docs = []
    page = 1
    while True:
        r = requests.get(f"{CMS_URL}/api/digimon", params={"limit": 100, "page": page, "depth": 1})
        data = r.json()
        all_docs.extend(data["docs"])
        if not data.get("hasNextPage"):
            break
        page += 1
    return all_docs

def try_download(url, timeout=8):
    """Try downloading an image with short timeout."""
    try:
        r = requests.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0"}, allow_redirects=True)
        if r.status_code == 200:
            ct = r.headers.get("Content-Type", "")
            if "image" in ct or ct == "application/octet-stream":
                if len(r.content) > 500:  # Not an error page
                    return r.content, ct
    except:
        pass
    return None, None

def download_image(name, img_type):
    """Try multiple URL patterns to get a Digimon image."""
    wiki_name = name.replace(" ", "_")
    
    # Different URL patterns the wiki uses
    if img_type == "icon":
        patterns = [
            f"https://dmowiki.com/images/{quote(wiki_name)}_Icon.png",
            f"https://dmowiki.com/images/{quote(wiki_name)}_icon.png",
        ]
    else:  # main image
        patterns = [
            f"https://dmowiki.com/images/{quote(wiki_name)}.png",
            f"https://dmowiki.com/images/{quote(wiki_name)}.jpg",
        ]
    
    # Try via Wayback Machine (faster than direct due to no CF)
    for pattern in patterns:
        for year in ["2024", "2023"]:
            wb_url = f"https://web.archive.org/web/{year}im_/{pattern}"
            content, ct = try_download(wb_url, timeout=8)
            if content:
                return content, ct
    
    # Try direct (will likely fail due to CF but worth a shot)
    for pattern in patterns:
        content, ct = try_download(pattern, timeout=5)
        if content:
            return content, ct
    
    return None, None

def upload_to_cms(filename, content, content_type, image_type, cookies):
    """Upload image to CMS media collection."""
    files = {"file": (filename, content, content_type or "image/png")}
    data = {"imageType": image_type}
    r = requests.post(f"{CMS_URL}/api/media", files=files, data=data, cookies=cookies)
    if r.status_code in [200, 201]:
        return r.json().get("doc", {}).get("id")
    return None

def main():
    cookies = login()
    if not cookies:
        print("Login failed!")
        return
    
    all_digimon = get_all_digimon()
    print(f"Total Digimon: {len(all_digimon)}")
    
    # Find Digimon without images
    needs_images = []
    for d in all_digimon:
        has_icon = d.get("icon") is not None
        has_main = d.get("mainImage") is not None
        if not has_icon or not has_main:
            needs_images.append({
                "id": d["id"],
                "name": d["name"],
                "need_icon": not has_icon,
                "need_main": not has_main,
            })
    
    print(f"Need images: {len(needs_images)}")
    
    icons_ok = 0
    mains_ok = 0
    failed = 0
    
    for i, d in enumerate(needs_images):
        name = d["name"]
        updates = {}
        
        print(f"[{i+1}/{len(needs_images)}] {name}...", end=" ", flush=True)
        
        if d["need_icon"]:
            content, ct = download_image(name, "icon")
            if content:
                img_id = upload_to_cms(f"{name}_Icon.png", content, ct, "digimon-icon", cookies)
                if img_id:
                    updates["icon"] = img_id
                    icons_ok += 1
        
        if d["need_main"]:
            content, ct = download_image(name, "main")
            if content:
                img_id = upload_to_cms(f"{name}.png", content, ct, "digimon-main", cookies)
                if img_id:
                    updates["mainImage"] = img_id
                    mains_ok += 1
        
        if updates:
            r = requests.patch(f"{CMS_URL}/api/digimon/{d['id']}", json=updates, cookies=cookies)
            fields = list(updates.keys())
            print(f"✓ {fields}")
        else:
            print("✗ no images found")
            failed += 1
        
        time.sleep(0.1)
    
    print(f"\n=== DONE ===")
    print(f"Icons downloaded: {icons_ok}")
    print(f"Main images downloaded: {mains_ok}")
    print(f"Failed (no images): {failed}")

if __name__ == "__main__":
    main()
