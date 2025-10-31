@echo off
cd /d %~dp0
cd ..\..
echo Deploying to Hardhat network...
npx hardhat run scripts/deploy.js --network hardhat && echo Terminal will remain open. Close this window manually when done. && pause