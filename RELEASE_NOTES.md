# MailToTask 1.0.0

First public release of **MailToTask**, an OrkFlowTech Kanboard plugin for importing Microsoft Outlook/Exchange messages (`.msg` and `.eml`) into tasks.

- Original message and extracted attachments stored with the Kanboard task
- Optional initial Current Status integrated with StatusReport
- Manual, required task Objective
- Portuguese (Brazil) and English (US) interfaces
- Kanboard native project menu: envelope icon and **e-mail**
- Limits: 20 MiB per source message; up to 20 MiB of extracted attachments in total
- MIT license (copyright OrkFlowTech), including the reused email-parser copies

**Installation:** download `MailToTask-1.0.0.zip`, which contains the `MailToTask/` directory. Extract to the Kanboard `plugins/` directory or install from the official plugin directory once its catalog pull request is accepted.

**Compatibility:** declared Kanboard 1.2.50 and above. Functional testing was reported successful by the plugin owner on a Kanboard homelab using Kanboard 1.2.57.

The plugin imports saved Outlook message files. Direct mailbox integration, Microsoft Graph synchronization, and dragging Outlook application items that do not expose a file are not included.
