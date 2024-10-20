@echo off
title Studio-Canvas-Server
"c:\Program Files\nodejs\node.exe" ^
    .\dst\server\index.mjs ^
    -v 2 ^
    -a 0.0.0.0 -p 12345 ^
    -A 0.0.0.0 -P 5555 ^
    -C 10.0.0.10:CAM1 ^
    -C 10.0.0.11:CAM2 ^
    -C 10.0.0.12:CAM3 ^
    -C 10.0.0.13:CAM4
