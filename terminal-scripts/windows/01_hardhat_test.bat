@echo off
cd /d %~dp0
cd ..\..
echo Running Hardhat tests...
npx hardhat test && echo Terminal will remain open. Close this window manually when done. && pause