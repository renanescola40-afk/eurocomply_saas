#!/usr/bin/env bash
set -euo pipefail

# GitHub-hosted Ubuntu runners may ship a third-party Google Chrome apt source.
# That source is not required for Playwright's bundled Chromium, but if its
# metadata is temporarily inconsistent it can make `apt-get update` fail inside
# `playwright install --with-deps` before any E2E test executes.
#
# Keep the E2E gate fail-closed: on GitHub Actions only, disable that unrelated
# third-party source in the ephemeral runner, refresh apt metadata, then let
# Playwright install Chromium and all required system dependencies normally.
# Any Playwright/browser/dependency failure still exits non-zero.

if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  disabled_any=false
  for source in \
    /etc/apt/sources.list.d/google-chrome.list \
    /etc/apt/sources.list.d/google-chrome.sources; do
    if [[ -f "$source" ]]; then
      echo "Disabling unrelated Google Chrome apt source for Playwright CI: $source"
      sudo mv "$source" "${source}.playwright-disabled"
      disabled_any=true
    fi
  done

  # Some hosted Ubuntu 24.04 images route their signed Ubuntu APT feeds
  # through azure.archive.ubuntu.com. When DNS for that mirror fails, Chromium
  # system dependencies cannot be downloaded and E2E never even starts.
  # Switch ONLY that ephemeral runner mirror to Canonical's public Ubuntu
  # archive; do not disable signature checks or skip any required dependency.
  mirror_modified=false
  for apt_source in \
    /etc/apt/apt-mirrors.txt \
    /etc/apt/sources.list \
    /etc/apt/sources.list.d/ubuntu.sources; do
    if [[ -f "$apt_source" ]] && sudo grep -Fq 'azure.archive.ubuntu.com' "$apt_source"; then
      echo "Using signed official Ubuntu archive for Playwright apt dependencies: $apt_source"
      sudo sed -i -E \
        's#https?://azure[.]archive[.]ubuntu[.]com/ubuntu/?#https://archive.ubuntu.com/ubuntu/#g' \
        "$apt_source"
      mirror_modified=true
    fi
  done

  if [[ "$disabled_any" == "true" || "$mirror_modified" == "true" ]]; then
    # Refresh repository indexes after an ephemeral source change; an offline
    # or invalid official Ubuntu mirror still makes install --with-deps FAIL.
    sudo rm -rf /var/lib/apt/lists/*
    sudo mkdir -p /var/lib/apt/lists/partial
  fi
fi

npx playwright install --with-deps chromium
