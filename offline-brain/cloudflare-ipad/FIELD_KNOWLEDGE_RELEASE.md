# Field foundations and scoped retrieval

`field-foundations-v1` supplies authored starter instruction to 185 roster profiles plus SCOTTY. Each department has a foundational distinction, a procedure and a synthetic worked example. Specialists receive their specialty focus; chiefs receive review guidance; SCOTTY receives synthesis guidance. This is 25 department foundations adapted to profiles, not 185 independently researched knowledge bases or separately trained models. Further-reading links do not imply external validation.

Both team inference and single-agent inference receive the guide. Catalog brain profiles expose it for inspection. Team results record the guide ID and version. Public health exposes only the version, not owner data.

## Retrieval contract

| Reader | Individual | Department | Shared |
| --- | --- | --- | --- |
| Specialist | Own notes | Its chief's department | Canonical shared notes |
| Chief | Own notes | Own department | Canonical shared notes |
| SCOTTY | Own notes | None directly | Canonical shared notes |

Each scope reserves up to four notes, ordered by review date and ID. Expired and future-reviewed notes are excluded. Shared records must use the canonical shared owner. Individual notes are not directly retrieved for other agents. Chief and SCOTTY prompts still receive generated handoff findings; this contract does not promise that a model cannot quote its input in those findings. Existing owner review remains required to save knowledge. No schema migration or automatic promotion of generated answers is introduced.

## Evidence and remaining checks

The suite uses real SQLite SQL with a D1-compatible adapter. It verifies all 186 readers, invalid/expired/future records, shared-note flooding, and 160 specialist workflows (480 mocked model calls). Every stage must receive exactly its allowed references and the correct guide. API tests check the single-agent guide and public version.

These tests prove retrieval and prompt delivery, not professional expertise or answer quality. Live D1 readback and model evaluations across the departments remain separate acceptance checks. No paid model calls or production memory mutations are required by this suite.
