#!/bin/bash
set -euo pipefail
umask 077
dir=/var/backups/impersia
install -d -m 700 -o postgres -g postgres "$dir"
stamp=$(date +%Y%m%d)
sudo -u postgres pg_dump -Fc -f "$dir/impersia-$stamp.dump" impersia
find "$dir" -name 'impersia-*.dump' -mtime +7 -delete
