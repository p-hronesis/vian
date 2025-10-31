@echo off
cd /d %~dp0
cd ..\..
echo Deploying to Mainnet...
npx hardhat run scripts/deploy.js --network mainnet && echo Terminal will remain open. Close this window manually when done. && pause