tell application "Terminal"
    activate
    do script "echo 'Remember to edit this file and replace CONTRACT_ADDRESS_PLACEHOLDER  in the next line with the actual contract address to verify'; cd \"$(dirname \"$0\")\" && cd ../.. && npx hardhat verify --network mainnet CONTRACT_ADDRESS_PLACEHOLDER; echo 'Press Ctrl+C to close this terminal'; exec bash"
end tell