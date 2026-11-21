# MailToTask 1.0.1

Bug-fix release for Kanboard 1.2.50 and newer.

- Fix the PHP warning `Undefined variable $title` in Kanboard's `app/Template/layout.php` when opening the MailToTask import page.
- Pass the project name as the Kanboard layout title and a localized browser page title (`pt_BR` / `en_US`).
- Preserve the English page heading **Email to task** and the Portuguese page heading **e-mail para cartão**.
- Keep the existing message parsing, attachments, StatusReport integration, access controls and other behavior unchanged.
- Add a regression smoke test for both supported languages.

- Document optional integration with [StatusReport](https://github.com/cesarmarcelo-ork/kanboard-plugin-statusreport) and [VisibleDescription](https://github.com/MarcosBL/VisibleDescription) without adding plugin dependencies.

**Compatibility:** Kanboard 1.2.50 and newer. The maintainer reports acceptance tests on Kanboard 1.2.50 (notebook) and previously on Kanboard 1.2.57 (homelab).

The previous MailToTask 1.0.0 release remains available for historical reference.
