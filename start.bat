@echo off
cd /d %~dp0
start "" http://localhost:8321/
python -m http.server 8321
