#!/usr/bin/env bash
# notify_telegram.sh "text" : message the owner with the n8n container's TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
# (values stay inside the container and are never printed).
export MSYS_NO_PATHCONV=1
printf '%s' "$1" | docker exec -i vizion-n8n node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:process.env.TELEGRAM_CHAT_ID,text:d,disable_web_page_preview:true})}).then(r=>r.json()).then(j=>process.exit(j.ok?0:1)).catch(()=>process.exit(1)))"
