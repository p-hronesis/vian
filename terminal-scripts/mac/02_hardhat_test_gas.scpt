tell application "Terminal"
    activate
    do script "cd \"$(dirname \"$0\")\" && cd ../.. && REPORT_GAS=true npx hardhat test; echo 'Press Ctrl+C to close this terminal'; exec bash"
end tell