# Scotty connection roadmap

Account authorization, credentials, bot installation and companion/device pairing are deliberately deferred until the final connection stage. Implemented adapters are not connected accounts. Writes use the existing exact-preview, read-back and approval flow. Device results remain explicitly device-reported.

| # | Connection | Build status |
|---|---|---|
| 1 | Apple Shortcuts & Siri | Adapter and bridge instructions built |
| 2 | Home Assistant | Adapter and local relay built |
| 3 | Notion | Adapter built |
| 4 | Todoist | Adapter built |
| 5 | Spotify | Adapter and OAuth built |
| 6 | Eirden Atelier Wix site | Adapter built |
| 7 | Google Docs & Sheets | Adapter and OAuth built |
| 8 | Outlook | Adapter and OAuth built |
| 9 | OneDrive & Microsoft 365 | Read/import adapter and OAuth built |
| 10 | Apple Reminders & Calendar | Device bridge support built |
| 11 | Google Photos | Selected-media picker and OAuth built |
| 12 | Apple Photos | Explicit device picker import built |
| 13 | Canva | Design/asset/export adapters and OAuth built |
| 14 | Figma | File/reference and node export adapters built |
| 15 | Obsidian | Scoped local companion built |
| 16 | Zotero | Reference read/import adapter built |
| 17 | Anki | Reviewed Basic-card local companion built |
| 18 | Canvas LMS | School-authorized, read-only course/assignment adapter built |
| 19 | Discord | Bot read/approved-message adapter built |
| 20 | WhatsApp Business | Allowlisted approved static-template adapter built |
| 21 | Zoom | Scheduled-meeting and recording-metadata adapter built |
| 22 | YouTube | Channel read and reviewed private MP4 upload adapter built |
| 23 | Pinterest | Allowed-board read and reviewed image-pin adapter built |
| 24 | Airtable | Scoped record read/create adapter built |
| 25 | Trello | Allowed-board read/card/comment adapter built |
| 26 | Stripe | Restricted-key read-only invoice/payment/balance adapter built |
| 27 | Square | Scoped read-only order/invoice/payment adapter built |
| 28 | Smart lights, plugs & thermostats | Planned |
| 29 | Raspberry Pi & ESP32 devices | Planned |
| 30 | NFC tags | Planned |
| 31 | Stream Deck or programmable buttons | Planned |
| 32 | Printers & scanners | Planned |
| 33 | Windows or Mac companion app | Planned |
| 34 | Blender desktop companion | Planned |
| 35 | Manuscript-forensics app | Planned |

The current local study companion is `scripts/scotty-study-companion.py`. It requires a restricted device pairing token and explicit local folder/deck allowlists. It does not install AnkiConnect, expose the vault publicly, replay expired jobs, or execute arbitrary shell commands.
