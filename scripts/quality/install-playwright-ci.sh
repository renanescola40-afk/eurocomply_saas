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

# E2E-only jobs use the official version-pinned Playwright image, which
# already provides Chromium plus all OS packages. Validate the exact package
# version, preinstalled executable and a real browser launch; never treat an
# environment variable alone as proof that the required E2E is runnable.
# Other hosts keep the apt --with-deps installation path below (fail closed).
if [[ -n "${PLAYWRIGHT_PREINSTALLED_IMAGE_VERSION:-}" ]]; then
  test "${PLAYWRIGHT_BROWSERS_PATH:-}" = "/ms-playwright"
  node --input-type=module <<'NODE'
import fs from 'node:fs';
import { chromium } from '@playwright/test';
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const pinned = lock.packages?.['node_modules/@playwright/test']?.version;
if (pinned !== process.env.PLAYWRIGHT_PREINSTALLED_IMAGE_VERSION) {
  throw new Error('playwright_image_version_mismatch');
}
const executable = chromium.executablePath();
if (!executable.startsWith('/ms-playwright/') || !fs.existsSync(executable)) {
  throw new Error('pinned_playwright_browser_missing');
}
const browser = await chromium.launch({ headless: true });
await browser.close();
console.log('Preinstalled exact-version Chromium launched successfully; mandatory E2E stays enabled');
NODE
  exit 0
fi

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
