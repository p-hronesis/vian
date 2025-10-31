@echo off
cd /d %~dp0
cd ..\..
echo Running Hardhat tests with gas reporting...
REPORT_GAS=true npx hardhat test  && echo Terminal will remain open. Close this window manually when done. && pause