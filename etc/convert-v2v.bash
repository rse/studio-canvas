#!/usr/bin/env bash
##
##  convert-v2v.bash -- convert video to video
##

LANG=en_US.UTF-8

if [[ $# -ne 2 ]]; then
    echo "USAGE:  bash convert-v2v.bash <input> <output>" 2>&1
    echo "SAMPLE: bash convert-v2v.bash foo.mp4 foo.smp4" 2>&1
    exit 1
fi

input="$1"
output="$2"

crf="23"
bitrate="4000k"
fps="30"

codec=""; pixfmt=""; fmt=""; stacked=no
case "$output" in
    *.webm  ) codec="libvpx";  pixfmt="yuva420p"; fmt="webm"; stacked=no  ;; # Video/WebM/VP8  RGBA  1920x1080
    *.swebm ) codec="libvpx";  pixfmt="yuv420p";  fmt="webm"; stacked=yes ;; # Video/WebM/VP8  RGB+A 1920x2160
    *.mp4   ) codec="libx264"; pixfmt="yuv420p";  fmt="mp4";  stacked=no  ;; # Video/MP4/H.264 RGB   1920x1080
    *.smp4  ) codec="libx264"; pixfmt="yuv420p";  fmt="mp4";  stacked=yes ;; # Video/MP4/H.264 RGB+A 1920x2160
    *       ) echo "$0: ERROR: unknown output file extension"; exit 1 ;;
esac
options1=""
options2=""
case "$codec" in
    libvpx  ) options2="-auto-alt-ref 0"  ;;
    libx264 ) options2="-preset medium -vprofile main -tune fastdecode -movflags +faststart" ;;
esac
case "$input" in
    *.webm  ) options1="-vcodec libvpx" ;; # force yuva420p on input for alphaextract
esac

echo "++ converting video to 1920x1080 target size"
echo "-- input:  $input"
echo "-- output: $output (codec: $codec, pixfmt: $pixfmt, fmt: $fmt, stacked: $stacked)"

filter="[0:v]format=yuva420p"
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
    $options1 \
    -i "$input" \
    -filter_complex "$filter" \
    -map "[v]" \
    -c:v $codec \
    -an \
    -pix_fmt $pixfmt \
    -crf $crf \
    -b:v $bitrate \
    $options2 \
    -f $fmt \
    -y \
    "$output"

