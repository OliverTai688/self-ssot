#!/usr/bin/env bash
# 在雲端 Linux 工作區重建錄影環境（2026-10-03 實測可用）。
# 前提：專案原始碼已解到 $APP（src prisma scripts public 與根目錄設定檔，加上 macOS 產生的 .prisma client）。
set -euo pipefail
APP=${APP:-/home/claude/app}; PGB=/usr/lib/postgresql/16/bin; PGD=/home/claude/pg
cd "$APP" && pnpm install --ignore-scripts --no-frozen-lockfile
mkdir -p $PGD && chown postgres $PGD && chmod 755 /home/claude
su postgres -c "$PGB/initdb -D $PGD/data -A trust -U postgres >/dev/null && $PGB/pg_ctl -D $PGD/data -o '-p 5433 -k /tmp' -l $PGD/log start"
sleep 2; createdb -h 127.0.0.1 -p 5433 -U postgres personal_os
for f in prisma/migrations/*/migration.sql; do psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5433 -U postgres -d personal_os -f "$f" >/dev/null; done
psql -h 127.0.0.1 -p 5433 -U postgres -d personal_os -c "INSERT INTO profiles (email, full_name, role, updated_at) VALUES ('test@yzedtech.com','UI 預覽帳號','OWNER', now());"
cat > .env.local <<'ENV'
DATABASE_URL="postgresql://postgres@127.0.0.1:5433/personal_os"
DIRECT_DATABASE_URL="postgresql://postgres@127.0.0.1:5433/personal_os"
PERSONAL_OS_AUTH_MODE=mock
PERSONAL_OS_DEV_USER_EMAIL=test@yzedtech.com
YUANZHAN_SEATS=test@yzedtech.com:yz:switch
ENV
nohup node scripts/start-yuanzhan-ui-preview.mjs showcase 3011 > /home/claude/preview.log 2>&1 &
echo "預覽：http://127.0.0.1:3011/company/operating（第一次開頁約 15 秒）"
# 影片工具（另一個資料夾）：
#   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i
#   export HYPERFRAMES_BROWSER_PATH=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
