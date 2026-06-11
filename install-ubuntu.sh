#!/usr/bin/env bash
set -e

sudo apt update
sudo apt install -y curl ca-certificates gnupg

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node -v
npm -v
