#!/usr/bin/env bash
##
##  convert-v2v.bash -- convert video to video
##

if [[ $# -ne 5 ]]; then
    echo "USAGE:  bash convert-i2v.bash <input>.* <output>.webm" 2>&1
    echo "SAMPLE: bash convert-v2v.bash foo.mp4 foo.webm" 2>&1
    exit 1
fi

input="$1"
output="$2"

fps="30"

echo "++ converting video to 1920x1080 target size"
echo "-- input:  $input"
echo "-- output: $output"

ffmpeg \
    -hide_banner \
    -i "$input" \
    -c:v libvpx \
    -vf "scale=1920:-2:flags=lanczos,fps=$fps" \
    -an \
    -pix_fmt yuva420p \
    -b:v 4000k \
    -auto-alt-ref 0 \
    -f webm \
    -y \
    "$output"

