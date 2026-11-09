#!/usr/bin/env bash
# SCOTTY PHASE 0: Disposable PostgreSQL backup / restore acceptance ONLY.
# No persistent media, shared staging, production data or external destinations.
set -euo pipefail
if [[ "${P5_CI_DISPOSABLE_POSTGRES:-}" != "YES_EXACT_LOOPBACK_FIXTURE" || $# -ne 1 ]]; then
 echo "Refusing recovery test without disposable CI opt-in and container ID" >&2
 exit 2
fi
container="$1"
if [[ ! "$container" =~ ^[a-f0-9]{12,64}$ ]]; then
 echo "Invalid CI service container ID" >&2
 exit 2
fi
admin=scotty_p5_admin
source_db=scotty_phase5_synthetic_test
restore_db=scotty_phase5_restore_test
archive=/tmp/scotty_p5_disposable_recovery.dump
pg() {
 docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -At -U "$admin" "$@"
}
source_name="$(pg -d "$source_db" -c 'select current_database()')"
if [[ "$source_name" != "$source_db" ]]; then echo "Wrong source database" >&2; exit 2; fi
before="$(pg -d "$restore_db" -c 'select current_database()' 2>/dev/null || true)"
if [[ -n "$before" ]]; then echo "Restore DB already exists; refusing overwrite" >&2; exit 2; fi

docker exec "$container" pg_dump -U "$admin" -d "$source_db" -Fc -f "$archive"
archive_bytes="$(docker exec "$container" stat -c %s "$archive")"
if (( archive_bytes < 1000 )); then echo "Backup unexpectedly empty" >&2; exit 3; fi
docker exec "$container" createdb -U "$admin" "$restore_db"
docker exec "$container" pg_restore -U "$admin" -d "$restore_db" --exit-on-error --no-owner --no-privileges "$archive"

# Compare complete content snapshots (counts + canonical JSON digests), rather
# than trusting backup success or table existence alone. No raw data is printed.
tables=(
 scotty_p5_synthetic_grants
 scotty_p5_synthetic_nonce_claims
 scotty_p5_synthetic_audit
 scotty_p5_synthetic_denial_audit
 scotty_p5_synthetic_memory_items
 scotty_p5_synthetic_memory_identity_acl
 scotty_p5_synthetic_emergency_stop
)
orders=(
 grant_id
 'grant_id,nonce'
 event_id
 event_id
 memory_id
 'login_name,project_id,agent_id'
 scope
)
for i in "${!tables[@]}"; do
 table="${tables[$i]}"
 order="${orders[$i]}"
 query="select count(*)::text||':'||coalesce(md5(string_agg(to_jsonb(t)::text,',' order by $order)),md5('')) from $table t"
 original="$(pg -d "$source_db" -c "$query")"
 recovered="$(pg -d "$restore_db" -c "$query")"
 if [[ "$original" != "$recovered" ]]; then
  echo "Recovery mismatch in $table" >&2
  exit 4
 fi
 echo "RESTORE VERIFIED: $table (count and canonical digest match)"
done
rows="$(pg -d "$restore_db" -c "select count(*) from scotty_p5_synthetic_memory_items")"
if [[ "$rows" != '4' ]]; then echo "Unexpected synthetic memory fixture count" >&2; exit 4; fi
stop_state="$(pg -d "$restore_db" -c "select stopped from scotty_p5_synthetic_emergency_stop where scope='synthetic'")"
if [[ "$stop_state" != 't' ]]; then echo "Recovery missing default stopped state" >&2; exit 4; fi
rls="$(pg -d "$restore_db" -c "select relrowsecurity::text||':'||relforcerowsecurity::text from pg_class where oid='public.scotty_p5_synthetic_memory_items'::regclass")"
if [[ "$rls" != 'true:true' ]]; then echo "Restored memory RLS FORCE settings missing" >&2; exit 4; fi
policy_count="$(pg -d "$restore_db" -c "select count(*) from pg_policies where tablename='scotty_p5_synthetic_memory_items'")"
if [[ "$policy_count" != '1' ]]; then echo "Restored RLS read policy missing" >&2; exit 4; fi
echo "RECOVERY ACCEPTANCE: disposable archive roundtrip passed; synthetic emergency stop remained active and RLS enabled."
# No production or shared environment was connected. The ephemeral CI service
# and restored test database are destroyed with the GitHub Actions runner.
