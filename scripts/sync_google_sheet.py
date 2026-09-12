#!/usr/bin/env python3

import csv
import io
import json
import os
import sys
import tempfile
import urllib.request
from pathlib import Path


SHEET_ID = os.environ.get("GOOGLE_SHEET_ID")
SHEET_GID = os.environ.get("GOOGLE_SHEET_GID", "0")

OUTPUT_FILE = Path("data/videos.json")

REQUIRED_COLUMNS = [
    "Title",
    "YouTube ID",
    "Series",
    "Tags",
    "Description",
    "Added Date",
    "Status",
]


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def download_sheet():
    if not SHEET_ID:
        fail("GOOGLE_SHEET_ID is not configured.")

    url = (
        f"https://docs.google.com/spreadsheets/d/"
        f"{SHEET_ID}/export?format=csv&gid={SHEET_GID}"
    )

    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            return response.read().decode("utf-8-sig")

    except Exception as exc:
        fail(f"Could not download Google Sheet: {exc}")


def clean(value):
    return str(value or "").strip()


def parse_tags(value):
    value = clean(value)

    if not value:
        return []

    return [
        tag.strip()
        for tag in value.split(",")
        if tag.strip()
    ]


def validate_title(title, row_number):
    if not title:
        fail(f"Row {row_number}: Title is empty.")

    if len(title) > 100:
        fail(
            f"Row {row_number}: Title exceeds 100 characters."
        )


def main():
    csv_text = download_sheet()

    reader = csv.DictReader(io.StringIO(csv_text))

    if not reader.fieldnames:
        fail("Google Sheet has no header row.")

    columns = [
        clean(column)
        for column in reader.fieldnames
    ]

    missing = [
        column
        for column in REQUIRED_COLUMNS
        if column not in columns
    ]

    if missing:
        fail(
            "Missing required columns: "
            + ", ".join(missing)
        )

    output = []

    for row_number, row in enumerate(reader, start=2):

        title = clean(row.get("Title"))
        youtube_id = clean(row.get("YouTube ID"))
        series = clean(row.get("Series"))
        description = clean(row.get("Description"))
        added_date = clean(row.get("Added Date"))
        status = clean(row.get("Status"))

        ## Ignore completely empty rows.
        if not any([
            title,
            youtube_id,
            series,
            description,
            added_date,
            status,
            clean(row.get("Tags")),
        ]):
            continue

        validate_title(title, row_number)

        if not youtube_id:
            fail(
                f"Row {row_number}: YouTube ID is empty."
            )
            
        if not series:
            fail(
                f"Row {row_number}: Series is empty."
            )

        if not status:
            fail(
                f"Row {row_number}: Status is empty."
            )

        video = {
            "title": title,
            "youtube_id": youtube_id,
            "series": series,
            "tags": parse_tags(row.get("Tags")),
            "description": description,
            "added_date": added_date,
            "status": status,
        }
        ## In Google Sheet oldest videos are at the top.
        # output.append(video)
        output.insert(0, video) # Reverse order for newest first

    if not output:
        fail(
            "Google Sheet produced zero valid videos. "
            "Existing videos.json was not changed."
        )

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    ## Write to a temporary file first.
    ## Existing JSON remains untouched if writing fails.
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=OUTPUT_FILE.parent,
            delete=False
        ) as temp:
            json.dump(
                output,  
                temp,
                ensure_ascii=False,
                indent=2
            )

            temp.write("\n")

            temp_path = Path(temp.name)

        temp_path.replace(OUTPUT_FILE)

    except Exception as exc:
        fail(f"Could not write videos.json: {exc}")

    print(
        f"Successfully synced {len(output)} videos "
        f"to {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()