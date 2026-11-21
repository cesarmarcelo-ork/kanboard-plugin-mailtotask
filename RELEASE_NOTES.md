# MailToTask 1.0.1

Bug-fix release for Kanboard 1.2.50 and newer.

- Fix the PHP warning `Undefined variable $title` in Kanboard's `app/Template/layout.php` when opening the MailToTask import page.
- Pass the project name as the Kanboard layout title and a localized browser page title (`pt_BR` / `en_US`).
- Preserve the English page heading **Email to task** and the Portuguese page heading **e-mail para cartão**.
- Keep the existing message parsing, attachments, StatusReport integration, access controls and other behavior unchanged.
- Add a regression smoke test for both supported languages.

**Compatibility:** Kanboard 1.2.50 and newer. Functional validation of the fix on Kanboard 1.2.50 is required before publishing this release.

The previous MailToTask 1.0.0 release remains available for historical reference.
