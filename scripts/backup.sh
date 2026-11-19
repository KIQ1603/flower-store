#!/bin/sh
# Sao lưu PostgreSQL một lần: nén gzip vào /backups, xoá bản cũ hơn BACKUP_KEEP_DAYS ngày, kiểm tra bản vừa tạo đọc được.
set -eu
DIR="${BACKUP_DIR:-/backups}"; KEEP="${BACKUP_KEEP_DAYS:-14}"
mkdir -p "$DIR"
FILE="$DIR/florea-$(date -u +%Y%m%d-%H%M%S).sql.gz"
pg_dump --no-owner --no-privileges | gzip -9 > "$FILE.part"
# bản sao lưu rỗng/hỏng thì báo lỗi, không giữ lại
if ! gzip -t "$FILE.part" || [ "$(wc -c < "$FILE.part")" -lt 1000 ]; then rm -f "$FILE.part"; echo "SAO LƯU LỖI: tệp rỗng hoặc hỏng" >&2; exit 1; fi
mv "$FILE.part" "$FILE"
find "$DIR" -name 'florea-*.sql.gz' -mtime +"$KEEP" -delete
echo "Đã sao lưu: $FILE ($(wc -c < "$FILE") byte)"
