#!/usr/bin/env bash
##
##  convert-i2v.bash -- convert two images to a video
##

if [[ $# -ne 5 ]]; then
    echo "USAGE:  bash convert-i2v.bash <show-sec> <fade-sec> <image1>.png <image2>.png <video>.webm" 2>&1
    echo "SAMPLE: bash convert-i2v.bash 10 1 foo1.png foo2.png foo.webm" 2>&1
    exit 1
fi

show="$1"
fade="$2"
image1="$3"
image2="$4"
video="$5"

total=$((2 * $show + 2 * $fade))
fps="30"

echo "++ converting images to 1920x1080 video"
echo "-- input1: $image1"
echo "-- input2: $image2"
echo "-- output: $video"

ffmpeg \
    -hide_banner \
    -framerate "$fps" -loop 1 -t "$total" -i "$image1" \
    -framerate "$fps" -loop 1 -t "$total" -i "$image2" \
    -t "$total" \
    -filter_complex \
        "[0:v][1:v]xfade=transition=fade:offset=$(($show / 2)):duration=$fade[v1]; \
        [v1][0:v]xfade=transition=fade:offset=$(($show / 2 + $fade + $show)):duration=$fade[v]" \
    -map "[v]" \
    -c:v libvpx \
    -an \
    -pix_fmt yuva420p \
    -b:v 2000k \
    -auto-alt-ref 0 \
    -f webm \
    -y \
    "$video"

