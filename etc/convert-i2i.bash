#!/usr/bin/env bash
##
##  convert-i2i.bash -- convert image to image
##

if [[ $# -ne 2 ]]; then
    echo "USAGE:  bash convert-i2i.bash <image1>.png <image2>.png" 2>&1
    echo "SAMPLE: bash convert-i2i.bash foo1.png foo2.png" 2>&1
    exit 1
fi

input="$1"
output="$2"

echo "++ converting image to 1920x1080 target size"
echo "-- input:  $input"
echo "-- output: $output"

convert \
     -geometry 1920x1080 \
     "$input" \
     "$output"

