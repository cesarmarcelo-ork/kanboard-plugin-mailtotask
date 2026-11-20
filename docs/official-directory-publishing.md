# Publishing MailToTask to the official Kanboard plugin directory

Source: https://github.com/kanboard/website#how-to-add-a-new-plugin-to-the-list

## Release gates (not yet cleared)
- [x] UI label in pt_BR: `e-mail para cartão`
- [x] UI label in en_US: `Email to task`
- [x] Remove experimental banner from the form
- [x] Static audit: 42 keys in pt_BR and en_US, no missing referenced keys
- [x] ZIP build instructions and GitHub Actions packaging setup
- [ ] Green, recent CI execution including the locale and archive checks (latest Actions runs have failed)
- [ ] Functional attachment and StatusReport tests on the Kanboard homelab
- [x] Authorize a public redistribution license (MIT) for the plugin and OrkFlowTech-derived email parser copies; original extension remains proprietary
- [x] GitHub repository is **public** (verified)
- [ ] Merge reviewed source to default branch and publish a versioned GitHub Release with `MailToTask/` at archive root
- [ ] Submit a PR to `kanboard/website` changing `plugins.json`

**Do not submit an entry with an inaccessible/private download URL.**

## Catalog entry draft

These values reflect the expected schema, but must not be submitted until the release ZIP is publicly downloadable and the license is agreed.

```json
{
  "MailToTask": {
    "author": "OrkFlowTech",
    "compatible_version": ">=1.2.50",
    "description": "Create Kanboard tasks from Outlook/Exchange .msg and .eml messages, preserving the original message and extracted attachments, with optional StatusReport integration and English/Portuguese interface.",
    "download": "REPLACE_WITH_VERSIONED_PUBLIC_GITHUB_RELEASE_ZIP_URL",
    "has_hooks": true,
    "has_overrides": false,
    "has_schema": false,
    "homepage": "https://github.com/cesarmarcelo-ork/kanboard-plugin-mailtotask",
    "is_type": "plugin",
    "last_updated": "2026-11-19",
    "license": "MIT",
    "readme": "https://github.com/cesarmarcelo-ork/kanboard-plugin-mailtotask/blob/main/README.md",
    "remote_install": true,
    "title": "MailToTask",
    "version": "0.4.0-rc2"
  }
}
```

Version and date should be updated to the actual public release. A GitHub branch/archive ZIP must not be used for remote installation, because it unpacks to the wrong folder.

## Build a suitable ZIP locally

```bash
bash scripts/build-release.sh
unzip -l dist/MailToTask-0.4.0-rc2.zip | head
```

The archive should start with `MailToTask/Plugin.php`, not with `kanboard-plugin-mailtotask-feature-attachments-20mb/`.
