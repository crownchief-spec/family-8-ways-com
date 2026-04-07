#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash ./scripts/prepare-seo-images.sh [input_dir] [output_dir] [keyword] [max_width]
# Example:
#   bash ./scripts/prepare-seo-images.sh ./uploads ./public/images/uploads family-portrait 1920

INPUT_DIR="${1:-./uploads}"
OUTPUT_DIR="${2:-./public/images/uploads}"
KEYWORD="${3:-family-portrait}"
MAX_WIDTH="${4:-1920}"

if ! command -v sips >/dev/null 2>&1; then
  echo "Error: sips command not found (macOS required)." >&2
  exit 1
fi

if [[ ! -d "$INPUT_DIR" ]]; then
  echo "Error: input directory not found: $INPUT_DIR" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

slugify() {
  local s="$1"
  s="$(echo "$s" | tr '[:upper:]' '[:lower:]')"
  s="$(echo "$s" | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g')"
  echo "$s"
}

shopt -s nullglob
count=1
for file in "$INPUT_DIR"/*; do
  [[ -f "$file" ]] || continue
  case "${file,,}" in
    *.jpg|*.jpeg|*.png|*.webp) ;;
    *) continue ;;
  esac
  base="$(basename "$file")"
  stem="${base%.*}"
  safe_stem="$(slugify "$stem")"
  index="$(printf "%03d" "$count")"
  out_file="${OUTPUT_DIR}/${KEYWORD}-${safe_stem}-${index}.jpg"

  # Resize + convert to jpeg for better web delivery.
  sips -s format jpeg -Z "$MAX_WIDTH" "$file" --out "$out_file" >/dev/null
  echo "Generated: ${out_file}"
  count=$((count + 1))
done

echo "Done. Processed $((count - 1)) image(s)."
