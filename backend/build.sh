#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Note: ffmpeg is installed via Render native environment
# If needed, add via Render dashboard: Native Environment > ffmpeg
