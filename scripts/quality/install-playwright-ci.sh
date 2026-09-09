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

  if [[ "$disabled_any" == "true" ]]; then
    # Remove metadata fetched from the now-disabled source so Playwright's
    # dependency installer gets a clean apt index from the remaining sources.
    sudo rm -rf /var/lib/apt/lists/*
    sudo mkdir -p /var/lib/apt/lists/partial
  fi
fi

npx playwright install --with-deps chromium
