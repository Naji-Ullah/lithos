#!/usr/bin/env bash
# Rebuilds index.html from src/. Requires node for the syntax check.
set -euo pipefail
cd "$(dirname "$0")"
JS="src/01-core.js src/02-data.js src/03-wall.js src/04-ui.js src/05-files-term.js src/06-apps.js src/08-games.js src/09-racer.js src/07-boot.js"
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="LithOS: the portfolio of Naji Ullah, full-stack software engineer in Lahore, as a desktop OS in the browser."><style>[hidden]{display:none!important}html,body{margin:0}</style></head><body>'
  cat src/head.html src/body.html
  echo '<script>'; cat $JS; echo '</script>'
  echo '</body></html>'
} > index.html
cat $JS > /tmp/lithos-check.js && node --check /tmp/lithos-check.js && echo "built index.html"
