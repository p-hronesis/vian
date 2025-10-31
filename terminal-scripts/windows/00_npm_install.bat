@echo off
cd /d %~dp0
cd ..\..
echo Running npm install...
npm install && echo Terminal will remain open. Close this window manually when done. && pause