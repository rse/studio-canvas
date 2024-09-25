#!/usr/bin/env bash
##
##  convert-i2v.bash -- convert two images to a video
##

LANG=en_US.UTF-8

if [[ $# -lt 5 ]]; then
    echo "USAGE:  bash convert-i2v.bash <show-sec> <fade-sec> <image1>.png <image2>.png <video>.webm [<transition>]" 2>&1
    echo "SAMPLE: bash convert-i2v.bash 10 1 foo1.png foo2.png foo.webm slideleft" 2>&1
    exit 1
fi

show="$1"
fade="$2"
image1="$3"
image2="$4"
video="$5"
transition="${6-fade}" # fade|slideleft|dissolve|pixelize

total=$((2 * $show + 2 * $fade))
fps="30"

codec=""; pixfmt=""; fmt=""; stacked=no
case "$video" in
    *.webm  ) codec="libvpx";     pixfmt="yuva420p"; fmt="webm"; stacked=no  ;; # Video/WebM/VP8 RGBA  1920x1080
    *.swebm ) codec="libvpx";     pixfmt="yuv420p";  fmt="webm"; stacked=yes ;; # Video/WebM/VP8 RGB+A 1920x2160
    *.mp4   ) codec="libaom-av1"; pixfmt="yuv420p";  fmt="mp4";  stacked=no  ;; # Video/MP4/AV1  RGB   1920x1080
    *.smp4  ) codec="libaom-av1"; pixfmt="yuv420p";  fmt="mp4";  stacked=yes ;; # Video/MP4/AV1  RGB+A 1920x2160
    *       ) echo "$0: ERROR: unknown output file extension"; exit 1 ;;
esac

echo "++ converting images to 1920x1080 video"
echo "-- input1: $image1"
echo "-- input2: $image2"
echo "-- output: $video (codec: $codec, pixfmt: $pixfmt, fmt: $fmt, stacked: $stacked)"

filter="[0:v][1:v]xfade=transition=$transition:offset=$(($show / 2)):duration=$fade,format=yuva420p[v1]; \
    [v1][0:v]xfade=transition=$transition:offset=$(($show / 2 + $fade + $show)):duration=$fade,format=yuva420p"
if [[ $stacked == "yes" ]]; then
    filter="$filter [main]; \
        [main]split[main][alpha]; \
        [alpha]alphaextract[alpha]; \
        [main][alpha]vstack[v]"
else
    filter="$filter [v]"
fi

ffmpeg \
    -hide_banner \
    -framerate "$fps" -loop 1 -t "$total" -i "$image1" \
    -framerate "$fps" -loop 1 -t "$total" -i "$image2" \
    -t "$total" \
    -filter_complex "$filter" \
    -map "[v]" \
    -c:v $codec \
    -an \
    -pix_fmt $pixfmt \
    -deadline realtime \
    -cpu-used 4 \
    -crf 23 \
    -b:v 4000k \
    -auto-alt-ref 0 \
    -f $fmt \
    -y \
    "$video"

