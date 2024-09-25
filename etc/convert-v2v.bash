#!/usr/bin/env bash
##
##  convert-v2v.bash -- convert video to video
##

LANG=en_US.UTF-8

if [[ $# -ne 5 ]]; then
    echo "USAGE:  bash convert-v2v.bash <input>.* <output>.webm" 2>&1
    echo "SAMPLE: bash convert-v2v.bash foo.mp4 foo.webm" 2>&1
    exit 1
fi

input="$1"
output="$2"

fps="30"

codec=""; pixfmt=""; fmt=""; stacked=no
case "$output" in
    *.webm  ) codec="libvpx";     pixfmt="yuva420p"; fmt="webm"; stacked=no  ;; # Video/WebM/VP8 RGBA  1920x1080
    *.swebm ) codec="libvpx";     pixfmt="yuv420p";  fmt="webm"; stacked=yes ;; # Video/WebM/VP8 RGB+A 1920x2160
    *.mp4   ) codec="libaom-av1"; pixfmt="yuv420p";  fmt="mp4";  stacked=no  ;; # Video/MP4/AV1  RGB   1920x1080
    *.smp4  ) codec="libaom-av1"; pixfmt="yuv420p";  fmt="mp4";  stacked=yes ;; # Video/MP4/AV1  RGB+A 1920x2160
    *       ) echo "$0: ERROR: unknown output file extension"; exit 1 ;;
esac

echo "++ converting video to 1920x1080 target size"
echo "-- input:  $input"
echo "-- output: $output (codec: $codec, pixfmt: $pixfmt, fmt: $fmt, stacked: $stacked)"

ffmpeg \
    -hide_banner \
    -i "$input" \
    -vf "scale=1920:-2:flags=lanczos,fps=$fps" \
    -c:v $codec \
    -an \
    -pix_fmt $pixfmt \
    -crf 23 \
    -b:v 4000k \
    -auto-alt-ref 0 \
    -f $fmt \
    -y \
    "$output"

