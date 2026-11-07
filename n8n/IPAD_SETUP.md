# iPad-first n8n setup for SCOTTY

**Status:** instructions only. No account, n8n Cloud trial, paid plan, hosting, Cloudflare Worker, production service or secret has been created by this document. SCOTTY n8n bridge in this PR is a **draft**, disabled by default, with **read-only** roster and routing previews.

## Two choices

### A. Only your iPad available today (temporary free trial)
1. In Safari on iPad, open https://n8n.io/pricing/ and select the n8n Cloud free trial. As of Nov 6, 2026, the standard trial lasts **14 days**, and there is **no permanent free n8n Cloud plan**. Do not enter payment details or accept a subscription unless you want it.
2. Use Safari's **Request Desktop Website** if the editor layout is difficult. An iPad keyboard and pointing device can improve drag-and-drop editing. n8n's tablet editor experience may be limited.
3. Sign in to your trial, make a new empty workflow, and import either `n8n/workflows/scotty-roster-audit.json` or `n8n/workflows/scotty-plan-preview.json`. You can download the JSON from GitHub in Safari; in the n8n editor look for the workflow menu's **Import from File** option (menu wording may vary by version).
4. Both workflows are deliberately inactive. The HTTP Request nodes contain a placeholder Worker hostname. **They cannot run successfully until** a separate Cloudflare staging Worker is explicitly reviewed, deployed, the distinct N8N_BRIDGE_TOKEN secret is configured there, and the bridge feature flag is deliberately enabled. Do not copy an existing SCOTTY owner token or private data.
5. Before any cloud trial expires, export your workflows. Trial data may be deactivated/deleted after expiration and continued cloud access requires a paid plan.

### B. Free ongoing Community edition, controlled from your iPad
n8n must run somewhere other than iPadOS: for example, on your Lenovo with Docker. Once set up, the iPad is the everyday control interface.

1. On the Lenovo, install Docker Desktop (review Docker's use/license terms) and start the reviewed local compose file:
   `docker compose -f n8n/docker-compose.yml up -d`
2. On the Lenovo, visit `http://localhost:5678`, create a strong n8n owner account, and verify login. Do not forward TCP/5678 in your router; the Docker port is loopback-only.
3. Install Tailscale on **both** Lenovo and iPad, and sign into the same tailnet. Use Tailscale's Personal Free tier **only if your use qualifies**; business use may require different terms.
4. Configure **Tailscale Serve**, not Funnel, on Lenovo, to serve the existing `http://127.0.0.1:5678` loopback application via your tailnet's HTTPS address. Follow the current Tailscale Serve documentation because CLI syntax and UI can change:
   https://tailscale.com/docs/features/tailscale-serve
5. In the tailnet, enable the necessary HTTPS certificate / DNS support and restrict access to your devices. Harden n8n's reverse proxy settings, including trusted proxy hops, its externally visible editor base URL, HTTPS and secure cookie handling, before using the remote iPad endpoint. The base docker-compose.yml's `N8N_SECURE_COOKIE=false` is **local-only** and should **not** be used for the remote HTTPS setup. The external proxy configuration must be reviewed and tested before remote use.
6. Connect Tailscale on iPad; open the tailnet HTTPS address of the Lenovo in Safari and sign into n8n. The Lenovo must stay awake and online for the workflows to execute. Secure remote access does **not** mean the workflows run on the iPad.
7. Import the two workflows and carry out the **staging Worker approval and credential configuration** described in `n8n/README.md`. Keep them inactive until staging connectivity and security are verified.
8. Back up the Docker named volume and encryption material securely. Never paste tokens, Cloudflare secrets, recovery passphrases or raw client documents into GitHub, n8n workflow JSON exports, public URLs or chat.

## Important limitations

- The existing n8n bridge is READ-ONLY and its Cloudflare staging Worker has not been deployed.
- n8n Cloud trial is not a permanent free alternative to self-hosting. During a Cloud trial, n8n's public REST API is unavailable, though workflows can still use supported HTTP Request nodes.
- Self-hosting n8n does not automatically give you free AI inference or free always-on hardware.
- n8n's editor is primarily desktop-oriented; your iPad can operate it in a browser, but drag/zoom interaction can be less convenient than on a computer.
- Never use Tailscale Funnel or public port forwarding to expose this staging n8n editor without a separate security design.
- This workflow bridge must not be merged or promoted to production until the owner approves and its project permission model, memory privacy, authentication, backup recovery, and staging end-to-end tests are complete.

Official references:
- https://docs.n8n.io/get-started/choose-how-to-use-n8n/
- https://n8n.io/pricing/
- https://support.n8n.io/article/how-do-i-cancel-my-trial
- https://tailscale.com/docs/features/tailscale-serve
- https://tailscale.com/pricing
