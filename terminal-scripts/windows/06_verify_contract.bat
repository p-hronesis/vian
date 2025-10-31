@echo off
cd /d %~dp0
cd ..\..
echo Verifying contract on Mainnet...
echo Remember to edit this file and replace CONTRACT_ADDRESS_PLACEHOLDER in the next line with the actual contract address to verify
npx hardhat verify --network mainnet CONTRACT_ADDRESS_PLACEHOLDER && echo Terminal will remain open. Close this window manually when done. && pause