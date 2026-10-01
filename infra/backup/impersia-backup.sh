#!/bin/bash
set -euo pipefail
umask 077
dir=/var/backups/impersia
mkdir -p "$dir"
stamp=$(date +%Y%m%d)
sudo -u postgres pg_dump -Fc impersia > "$dir/impersia-$stamp.dump"
find "$dir" -name 'impersia-*.dump' -mtime +7 -delete
