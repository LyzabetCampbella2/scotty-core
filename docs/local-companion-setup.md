# Scotty local connections 28–35

Build support is available; account credentials, devices and physical installations remain for the final connection stage. No installation or pairing is performed automatically.

## Home Assistant hub (28)

Configure connector 2 later. Connector 28 allows a subset of its exact light, switch, scene and climate entity IDs. Enter connector 2's current revision. If hub credentials or entity scopes change, refresh connector 28's setup. The original Home Assistant relay carries local actions; a second relay is not needed. Physical effects remain unverified.

## Local companion (29, 32–35)

Use Python 3. The helper uses the standard library. Keep each provider's token and mapping separate. Pair its exact provider in Scotty Devices when ready, then set `SCOTTY_DEVICE_TOKEN` locally to the one-time token. Set `SCOTTY_ADDON_URL` only if using a different HTTPS Scotty origin.

Example command:

```sh
python scotty-local-companion.py --provider desktop --root /your/selected/root --allow Selected --mapping /your/local/desktop.json
```

Windows accepts an absolute Windows root instead. `--allow` is a comma-separated list of relative folders below the root; it must match Scotty Setup. Windows and Mac launching are supported; PDF printing requires CUPS on Mac/Linux. The helper never accepts command lines or arguments from a queued job.

Snapshots publish up to 30 selected files and 8 MB of supported selected-file bytes. Supported imports are PNG, JPEG, PDF, plain text, Markdown and JSON. Other files publish metadata only. Hidden directories, traversal and symlinks are refused. SHA-256 binds each import, print job and render to the version you reviewed. Browse timestamps identify stale device snapshots.

Use a narrowly selected root and folder; selected snapshots upload those files to your Scotty server. Pairing alone does not run the helper. Jobs expire, have one claim, and are not replayed. A device report is not independent physical or provider verification.

### Desktop (33)

Desktop mapping example:

```json
{"apps":{"editor":"C:/Program Files/YourEditor/editor.exe"}}
```

On Mac, map an alias to an absolute `.app` bundle or executable. On Windows, map to an `.exe` file. Use the exact alias in Scotty's allowed application list. The helper starts only this fixed executable, without job-provided arguments. Process startup does not verify app readiness.

### Printers and selected scans (32)

```json
{"printers":["Your_CUPS_Printer"],"lp":"/usr/bin/lp"}
```

Run with `--provider printscan`, a selected root and scan folder. Use the same exact CUPS printer names in Scotty Setup. Reviewed PDF printing allows 1–5 copies. The helper prints an immutable temporary copy of the checksum-matched PDF and records CUPS acceptance, not physical printing. Use your existing scanner app to capture a PNG, JPEG or PDF in the selected folder, browse its snapshot, and approve its import. Scanner capture itself and Windows printing are not implemented.

### Blender (34)

```json
{"blender":"/absolute/path/to/blender"}
```

Run with `--provider blender` and selected scene folders. Windows uses an absolute `blender.exe` path. Pack external resources into the `.blend` scene before review. Scenes above 64 MB are excluded. Select an exact scene checksum and one frame from 1–100000.

The helper renders a checksum-matched copy with automatic scripts disabled, saving PNG output beneath `.scotty-renders/<unique-job>/` inside the selected root. Relative external assets are not copied. Startup is reported immediately; Browse snapshots later show `running`, `completed` or `error`. Completion requires a successful exit and a PNG output. Restarting the helper loses in-memory process monitoring; verify output locally before another approval. Rendered PNGs are kept locally; they are not automatically uploaded or published.

### Raspberry Pi / ESP32 (29)

Local mapping:

```json
{
  "outputs":{
    "status_led":{"url":"http://YOUR_ESP32_LAN_ADDRESS:8080/output","values":["0","1"],"tokenEnv":"SCOTTY_HARDWARE_TOKEN"}
  },
  "sensorFiles":{"temperature":"/your/selected/temperature.txt"}
}
```

Run the companion on a Raspberry Pi or computer with `--provider hardware`. Configure the same output and sensor names in Scotty. The local mapping restricts each output to its fixed endpoint and exact allowed values. Sensor files contain small readings from your own local sensor software.

The supplied `scotty-esp32-bridge.py` runs under MicroPython on an ESP32. It controls one configured GPIO LED output using values `0` and `1`. Install it yourself at the final setup stage. Put a local `hardware-config.json` beside it containing `ssid`, `wifiPassword`, a random `token` of at least 24 characters, the board-appropriate `pin`, and `outputId`. Set the same token in the computer's `SCOTTY_HARDWARE_TOKEN` environment variable. Wi-Fi credentials and the local hardware token are never uploaded to Scotty. This is a LAN-only endpoint; do not port-forward it. Other sensors, physical buttons and displays need their own compatible local driver or endpoint.

### Manuscript-forensics selected exports (35)

The bridge uses an explicit JSON export, not a direct live connection to the manuscript app. Export selected summaries in this shape:

```json
{"projects":[{"id":"YOUR_EXACT_PROJECT_ID","title":"Manuscript title","chapterProgress":"4/20 chapters","reportStatus":"Review ready"}]}
```

Local mapping:

```json
{"projects":["YOUR_EXACT_PROJECT_ID"]}
```

Run:

```sh
python scotty-local-companion.py --provider manuscript --mapping /your/local/manuscript.json --export /your/selected/project-export.json
```

Use the same project IDs in Scotty Setup. Exports are limited to 1 MB and 30 selected project summaries. Browse the reported progress/status and approve a checksum-bound import to save a summary copy in Files & Projects. It does not change manuscript chapters, edit reports or connect directly to the manuscript app.

## NFC tags and Stream Deck (30–31)

Register tag/button IDs and exact project or workflow recipe IDs in Scotty Setup:

```json
[{"id":"writing","name":"Writing project","kind":"project","targetId":"YOUR_EXACT_PROJECT_ID"}]
```

Use `kind: "recipe"` for a saved workflow recipe. Browse `triggers` to get the exact HTTPS URL. Write it to an NFC tag, Apple Shortcut Open URL action, or Stream Deck Website button. It opens Scotty and provides an Open Registered Tag / Button control after owner login. This opens the exact project or recipe review; it never creates a recipe run, sends a message or approves an external action automatically.
