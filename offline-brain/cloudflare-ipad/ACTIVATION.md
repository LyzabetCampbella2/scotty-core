# Dedicated lab activation

The owner created scotty-brain-memory (2da492e2-84fe-43a1-9afe-66b81300def1). Wrangler binds it as BRAIN_DB and enables AI for authenticated, explicitly approved requests. The preflight allows only this exact database, with no extra database options or bindings. Runtime readiness still blocks inference and memory writes until the schema and installation identity match.

In this database's Cloudflare Console, execute memory-schema.sql from this directory. It creates brain_notes, brain_missions, and the lab installation marker without deleting existing rows. Never run this schema against another project's database.

After a successful lab build, open the workers.dev lab, enter the privately saved owner token, and select Activation Status. Expect persistent memory and AI ready. Save an approved non-sensitive test note, reload and read it back. Run a one-department Team assignment about backend engineering with all three consent boxes checked. Expect specialist, chief, and SCOTTY findings, three AI calls, and a saved mission. Reload and check saved missions. This live acceptance test is pending; local tests use simulated AI with real SQLite.

No owner token belongs in GitHub. No production database or paid fallback is connected. Build settings retain the owner's Workers Free confirmation and SKIP_DEPENDENCY_INSTALL=1. The source AI switch supersedes earlier default-off staging documentation; set it to false to disable inference.
