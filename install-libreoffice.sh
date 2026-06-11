#!/usr/bin/env bash
set -e

sudo apt update
sudo apt install -y libreoffice-core libreoffice-writer libreoffice-common libreoffice-java-common

libreoffice --version
