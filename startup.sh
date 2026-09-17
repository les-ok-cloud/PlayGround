#!/usr/bin/env bash
set -euo pipefail
# Once-per-worker prerequisites. Executed once per worker from the project directory.
# Keep project server startup in start.sh, not here.
/usr/bin/time -p bash -c 'command -v tmux >/dev/null 2>&1 || brew install tmux'
/usr/bin/time -p tmux -V
