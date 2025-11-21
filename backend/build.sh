#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Install ffmpeg using apt-get (for Debian-based systems on Render)
apt-get update
apt-get install -y ffmpeg
