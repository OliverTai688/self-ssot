#!/usr/bin/env bash
# 找出錄影裡同步閃光的時間點（先暗後白的第一格）。找不到就印空字串。
ffmpeg -v error -i "$1" -vf "scale=160:90,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - | awk '/pts_time/{split($0,a,"pts_time:");t=a[2]} /YAVG/{split($0,b,"=");if(b[2]<100)dark=1;if(dark&&b[2]>180){print t;exit}}'
