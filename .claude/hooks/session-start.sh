#!/bin/bash
set -euo pipefail

# AfriPulse Times — SessionStart hook for Claude Code on the web.
# Installs Node dependencies and verifies the build so the static site, the
# /api serverless functions, and `npm run build` are ready as soon as a web
# session starts (a fresh clone has no node_modules).

# Web (remote) sessions only — local machines keep their own setup.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# 1. Install dependencies. Idempotent; the container caches this after the hook.
npm install

# 2. Smoke build: runs gen:config + vite build. This repo has no test/lint
#    suite, so the build is the readiness check. Safe with placeholder env vars.
npm run build
