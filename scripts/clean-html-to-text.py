"""
Clean Digimon wiki HTML files to plain text, keeping ALL Digimon-related data.
Strips HTML tags, scripts, styles, navigation, footer boilerplate.
Preserves: name, localized names, rank, form, attribute, element, attacker type,
type, families, stats, skills, damage tables, special buffs, rank passives,
pros/cons, introduction, digivolution info, etc.
"""
import re
import sys
import os
from bs4 import BeautifulSoup, NavigableString, Comment


# Wiki boilerplate lines to strip
BOILERPLATE = {
    "main menu", "navigation", "main page", "mercenary digimon", "help the wiki!",
    "recent changes", "new pages", "syntax & editing", "search", "create account",
    "log in", "personal tools", "page", "discussion", "english", "read",
    "view source", "view history", "tools", "actions", "move to sidebar", "hide",
    "what links here", "related changes", "special pages", "printable version",
    "permanent link", "page information", "jump to content", "appearance",
    "toggle the table of contents", "privacy policy",
    "about digimon masters online wiki - dmo wiki", "disclaimers",
    "powered by mediawiki", "visit the main page", "toggle limited content width",
}


def split_pages(html_content):
    """Split concatenated HTML into individual page chunks."""
    chunks = re.split(r'(?=<!DOCTYPE html>)', html_content)
    pages = []
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk or len(chunk) < 200:
            continue
        title_match = re.search(
            r'<title>([^<]+?)(?:\s*-\s*Digimon Masters[^<]*)?</title>', chunk
        )
        if title_match:
            name = title_match.group(1).strip()
            pages.append({"name": name, "html": chunk})
    return pages


def extract_table_text(table):
    """Extract table content as tab-separated text, row per line."""
    lines = []
    for row in table.find_all("tr"):
        cells = row.find_all(["td", "th"])
        cell_texts = []
        for cell in cells:
            # For images, use alt text
            for img in cell.find_all("img"):
                alt = img.get("alt", "")
                if alt and alt not in ["", " "]:
                    img.replace_with(f" {alt} ")
            text = cell.get_text(separator=" ", strip=True)
            text = re.sub(r'\s+', ' ', text).strip()
            if text:
                cell_texts.append(text)
        if cell_texts:
            lines.append("\t".join(cell_texts))
    return "\n".join(lines)


def clean_page(name, html):
    """Extract clean text from a single Digimon wiki page HTML."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove scripts, styles, comments
    for tag in soup.find_all(["script", "style", "link", "meta", "noscript"]):
        tag.decompose()
    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()

    # Find main content
    content = soup.find("div", class_="mw-parser-output")
    if not content:
        # Fallback: try the body content
        content = soup.find("div", id="bodyContent")
    if not content:
        content = soup.find("body")
    if not content:
        return f"# {name}\n\n(No content found)\n"

    output_lines = [name]

    # Get the Japanese/localized name from the scraper-digimon-name div or first heading
    name_div = soup.find(id="scraper-digimon-name")
    if name_div:
        name_text = name_div.get_text(separator="\n", strip=True)
        # Extract Japanese name in parentheses
        jp_match = re.search(r'[\(（]([ァ-ヶー\u3000-\u303Fぁ-ゖ\s：・\-]+)[）\)]', name_text)
        if jp_match:
            output_lines.append(f"({jp_match.group(1).strip()})›")
        # Extract Korean/Chinese/Thai names
        for line in name_text.split("\n"):
            line = line.strip()
            if any(line.startswith(prefix) for prefix in ["Korean name:", "Chinese name:", "Thai name:"]):
                output_lines.append(line)

    output_lines.append("")

    # Process content children in order
    for child in content.children:
        if isinstance(child, NavigableString):
            text = child.strip()
            if text and len(text) > 2:
                output_lines.append(text)
            continue

        if not hasattr(child, 'name'):
            continue

        tag_name = child.name

        # Skip hidden elements, edit sections, TOC
        if child.get("id") in ["toc", "catlinks", "siteSub"]:
            continue
        if child.get("class") and any(
            c in (child.get("class") or [])
            for c in ["mw-editsection", "toc", "catlinks", "noprint", "navbox"]
        ):
            continue

        if tag_name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
            heading_text = child.get_text(strip=True)
            # Skip wiki boilerplate headings
            if heading_text.lower().strip("[]") in BOILERPLATE:
                continue
            # Skip "[edit]" suffix
            heading_text = re.sub(r'\[edit\]$', '', heading_text).strip()
            if heading_text:
                output_lines.append("")
                output_lines.append(heading_text)

        elif tag_name == "table":
            table_text = extract_table_text(child)
            if table_text:
                # Check if this is boilerplate
                lower = table_text.lower()
                if any(bp in lower for bp in ["what links here", "special pages", "printable version"]):
                    continue
                output_lines.append(table_text)

        elif tag_name == "p":
            # Replace images with alt text
            for img in child.find_all("img"):
                alt = img.get("alt", "")
                if alt:
                    img.replace_with(f" {alt} ")
            text = child.get_text(separator=" ", strip=True)
            text = re.sub(r'\s+', ' ', text).strip()
            if text and len(text) > 2:
                # Skip boilerplate paragraphs
                lower = text.lower()
                if any(bp in lower for bp in [
                    "this page was last edited",
                    "privacy policy",
                    "powered by mediawiki",
                    "jump to content",
                ]):
                    continue
                output_lines.append(text)

        elif tag_name == "ul":
            for li in child.find_all("li", recursive=False):
                for img in li.find_all("img"):
                    alt = img.get("alt", "")
                    if alt:
                        img.replace_with(f" {alt} ")
                text = li.get_text(separator=" ", strip=True)
                text = re.sub(r'\s+', ' ', text).strip()
                if text and len(text) > 2:
                    output_lines.append(text)

        elif tag_name == "ol":
            for i, li in enumerate(child.find_all("li", recursive=False), 1):
                text = li.get_text(separator=" ", strip=True)
                text = re.sub(r'\s+', ' ', text).strip()
                if text:
                    output_lines.append(f"{i}. {text}")

        elif tag_name == "div":
            # Process nested content divs (skill descriptions, buff info, etc.)
            div_class = child.get("class") or []
            # Skip navigation/tool divs
            if any(c in div_class for c in [
                "navbox", "noprint", "catlinks", "vector-dropdown",
                "mw-indicators", "printfooter",
            ]):
                continue

            # For divs that contain relevant content, extract text
            inner_text = child.get_text(separator="\n", strip=True)
            if inner_text and len(inner_text) > 5:
                # Filter out boilerplate
                lower = inner_text.lower()
                if any(bp in lower for bp in [
                    "this page was last edited",
                    "privacy policy",
                    "powered by mediawiki",
                ]):
                    continue
                # Clean up excessive newlines
                cleaned = re.sub(r'\n{3,}', '\n\n', inner_text)
                output_lines.append(cleaned)

        elif tag_name == "span":
            text = child.get_text(strip=True)
            if text and len(text) > 2:
                output_lines.append(text)

    # Join and clean up
    result = "\n".join(output_lines)

    # Remove excessive blank lines
    result = re.sub(r'\n{4,}', '\n\n\n', result)

    # Remove any remaining wiki boilerplate that leaked through
    lines_filtered = []
    for line in result.split("\n"):
        stripped = line.strip().lower()
        if stripped in BOILERPLATE:
            continue
        if stripped.startswith("categories:"):
            # Keep categories line as it has useful info
            lines_filtered.append(line)
            continue
        lines_filtered.append(line)

    return "\n".join(lines_filtered)


def process_file(input_path, output_path):
    """Process a single HTML file into clean text."""
    print(f"Reading {input_path}...")
    with open(input_path, "r", encoding="utf-8") as f:
        content = f.read()

    pages = split_pages(content)
    print(f"  Found {len(pages)} Digimon pages")

    all_text = []
    for i, page in enumerate(pages):
        clean = clean_page(page["name"], page["html"])
        all_text.append(clean)
        if (i + 1) % 20 == 0:
            print(f"  Processed {i + 1}/{len(pages)}...")

    # Join all pages with separator
    separator = "\n\n" + "=" * 80 + "\n\n"
    final = separator.join(all_text)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(final)

    size = os.path.getsize(output_path)
    print(f"  Written to {output_path} ({size:,} bytes, {len(pages)} Digimon)")
    return len(pages)


def main():
    base = r"d:\Windsurf Projekte\DMOKBNEW"
    files = [
        ("Unknown-Type-Digimon.md", "Unknown-Type-Digimon.md"),
        ("None-Digimon.md", "None-Digimon.md"),
    ]

    total = 0
    for in_name, out_name in files:
        in_path = os.path.join(base, in_name)
        out_path = os.path.join(base, out_name)
        if not os.path.exists(in_path):
            print(f"SKIP: {in_name} not found")
            continue
        count = process_file(in_path, out_path)
        total += count

    print(f"\n=== DONE: {total} total Digimon cleaned ===")


if __name__ == "__main__":
    main()
