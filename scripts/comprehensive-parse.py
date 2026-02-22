"""
Comprehensive Digimon wiki HTML parser.
Extracts ALL available data: stats, skills with full damage tables,
cooldowns, DS consumed, introductions, rank passives, pros/cons,
digivolutions, localized names, and more.
"""
import re
import json
import sys
from bs4 import BeautifulSoup

VALID_FAMILIES = ['Nature Spirits', 'Deep Savers', 'Nightmare Soldiers', 'Wind Guardians',
    'Metal Empire', 'Virus Busters', "Dragon's Roar", 'Jungle Troopers', 'Dark Area', 'Unknown', 'TBD']

STAT_NAME_MAP = {
    "health points": "hp", "hp": "hp",
    "digi-soul": "ds", "ds": "ds",
    "attack": "at", "at": "at",
    "attack speed": "as", "as": "as",
    "critical hit": "ct", "ct": "ct",
    "hit rate": "ht", "ht": "ht",
    "defense": "de", "de": "de",
    "evade": "ev", "ev": "ev",
}


def split_pages(html_content):
    chunks = re.split(r'(?=<!DOCTYPE html>)', html_content)
    pages = []
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk or len(chunk) < 100:
            continue
        title_match = re.search(r'<title>([^<]+?)(?:\s*-\s*Digimon Masters[^<]*)?</title>', chunk)
        if title_match:
            name = title_match.group(1).strip()
            pages.append({"name": name, "html": chunk})
    return pages


def parse_digimon_full(name, html):
    soup = BeautifulSoup(html, "html.parser")
    d = {
        "name": name,
        "localized_names": {},
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
        "skill_damage_table": [],
        "special_buffs": [],
        "rank_passives": [],
        "pros": [],
        "cons": [],
        "introduction": None,
        "digivolves_from": None,
        "digivolves_to": None,
        "rideable": None,
        "hatchable": None,
        "available": None,
        "unlocked_level": None,
        "unlocked_item": None,
        "riding_item": None,
        "required_item": None,
        "image_url": None,
    }

    # ========== LOCALIZED NAMES ==========
    name_cell = soup.find(id="scraper-digimon-name")
    if name_cell:
        text = name_cell.get_text(separator="\n")
        for line in text.split("\n"):
            line = line.strip()
            if line.startswith("Korean name:"):
                d["localized_names"]["korean"] = line.replace("Korean name:", "").strip()
            elif line.startswith("Chinese name:"):
                d["localized_names"]["chinese"] = line.replace("Chinese name:", "").strip()
            elif line.startswith("Thai name:"):
                d["localized_names"]["thai"] = line.replace("Thai name:", "").strip()
        # Japanese name from parentheses
        jp_match = re.search(r'\(([ァ-ヶー\s：]+(?:\s+\w+)?)\)', name_cell.get_text())
        if jp_match:
            d["localized_names"]["japanese"] = jp_match.group(1).strip()

    # ========== IMAGE URL ==========
    img_div = soup.find(id="scraper-digimon-image")
    if img_div:
        img = img_div.find("img")
        if img:
            d["image_url"] = img.get("src", "")

    # ========== INFOBOX ==========
    infobox = None
    for table in soup.find_all("table"):
        text = table.get_text()
        if "Form:" in text and "Attribute:" in text:
            infobox = table
            break

    if infobox:
        for row in infobox.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 2:
                continue
            label = cells[0].get_text(strip=True).lower()
            value_cell = cells[1]
            value = value_cell.get_text(strip=True)

            if "rank:" in label:
                for img in value_cell.find_all("img"):
                    alt = (img.get("alt") or "").strip()
                    if re.match(r'^(SSS\+|SSS|SS\+|SS|S\+|S|A\+|A|N|U\+|U)$', alt):
                        d["rank"] = alt
                        break

            elif "form:" in label:
                form_match = re.search(r'(Fresh|In-Training|Rookie|Champion|Ultimate|Mega|Burst Mode|Jogress|Armor|Hybrid|Ultra|Side Mega)', value)
                if form_match:
                    d["form"] = form_match.group(1)

            elif "attribute:" in label and "elemental" not in label and "attacker" not in label:
                attr_match = re.search(r'(Vaccine|Virus|Data|Free|Unknown|None)', value)
                if attr_match:
                    d["attribute"] = attr_match.group(1)

            elif "elemental attribute:" in label:
                elem_match = re.search(r'(Fire|Water|Ice|Wind|Thunder|Light|Pitch Black|Land|Wood|Steel|Neutral)', value)
                if elem_match:
                    d["element"] = elem_match.group(1)

            elif "attacker type:" in label:
                for img in value_cell.find_all("img"):
                    alt = (img.get("alt") or "").strip()
                    if alt in ['Quick Attacker', 'Short Attacker', 'Near Attacker', 'Defender']:
                        d["attackerType"] = alt
                        break

            elif label == "type:":
                d["type"] = value

            elif "families:" in label or "family:" in label:
                found = set()
                for img in value_cell.find_all("img"):
                    alt = (img.get("alt") or "").strip()
                    for fam in VALID_FAMILIES:
                        fn = fam.replace(" ", "").replace("'", "").lower()
                        an = alt.replace(" ", "").replace("'", "").lower()
                        if fn in an or fam.lower() in alt.lower():
                            found.add(fam)
                for a in value_cell.find_all("a"):
                    title = (a.get("title") or a.get_text(strip=True) or "").strip()
                    for fam in VALID_FAMILIES:
                        if fam.lower() in title.lower():
                            found.add(fam)
                d["families"] = sorted(found)

            elif "digivolved from:" in label:
                d["digivolves_from"] = value

            elif "digivolves to:" in label:
                d["digivolves_to"] = value

            elif "unlocked at level:" in label:
                d["unlocked_level"] = value

            elif "unlocked with item:" in label or "required to evolve:" in label:
                d["required_item"] = value

            elif "rideable with item:" in label:
                d["riding_item"] = value

            elif "can be ridden" in label:
                d["rideable"] = "Yes" if "yes" in value.lower() else "No"

            elif "can be hatched" in label:
                d["hatchable"] = "Yes" if "yes" in value.lower() else "No"

            elif "available:" in label:
                d["available"] = "Yes" if "yes" in value.lower() else "No"

    # ========== STATS ==========
    for table in soup.find_all("table"):
        text = table.get_text()
        if "Digimon Stats" not in text and not ("Health Points" in text and "Defense" in text):
            continue
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["td", "th"])
            if len(cells) < 3:
                continue
            stat_key = None
            stat_cell_idx = -1
            for ci, cell in enumerate(cells):
                ct = cell.get_text(strip=True).lower()
                if ct in STAT_NAME_MAP:
                    stat_key = STAT_NAME_MAP[ct]
                    stat_cell_idx = ci
                    break
            if not stat_key:
                continue
            values = []
            for cell in cells[stat_cell_idx + 1:]:
                vt = cell.get_text(strip=True).replace(",", "").replace("%", "").strip()
                if vt:
                    try:
                        values.append(float(vt))
                    except ValueError:
                        pass
            if len(values) >= 2:
                d["maxStats"][stat_key] = values[0]
                d["stats"][stat_key] = values[1]
            elif len(values) == 1:
                d["maxStats"][stat_key] = values[0]
        if d["maxStats"]:
            break

    # ========== SKILLS (descriptions, cooldowns, DS) ==========
    for table in soup.find_all("table"):
        style = table.get("style", "")
        if "border-spacing" not in style and "border-collapse" not in style.replace(" ", ""):
            continue
        text = table.get_text()
        if "cooldown" not in text.lower() and "ds consumed" not in text.lower():
            continue

        rows = table.find_all("tr")
        i = 0
        while i < len(rows):
            cells = rows[i].find_all("td")
            if len(cells) >= 4:
                skill_name = cells[0].get_text(strip=True)
                if skill_name and len(skill_name) > 1 and skill_name != "\xa0":
                    skill = {"name": skill_name, "element": "", "cooldown": "", "ds_consumed": "", "skill_points": "", "animation": "", "description": ""}
                    for cell in cells[1:]:
                        ct = cell.get_text(strip=True)
                        if "attribute" in ct.lower():
                            # Extract element from img alt
                            for img in cell.find_all("img"):
                                alt = (img.get("alt") or "").strip()
                                if alt in ['Fire', 'Water', 'Ice', 'Wind', 'Thunder', 'Light', 'Pitch Black', 'Land', 'Wood', 'Steel', 'Neutral']:
                                    skill["element"] = alt
                                    break
                            if not skill["element"]:
                                skill["element"] = ct.replace("attribute", "").strip()
                        elif "cooldown" in ct.lower():
                            skill["cooldown"] = ct
                        elif "ds consumed" in ct.lower():
                            skill["ds_consumed"] = ct
                        elif "skill points" in ct.lower():
                            skill["skill_points"] = ct
                        elif "animation" in ct.lower():
                            skill["animation"] = ct

                    # Next row might have description
                    if i + 1 < len(rows):
                        desc_row = rows[i + 1]
                        desc_cell = desc_row.find("td", class_="atkdesc")
                        if desc_cell:
                            skill["description"] = desc_cell.get_text(strip=True)
                            i += 1

                    d["skills"].append(skill)
            i += 1
        if d["skills"]:
            break

    # ========== SKILL DAMAGE TABLE ==========
    for table in soup.find_all("table", class_="attacktable"):
        rows = table.find_all("tr")
        if not rows:
            continue
        # Header row
        headers = [th.get_text(strip=True) for th in rows[0].find_all("th")]
        for row in rows[1:]:
            cells = row.find_all("td")
            if len(cells) < 3:
                continue
            # First cell is icon, second is attack name
            atk_name_cell = None
            for cell in cells:
                if "attackname" in (cell.get("class") or []):
                    atk_name_cell = cell
                    break
            if not atk_name_cell:
                # Try second cell
                if len(cells) >= 2:
                    atk_name_cell = cells[1]

            if not atk_name_cell:
                continue

            atk_name = atk_name_cell.get_text(strip=True)
            damage_values = []
            start_idx = cells.index(atk_name_cell) + 1 if atk_name_cell in cells else 2
            for cell in cells[start_idx:]:
                vt = cell.get_text(strip=True).replace(",", "")
                try:
                    damage_values.append(int(vt))
                except ValueError:
                    pass

            if atk_name and damage_values:
                d["skill_damage_table"].append({
                    "name": atk_name,
                    "damage": damage_values
                })
        break

    # ========== INTRODUCTION ==========
    content_div = soup.find("div", class_="mw-parser-output")
    if content_div:
        paragraphs = []
        for p in content_div.find_all("p", recursive=False):
            text = p.get_text(strip=True)
            if text and len(text) > 10:
                paragraphs.append(text)
        if paragraphs:
            d["introduction"] = "\n\n".join(paragraphs)

    # ========== SPECIAL BUFFS ==========
    page_text = soup.get_text()
    buff_patterns = [
        (r'F3 Special Buff[^\n]*\n([\s\S]*?)(?=F4 Special Buff|U Rank|Overview|Pros:|Cons:|Categories:|\Z)', "F3"),
        (r'F4 Special Buff[^\n]*\n([\s\S]*?)(?=U Rank|Overview|Pros:|Cons:|Categories:|\Z)', "F4"),
    ]
    for pat, label in buff_patterns:
        m = re.search(pat, page_text)
        if m:
            buff_text = m.group(1).strip()
            # Clean up
            buff_text = re.sub(r'\n{3,}', '\n\n', buff_text)
            if buff_text and len(buff_text) > 5:
                d["special_buffs"].append({"type": label, "text": buff_text[:500]})

    # ========== RANK PASSIVES ==========
    rp_match = re.search(r'U Rank Passives:([\s\S]*?)(?=Overview|Pros:|Cons:|Categories:|\Z)', page_text)
    if not rp_match:
        rp_match = re.search(r'Rank Passives:([\s\S]*?)(?=Overview|Pros:|Cons:|Categories:|\Z)', page_text)
    if rp_match:
        rp_text = rp_match.group(1).strip()[:800]
        if rp_text:
            d["rank_passives"].append(rp_text)

    # ========== PROS / CONS ==========
    pros_match = re.search(r'Pros:\s*\n([\s\S]*?)(?=Cons:|Categories:|\Z)', page_text)
    if pros_match:
        for line in pros_match.group(1).strip().split("\n"):
            line = line.strip()
            if line and len(line) > 3 and not line.startswith("Cons"):
                d["pros"].append(line)

    cons_match = re.search(r'Cons:\s*\n([\s\S]*?)(?=Categories:|\Z)', page_text)
    if cons_match:
        for line in cons_match.group(1).strip().split("\n"):
            line = line.strip()
            if line and len(line) > 3 and not line.startswith("Categories"):
                d["cons"].append(line)

    return d


def digimon_to_markdown(d):
    """Convert parsed digimon dict to comprehensive markdown."""
    lines = []
    lines.append(f"## {d['name']}\n")

    # Localized names
    ln = d.get("localized_names", {})
    if ln:
        parts = []
        if ln.get("japanese"):
            parts.append(f"JP: {ln['japanese']}")
        if ln.get("korean"):
            parts.append(f"KR: {ln['korean']}")
        if ln.get("chinese"):
            parts.append(f"CN: {ln['chinese']}")
        if ln.get("thai"):
            parts.append(f"TH: {ln['thai']}")
        if parts:
            lines.append(f"*{' | '.join(parts)}*\n")

    # Basic info
    if d.get("rank"):
        lines.append(f"- **Rank:** {d['rank']}")
    if d.get("form"):
        lines.append(f"- **Form:** {d['form']}")
    if d.get("attribute"):
        lines.append(f"- **Attribute:** {d['attribute']}")
    if d.get("element"):
        lines.append(f"- **Element:** {d['element']}")
    if d.get("attackerType"):
        lines.append(f"- **Attacker Type:** {d['attackerType']}")
    if d.get("type"):
        lines.append(f"- **Type:** {d['type']}")
    if d.get("families"):
        lines.append(f"- **Families:** {', '.join(d['families'])}")
    if d.get("unlocked_level"):
        lines.append(f"- **Unlocked at Level:** {d['unlocked_level']}")
    if d.get("required_item"):
        lines.append(f"- **Required Item:** {d['required_item']}")
    if d.get("riding_item"):
        lines.append(f"- **Riding Item:** {d['riding_item']}")
    if d.get("digivolves_from"):
        lines.append(f"- **Digivolves From:** {d['digivolves_from']}")
    if d.get("digivolves_to"):
        lines.append(f"- **Digivolves To:** {d['digivolves_to']}")
    if d.get("rideable"):
        lines.append(f"- **Rideable:** {d['rideable']}")
    if d.get("hatchable"):
        lines.append(f"- **Hatchable:** {d['hatchable']}")
    if d.get("available"):
        lines.append(f"- **Available:** {d['available']}")

    lines.append("")

    # Introduction
    if d.get("introduction"):
        lines.append("### Introduction")
        lines.append(d["introduction"])
        lines.append("")

    # Stats
    if d.get("maxStats"):
        lines.append("### Stats")
        lines.append("| Stat | Max (Lv170, 140%) | Base |")
        lines.append("|------|-------------------|------|")
        stat_labels = [("hp", "HP"), ("ds", "DS"), ("at", "AT"), ("as", "AS"), ("ct", "CT"), ("ht", "HT"), ("de", "DE"), ("ev", "EV")]
        for key, label in stat_labels:
            mv = d["maxStats"].get(key, "-")
            bv = d.get("stats", {}).get(key, "-")
            if mv == 0:
                mv = "-"
            if bv == 0:
                bv = "-"
            lines.append(f"| {label} | {mv} | {bv} |")
        lines.append("")

    # Skills
    if d.get("skills"):
        lines.append("### Skills")
        for sk in d["skills"]:
            lines.append(f"**{sk['name']}**")
            details = []
            if sk.get("element"):
                details.append(f"{sk['element']} attribute")
            if sk.get("cooldown"):
                details.append(sk["cooldown"])
            if sk.get("ds_consumed"):
                details.append(sk["ds_consumed"])
            if sk.get("skill_points"):
                details.append(sk["skill_points"])
            if sk.get("animation"):
                details.append(sk["animation"])
            if details:
                lines.append(f"  {' | '.join(details)}")
            if sk.get("description"):
                lines.append(f"  *{sk['description']}*")
            lines.append("")

    # Skill damage table
    if d.get("skill_damage_table"):
        lines.append("### Skill Damage Table")
        # Header
        max_levels = max(len(s["damage"]) for s in d["skill_damage_table"])
        header = "| Skill |"
        sep = "|-------|"
        for i in range(max_levels):
            header += f" Lv.{i+1} |"
            sep += "------|"
        lines.append(header)
        lines.append(sep)
        for sk in d["skill_damage_table"]:
            row = f"| {sk['name']} |"
            for v in sk["damage"]:
                row += f" {v} |"
            lines.append(row)
        lines.append("")

    # Special Buffs
    if d.get("special_buffs"):
        lines.append("### Special Buffs")
        for buff in d["special_buffs"]:
            lines.append(f"**{buff['type']} Special Buff**")
            lines.append(buff["text"])
            lines.append("")

    # Rank Passives
    if d.get("rank_passives"):
        lines.append("### Rank Passives")
        for rp in d["rank_passives"]:
            lines.append(rp)
        lines.append("")

    # Pros / Cons
    if d.get("pros") or d.get("cons"):
        lines.append("### Overview")
        if d.get("pros"):
            lines.append("**Pros:**")
            for p in d["pros"]:
                lines.append(f"- {p}")
        if d.get("cons"):
            lines.append("**Cons:**")
            for c in d["cons"]:
                lines.append(f"- {c}")
        lines.append("")

    lines.append("---\n")
    return "\n".join(lines)


def main():
    if len(sys.argv) < 3:
        print("Usage: python comprehensive-parse.py <input_html_file> <output_md_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    print(f"Reading {input_file}...")
    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()

    pages = split_pages(content)
    print(f"Found {len(pages)} pages")

    all_data = []
    for p in pages:
        data = parse_digimon_full(p["name"], p["html"])
        all_data.append(data)
        sk_count = len(data["skills"])
        dmg_count = len(data["skill_damage_table"])
        print(f"  {data['name']}: form={data['form'] or '-'} skills={sk_count} dmg_table={dmg_count} intro={len(data['introduction'] or '')}")

    # Save JSON
    json_out = output_file.replace(".md", "-extracted.json")
    with open(json_out, "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)
    print(f"Saved JSON to {json_out}")

    # Generate markdown
    md_lines = [f"# Digimon Data (Comprehensive)\n\nTotal: {len(all_data)} Digimon\n\n---\n\n"]
    for data in all_data:
        md_lines.append(digimon_to_markdown(data))

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"Written markdown to {output_file}")

    # Summary
    with_skills = sum(1 for d in all_data if d["skills"])
    with_dmg = sum(1 for d in all_data if d["skill_damage_table"])
    with_buffs = sum(1 for d in all_data if d["special_buffs"])
    with_passives = sum(1 for d in all_data if d["rank_passives"])
    with_pros = sum(1 for d in all_data if d["pros"] or d["cons"])
    print(f"\n=== SUMMARY ===")
    print(f"Total: {len(all_data)}")
    print(f"With skills: {with_skills}")
    print(f"With damage tables: {with_dmg}")
    print(f"With special buffs: {with_buffs}")
    print(f"With rank passives: {with_passives}")
    print(f"With pros/cons: {with_pros}")


if __name__ == "__main__":
    main()
