#!/bin/bash
# Process full WhatsApp chat export: parse and split by day, write one transcript per day to memory/raw/YYYY-MM-DD/transcript.md

set -e

CHAT_FILE="${WHATSAPP_CHAT_EXPORT:-$HOME/.openclaw/media/inbound/WhatsApp_Chat_Export.txt}"
OUTPUT_DIR="/Users/paulvisciano/Personal/paulvisciano.github.io/memory/raw"

echo "Processing WhatsApp chat (full transcript, split by day)..."
echo "Chat file: $CHAT_FILE"
echo "Output dir: $OUTPUT_DIR"
echo ""

python3 << 'PYTHON_EOF'
import re
import os
import shutil
from datetime import datetime
from collections import defaultdict

CHAT_FILE = os.environ.get('WHATSAPP_CHAT_EXPORT', os.path.expanduser('~/.openclaw/media/inbound/WhatsApp_Chat_Export.txt'))
OUTPUT_DIR = "/Users/paulvisciano/Personal/paulvisciano.github.io/memory/raw"

# WhatsApp export: "2/23/26, 8:50 PM - Name: message" (message can be empty; continuation lines have no leading date)
MSG_PATTERN = re.compile(r'^(\d+/\d+/\d+),\s*(.+?)\s+-\s*(.+?):\s*(.*)$')

messages_by_date = defaultdict(list)  # YYYY-MM-DD -> list of (time_str, sender, body_lines)

print("Parsing WhatsApp chat file...")

with open(CHAT_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    if not stripped:
        i += 1
        continue

    m = MSG_PATTERN.match(stripped)
    if m:
        date_str, time_str, sender, rest = m.groups()
        try:
            date_obj = datetime.strptime(date_str.strip(), "%m/%d/%y")
            day_key = date_obj.strftime("%Y-%m-%d")
        except ValueError:
            i += 1
            continue
        body_lines = [rest] if rest else []
        j = i + 1
        while j < len(lines) and lines[j].strip() and not MSG_PATTERN.match(lines[j]):
            body_lines.append(lines[j].rstrip())
            j += 1
        messages_by_date[day_key].append((time_str.strip(), sender.strip(), body_lines))
        i = j
    else:
        i += 1

print(f"  Messages parsed: {sum(len(v) for v in messages_by_date.values())}")
print(f"  Dates: {len(messages_by_date)}")
print("")

print("Writing transcript per day to memory/raw/YYYY-MM-DD/transcript.md ...")

for day_key in sorted(messages_by_date.keys()):
    messages = messages_by_date[day_key]
    day_dir = os.path.join(OUTPUT_DIR, day_key)
    os.makedirs(day_dir, exist_ok=True)
    # One transcript per day only: remove legacy transcripts/ subfolder if present
    legacy_transcripts_dir = os.path.join(day_dir, "transcripts")
    if os.path.isdir(legacy_transcripts_dir):
        shutil.rmtree(legacy_transcripts_dir)
    out_path = os.path.join(day_dir, "transcript.md")

    date_obj = datetime.strptime(day_key, "%Y-%m-%d")
    title_date = date_obj.strftime("%b %d, %Y")  # e.g. Feb 23, 2026

    parts = [f"# WhatsApp transcript — {title_date}\n", f"*Split from full export. {len(messages)} messages.*\n\n---\n\n"]
    for time_str, sender, body_lines in messages:
        body = "\n".join(body_lines).strip()
        parts.append(f"### {time_str} — {sender}\n\n")
        if body:
            parts.append(body)
            parts.append("\n\n")
    content = "".join(parts).rstrip() + "\n"

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  [{day_key}] {out_path} ({len(messages)} messages)")

print("")
print("Done. One transcript.md per day in memory/raw/YYYY-MM-DD/.")
PYTHON_EOF

echo "Script complete."
