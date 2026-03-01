"""
Extract structured data from cleaned Digimon text files and update CMS.
Parses all fields: name, localized names, stats, skills with damage tables,
form, rank, attribute, element, attackerType, families, introduction,
digivolutions, rideability, availability, etc.
"""
import os
import re
import json
import sys
import requests
import time

CMS_URL = "http://localhost:3001"
EMAIL = os.environ.get("CMS_ADMIN_EMAIL", "")
PASSWORD = os.environ.get("CMS_ADMIN_PASSWORD", "")

VALID_FORMS = ['Fresh', 'In-Training', 'Rookie', 'Champion', 'Ultimate', 'Mega',
               'Burst Mode', 'Jogress', 'Armor', 'Hybrid', 'Ultra', 'Side Mega']
VALID_RANKS = ['N', 'A', 'A+', 'S', 'S+', 'SS', 'SS+', 'SSS', 'SSS+', 'U', 'U+']
VALID_ATTRIBUTES = ['Vaccine', 'Virus', 'Data', 'Free', 'Unknown', 'None']
VALID_ELEMENTS = ['Fire', 'Water', 'Ice', 'Wind', 'Thunder', 'Light', 'Pitch Black',
                  'Land', 'Wood', 'Steel', 'Neutral']
VALID_ATTACKER_TYPES = ['Quick Attacker', 'Short Attacker', 'Near Attacker', 'Defender']
VALID_FAMILIES = ['Nature Spirits', 'Deep Savers', 'Nightmare Soldiers', 'Wind Guardians',
                  'Metal Empire', 'Virus Busters', "Dragon's Roar", 'Jungle Troopers',
                  'Dark Area', 'Unknown']

FORM_ALIASES = {
    'h-hybrid': 'Hybrid', 'b-hybrid': 'Hybrid', 'a-hybrid': 'Hybrid',
    'z-hybrid': 'Hybrid', 'hybrid': 'Hybrid',
    'burst mode': 'Burst Mode', 'burstmode': 'Burst Mode',
    'jogress': 'Jogress', 'armor': 'Armor', 'ultra': 'Ultra',
    'side mega': 'Side Mega', 'mega': 'Mega', 'ultimate': 'Ultimate',
    'champion': 'Champion', 'rookie': 'Rookie', 'in-training': 'In-Training',
    'fresh': 'Fresh',
}


def name_to_slug(name):
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s\-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


def parse_digimon_section(text):
    """Parse a single Digimon's cleaned text section into structured data."""
    lines = text.strip().split("\n")
    if not lines:
        return None

    d = {
        "name": lines[0].strip(),
        "names": {"japanese": None, "katakana": None, "korean": None, "chinese": None, "thai": None},
        "rank": None,
        "form": None,
        "attribute": None,
        "element": None,
        "attackerType": None,
        "type": None,
        "families": [],
        "stats": {},
        "maxStats": {},
        "skills": [],
        "introduction": None,
        "digivolvesFrom": [],
        "digivolvesTo": [],
        "unlockedAtLevel": None,
        "unlockedWithItem": None,
        "canBeRidden": False,
        "rideableWithItem": None,
        "canBeHatched": False,
        "available": True,
    }

    # Extract localized names
    for line in lines[:10]:
        line = line.strip()
        # Japanese name in parentheses: (カタカナ)
        jp_match = re.search(r'[\(（]([ァ-ヶー\u3000-\u303Fぁ-ゖ\s：・\-\u30A0-\u30FF]+)[）\)]', line)
        if jp_match:
            d["names"]["katakana"] = jp_match.group(1).strip()
        if line.startswith("Korean name:"):
            d["names"]["korean"] = line.replace("Korean name:", "").strip()
        elif line.startswith("Chinese name:"):
            d["names"]["chinese"] = line.replace("Chinese name:", "").strip()
        elif line.startswith("Thai name:"):
            d["names"]["thai"] = line.replace("Thai name:", "").strip()

    # Parse key-value fields from tab-separated lines
    intro_lines = []
    in_attacks = False
    in_damage_table = False
    in_stats = False
    in_intro = False
    in_digivolves = False
    in_overview = False
    current_skill_descs = {}
    damage_rows = []
    attack_header_seen = False

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        raw_line = lines[i]

        # Skip duplicate name line (the one from infobox that repeats all names)
        if i < 15 and d["name"] in line and ("Korean name:" in line or "›" in line) and "\t" not in line:
            i += 1
            continue

        # Key-value fields (tab-separated)
        if "\t" in line and not in_damage_table and not in_stats:
            parts = line.split("\t")
            key = parts[0].strip().rstrip(":").lower()
            val = "\t".join(parts[1:]).strip()

            if key == "rank" or key == "rank:":
                rank_match = re.match(r'^(SSS\+|SSS|SS\+|SS|S\+|S|A\+|A|N|U\+|U)$', val.strip())
                if rank_match:
                    d["rank"] = rank_match.group(1)
            elif key == "form" or key == "form:":
                form_val = val.strip().lower()
                for alias, canonical in FORM_ALIASES.items():
                    if alias in form_val:
                        d["form"] = canonical
                        break
            elif "attribute" in key and "elemental" not in key and "attacker" not in key:
                for attr in VALID_ATTRIBUTES:
                    if attr.lower() in val.lower():
                        d["attribute"] = attr
                        break
            elif "elemental attribute" in key:
                for elem in VALID_ELEMENTS:
                    if elem.lower() in val.lower():
                        d["element"] = elem
                        break
            elif "attacker type" in key:
                for at in VALID_ATTACKER_TYPES:
                    if at.lower() in val.lower():
                        d["attackerType"] = at
                        break
            elif key == "type" or key == "type:":
                d["type"] = val.replace(" Digimon", "").strip()
            elif "families" in key or "family" in key:
                found = set()
                for fam in VALID_FAMILIES:
                    if fam.lower() in val.lower():
                        found.add(fam)
                # Also check for TBD
                d["families"] = sorted(found)
            elif "digivolved from" in key or "digivolves from" in key:
                d["digivolvesFrom"] = [{"name": n.strip()} for n in re.split(r'[,;]', val) if n.strip()]
                if not d["digivolvesFrom"] and val.strip():
                    d["digivolvesFrom"] = [{"name": val.strip()}]
            elif "digivolves to" in key:
                d["digivolvesTo"] = [{"name": n.strip()} for n in re.split(r'[,;]', val) if n.strip()]
                if not d["digivolvesTo"] and val.strip():
                    d["digivolvesTo"] = [{"name": val.strip()}]
            elif "unlocked at level" in key:
                num_match = re.search(r'(\d+)', val)
                if num_match:
                    d["unlockedAtLevel"] = int(num_match.group(1))
            elif "unlocked with item" in key or "required to evolve" in key:
                d["unlockedWithItem"] = val
            elif "rideable with item" in key:
                d["rideableWithItem"] = val
            elif "can be ridden" in key:
                d["canBeRidden"] = "yes" in val.lower()
            elif "can be hatched" in key:
                d["canBeHatched"] = "yes" in val.lower()
            elif "available" in key:
                d["available"] = "yes" in val.lower()

        # Stats section
        if "Digimon Stats" in line or (line.startswith("Health Points") and "\t" in line):
            in_stats = True
            in_intro = False
            if "Health Points" in line:
                # This line itself has stats
                pass
            else:
                i += 1
                continue

        if in_stats and "\t" in line:
            parts = line.split("\t")
            stat_name = parts[0].strip().lower()
            stat_map = {
                "health points": "hp", "digi-soul": "ds", "attack": "at",
                "attack speed": "as", "critical hit": "ct", "hit rate": "ht",
                "defense": "de", "evade": "ev",
            }
            if stat_name in stat_map:
                key = stat_map[stat_name]
                values = []
                for p in parts[1:]:
                    v = p.strip().replace(",", "").replace("%", "")
                    try:
                        values.append(float(v))
                    except ValueError:
                        pass
                if len(values) >= 2:
                    d["maxStats"][key] = values[0]
                    d["stats"][key] = values[1]
                elif len(values) == 1:
                    d["maxStats"][key] = values[0]

        if in_stats and ("Base Value = " in line or line == ""):
            if d["maxStats"]:
                in_stats = False

        # Attacks section
        if line == "Attacks" or line == "Attacks:":
            in_attacks = True
            in_stats = False
            in_intro = False
            i += 1
            continue

        if in_attacks and not in_damage_table:
            # Check if this is a skill line: SkillName\tElement\tcooldown\tDS\tskillpts\tanimation
            if "\t" in line and ("cooldown" in line.lower() or "ds consumed" in line.lower()):
                parts = line.split("\t")
                skill_name = parts[0].strip()
                skill = {
                    "name": skill_name,
                    "description": "",
                    "type": "Attack",
                    "element": None,
                    "cooldown": None,
                    "dsConsumption": None,
                    "skillPointsPerUpgrade": None,
                    "animationTime": None,
                    "damagePerLevel": None,
                }
                for part in parts[1:]:
                    part = part.strip()
                    if "attribute" in part.lower():
                        for elem in VALID_ELEMENTS:
                            if elem.lower() in part.lower():
                                skill["element"] = elem
                                break
                    elif "cooldown" in part.lower():
                        num = re.search(r'([\d.]+)', part)
                        if num:
                            skill["cooldown"] = float(num.group(1))
                    elif "ds consumed" in part.lower():
                        num = re.search(r'(\d+)', part)
                        if num:
                            skill["dsConsumption"] = int(num.group(1))
                    elif "skill points" in part.lower():
                        num = re.search(r'(\d+)', part)
                        if num:
                            skill["skillPointsPerUpgrade"] = int(num.group(1))
                    elif "animation" in part.lower():
                        num = re.search(r'([\d.]+)', part)
                        if num:
                            skill["animationTime"] = float(num.group(1))

                d["skills"].append(skill)
                # Next line might be description
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line and "\t" not in next_line and "cooldown" not in next_line.lower():
                        if not next_line.startswith("Attack") or "Lv." not in next_line:
                            skill["description"] = next_line
                            i += 1

            # Check for damage table header
            elif "Attack" in line and "Lv.1" in line:
                in_damage_table = True
                i += 1
                continue

        # Damage table rows
        if in_damage_table:
            if "\t" in line:
                parts = line.split("\t")
                skill_name = parts[0].strip()
                if skill_name and any(c.isalpha() for c in skill_name):
                    damage_values = []
                    for p in parts[1:]:
                        try:
                            damage_values.append(int(p.strip().replace(",", "")))
                        except ValueError:
                            pass
                    if damage_values:
                        # Match to existing skill
                        for sk in d["skills"]:
                            if sk["name"].lower() == skill_name.lower():
                                sk["damagePerLevel"] = ",".join(str(v) for v in damage_values)
                                break
            elif line == "" or "Special Buff" in line or "Rank Passives" in line or line == "Overview":
                in_damage_table = False
                in_attacks = False
            else:
                i += 1
                continue

        # Introduction detection - paragraphs between infobox fields and "Digivolves" or "Default Stats"
        if not in_stats and not in_attacks and not in_damage_table:
            if line and len(line) > 50 and "\t" not in line:
                if not any(line.startswith(prefix) for prefix in [
                    "Korean name:", "Chinese name:", "Thai name:", "Note:",
                    "Approximate", "Base Value", "Categories:", "Digivolves",
                    "Default Stats", "Attacks", "F1 ", "F2 ", "F3 ", "F4 ",
                    "Rank Passives", "Overview", "Pros:", "Cons:", "="*10,
                ]):
                    if not line.startswith("(") and d["name"] not in line[:len(d["name"])+5]:
                        intro_lines.append(line)

        i += 1

    # Compile introduction
    if intro_lines:
        d["introduction"] = "\n\n".join(intro_lines)

    return d


def login():
    """Login to CMS and return cookies."""
    r = requests.post(f"{CMS_URL}/api/users/login", json={
        "email": EMAIL, "password": PASSWORD
    })
    if r.status_code == 200:
        print("Logged in to CMS")
        return r.cookies
    else:
        print(f"Login failed: {r.status_code}")
        return None


def get_all_cms_digimon():
    """Fetch all Digimon from CMS."""
    docs = []
    page = 1
    while True:
        r = requests.get(f"{CMS_URL}/api/digimon", params={"limit": 100, "page": page, "depth": 0})
        data = r.json()
        docs.extend(data["docs"])
        if not data.get("hasNextPage"):
            break
        page += 1
    return docs


def build_payload(d):
    """Build a CMS-compatible payload from parsed data."""
    payload = {}

    # Required fields
    payload["name"] = d["name"]
    payload["slug"] = name_to_slug(d["name"])

    # Form (required)
    if d.get("form") and d["form"] in VALID_FORMS:
        payload["form"] = d["form"]
    else:
        payload["form"] = "Mega"  # fallback

    # Attribute (required)
    if d.get("attribute") and d["attribute"] in VALID_ATTRIBUTES:
        payload["attribute"] = d["attribute"]
    else:
        payload["attribute"] = "Unknown"

    # Element (required)
    if d.get("element") and d["element"] in VALID_ELEMENTS:
        payload["element"] = d["element"]
    else:
        payload["element"] = "Neutral"

    # Optional fields
    if d.get("rank") and d["rank"] in VALID_RANKS:
        payload["rank"] = d["rank"]
    if d.get("type"):
        payload["type"] = d["type"]
    if d.get("attackerType") and d["attackerType"] in VALID_ATTACKER_TYPES:
        payload["attackerType"] = d["attackerType"]

    # Families
    valid_families = [f for f in d.get("families", []) if f in VALID_FAMILIES]
    if valid_families:
        payload["families"] = valid_families

    # Localized names
    names = {}
    for key in ["japanese", "katakana", "korean", "chinese", "thai"]:
        if d.get("names", {}).get(key):
            names[key] = d["names"][key]
    if names:
        payload["names"] = names

    # Introduction
    if d.get("introduction"):
        payload["introduction"] = d["introduction"][:5000]

    # Stats
    if d.get("stats"):
        payload["stats"] = {}
        for k, v in d["stats"].items():
            if v:
                payload["stats"][k] = v
    if d.get("maxStats"):
        payload["maxStats"] = {}
        for k, v in d["maxStats"].items():
            if v:
                payload["maxStats"][k] = v

    # Skills
    if d.get("skills"):
        skills = []
        for sk in d["skills"]:
            skill_data = {"name": sk["name"]}
            if sk.get("description"):
                skill_data["description"] = sk["description"]
            if sk.get("type"):
                skill_data["type"] = sk["type"]
            if sk.get("element"):
                skill_data["element"] = sk["element"]
            if sk.get("cooldown"):
                skill_data["cooldown"] = sk["cooldown"]
            if sk.get("dsConsumption"):
                skill_data["dsConsumption"] = sk["dsConsumption"]
            if sk.get("skillPointsPerUpgrade"):
                skill_data["skillPointsPerUpgrade"] = sk["skillPointsPerUpgrade"]
            if sk.get("animationTime"):
                skill_data["animationTime"] = sk["animationTime"]
            if sk.get("damagePerLevel"):
                skill_data["damagePerLevel"] = sk["damagePerLevel"]
            skills.append(skill_data)
        if skills:
            payload["skills"] = skills

    # Digivolutions
    digivolutions = {}
    if d.get("digivolvesFrom"):
        digivolutions["digivolvesFrom"] = d["digivolvesFrom"]
    if d.get("digivolvesTo"):
        digivolutions["digivolvesTo"] = d["digivolvesTo"]
    if digivolutions:
        payload["digivolutions"] = digivolutions

    # Unlock info
    if d.get("unlockedAtLevel"):
        payload["unlockedAtLevel"] = d["unlockedAtLevel"]
    if d.get("unlockedWithItem"):
        payload["unlockedWithItem"] = d["unlockedWithItem"]

    # Rideability
    if d.get("canBeRidden") or d.get("rideableWithItem"):
        payload["rideability"] = {
            "canBeRidden": d.get("canBeRidden", False),
        }
        if d.get("rideableWithItem"):
            payload["rideability"]["rideableWithItem"] = d["rideableWithItem"]

    # Availability
    payload["availability"] = {
        "canBeHatched": d.get("canBeHatched", False),
        "available": d.get("available", True),
    }

    return payload


def should_update(existing, new_payload):
    """Check if existing CMS entry needs updating. Returns fields to update."""
    updates = {}

    # Check each field
    for key in ["rank", "type", "attackerType", "introduction", "unlockedAtLevel", "unlockedWithItem"]:
        if key in new_payload and new_payload[key]:
            current = existing.get(key)
            if not current and new_payload[key]:
                updates[key] = new_payload[key]

    # Always update stats if we have more data
    for stat_group in ["stats", "maxStats"]:
        if stat_group in new_payload and new_payload[stat_group]:
            current = existing.get(stat_group) or {}
            new_stats = new_payload[stat_group]
            has_new = False
            for k, v in new_stats.items():
                if v and (not current.get(k) or current.get(k) == 0):
                    has_new = True
                    break
            if has_new:
                merged = {**current, **{k: v for k, v in new_stats.items() if v}}
                updates[stat_group] = merged

    # Skills - always update if we have skills and existing doesn't
    if new_payload.get("skills"):
        existing_skills = existing.get("skills") or []
        if not existing_skills or len(new_payload["skills"]) > len(existing_skills):
            updates["skills"] = new_payload["skills"]

    # Names - update if we have localized names
    if new_payload.get("names"):
        current_names = existing.get("names") or {}
        new_names = new_payload["names"]
        has_new = False
        for k, v in new_names.items():
            if v and not current_names.get(k):
                has_new = True
                break
        if has_new:
            updates["names"] = {**current_names, **{k: v for k, v in new_names.items() if v}}

    # Digivolutions
    if new_payload.get("digivolutions"):
        current_digi = existing.get("digivolutions") or {}
        current_from = current_digi.get("digivolvesFrom") or []
        current_to = current_digi.get("digivolvesTo") or []
        new_digi = new_payload["digivolutions"]
        if (not current_from and new_digi.get("digivolvesFrom")) or \
           (not current_to and new_digi.get("digivolvesTo")):
            updates["digivolutions"] = new_digi

    # Families
    if new_payload.get("families"):
        current_fams = existing.get("families") or []
        if not current_fams and new_payload["families"]:
            updates["families"] = new_payload["families"]

    # Rideability
    if new_payload.get("rideability"):
        current_ride = existing.get("rideability") or {}
        if not current_ride.get("canBeRidden") and new_payload["rideability"].get("canBeRidden"):
            updates["rideability"] = new_payload["rideability"]

    # Availability
    if new_payload.get("availability"):
        current_avail = existing.get("availability") or {}
        if not current_avail:
            updates["availability"] = new_payload["availability"]

    return updates


def main():
    base = r"d:\Windsurf Projekte\DMOKBNEW"
    files = [
        f"{base}\\Unknown-Type-Digimon.md",
        f"{base}\\None-Digimon.md",
    ]

    # Parse all files
    all_digimon = []
    for filepath in files:
        print(f"\nParsing {filepath.split(chr(92))[-1]}...")
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
        except FileNotFoundError:
            print(f"  NOT FOUND, skipping")
            continue

        sections = content.split("=" * 80)
        count = 0
        for section in sections:
            section = section.strip()
            if not section or len(section) < 20:
                continue
            data = parse_digimon_section(section)
            if data and data["name"]:
                all_digimon.append(data)
                count += 1
        print(f"  Parsed {count} Digimon")

    print(f"\nTotal parsed: {len(all_digimon)}")

    # Save extracted JSON
    json_path = f"{base}\\scripts\\all-extracted.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_digimon, f, indent=2, ensure_ascii=False)
    print(f"Saved to {json_path}")

    # Summary
    with_skills = sum(1 for d in all_digimon if d["skills"])
    with_stats = sum(1 for d in all_digimon if d["maxStats"])
    with_intro = sum(1 for d in all_digimon if d["introduction"])
    with_names = sum(1 for d in all_digimon if any(d["names"].get(k) for k in ["korean", "chinese", "thai"]))
    print(f"  With skills: {with_skills}")
    print(f"  With stats: {with_stats}")
    print(f"  With intro: {with_intro}")
    print(f"  With localized names: {with_names}")

    # Login to CMS
    cookies = login()
    if not cookies:
        print("Cannot proceed without CMS login")
        return

    # Fetch existing Digimon
    existing = get_all_cms_digimon()
    print(f"Existing CMS Digimon: {len(existing)}")
    name_to_doc = {d["name"].lower(): d for d in existing}

    created = 0
    updated = 0
    skipped = 0
    errors = 0

    for d in all_digimon:
        payload = build_payload(d)
        existing_doc = name_to_doc.get(d["name"].lower())

        if existing_doc:
            # Check if update needed
            updates = should_update(existing_doc, payload)
            if updates:
                try:
                    r = requests.patch(
                        f"{CMS_URL}/api/digimon/{existing_doc['id']}",
                        json=updates,
                        cookies=cookies,
                    )
                    if r.status_code == 200:
                        updated += 1
                        update_keys = list(updates.keys())
                        print(f"  UPDATED: {d['name']} ({', '.join(update_keys)})")
                    else:
                        errors += 1
                        print(f"  UPDATE ERROR: {d['name']} - {r.status_code}: {r.text[:200]}")
                except Exception as e:
                    errors += 1
                    print(f"  UPDATE ERROR: {d['name']} - {e}")
            else:
                skipped += 1
        else:
            # Create new
            try:
                r = requests.post(
                    f"{CMS_URL}/api/digimon",
                    json=payload,
                    cookies=cookies,
                )
                if r.status_code in [200, 201]:
                    created += 1
                    print(f"  CREATED: {d['name']}")
                    name_to_doc[d["name"].lower()] = r.json().get("doc", {})
                elif "slug" in r.text.lower() and "unique" in r.text.lower():
                    # Slug conflict - try with suffix
                    payload["slug"] = payload["slug"] + "-2"
                    r2 = requests.post(
                        f"{CMS_URL}/api/digimon",
                        json=payload,
                        cookies=cookies,
                    )
                    if r2.status_code in [200, 201]:
                        created += 1
                        print(f"  CREATED: {d['name']} (slug: {payload['slug']})")
                    else:
                        errors += 1
                        print(f"  CREATE ERROR: {d['name']} - {r2.status_code}: {r2.text[:200]}")
                else:
                    errors += 1
                    print(f"  CREATE ERROR: {d['name']} - {r.status_code}: {r.text[:200]}")
            except Exception as e:
                errors += 1
                print(f"  CREATE ERROR: {d['name']} - {e}")

    print(f"\n=== RESULTS ===")
    print(f"Created: {created}")
    print(f"Updated: {updated}")
    print(f"Skipped (no changes): {skipped}")
    print(f"Errors: {errors}")
    print(f"Total CMS Digimon: {len(existing) + created}")


if __name__ == "__main__":
    main()
