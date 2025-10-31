tell application "Terminal"
    activate
    do script "cd \"$(dirname \"$0\")\" && cd ../.. && npx hardhat run scripts/deploy.js --network mainnet; echo 'Press Ctrl+C to close this terminal'; exec bash"
end tell