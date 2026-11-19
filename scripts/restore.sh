#!/bin/sh
# Khôi phục DB từ một bản sao lưu:  PGHOST=... PGUSER=... PGPASSWORD=... PGDATABASE=... sh scripts/restore.sh florea-20261101-200000.sql.gz
# CẢNH BÁO: xoá toàn bộ dữ liệu hiện tại của DB đích rồi nạp lại từ bản sao lưu.
set -eu
[ $# -eq 1 ] || { echo "Dùng: restore.sh <tệp .sql.gz>" >&2; exit 1; }
gzip -t "$1"
psql -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' >/dev/null
gunzip -c "$1" | psql -v ON_ERROR_STOP=1 -q >/dev/null
echo "Đã khôi phục từ $1"
