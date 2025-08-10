#!/bin/bash

# HTTPサーバーのテストスクリプト
# Taneyomi-kunのHTTPサーバーにテキストを送信する

PORT=${1:-50080}
TEXT=${2:-"これはHTTPサーバーのテストです"}

echo "HTTPサーバー (http://localhost:$PORT/tts) にテキストを送信します..."
echo "送信テキスト: $TEXT"

# ヘルスチェック
echo -e "\n=== ヘルスチェック ==="
curl -s http://localhost:$PORT/health | jq .

# テキスト送信
echo -e "\n=== テキスト送信 ==="
curl -X POST http://localhost:$PORT/tts \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$TEXT\"}" | jq .

# 優先度付きテキスト送信の例
echo -e "\n=== 優先度付きテキスト送信 (高優先度) ==="
curl -X POST http://localhost:$PORT/tts \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"緊急メッセージです\", \"priority\": \"high\"}" | jq .