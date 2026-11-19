#!/bin/sh
# Chạy sao lưu mỗi ngày vào BACKUP_HOUR_UTC (hoặc mỗi BACKUP_EVERY_SEC giây, dùng để thử). Lỗi thì ghi log và thử lại sau 15 phút.
while true; do
  if [ -n "${BACKUP_EVERY_SEC:-}" ]; then sleep "$BACKUP_EVERY_SEC"
  else
    now=$(date -u +%s); today=$(date -u +%Y-%m-%d)
    target=$(date -u -d "$today ${BACKUP_HOUR_UTC:-20}:00:00" +%s 2>/dev/null || echo $((now + 86400)))
    [ "$target" -le "$now" ] && target=$((target + 86400))
    sleep $((target - now))
  fi
  until sh /usr/local/bin/backup.sh; do echo "Thử lại sau 15 phút" >&2; sleep 900; done
done
