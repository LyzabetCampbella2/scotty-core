"""Synthetic schema checks for optional SCOTTY isolated D1 migration.
Run with python3 offline-brain/cloudflare-ipad/activepieces-review-schema.test.py.
Never open a real database or apply a migration.
"""
import pathlib
import sqlite3
import unittest

DDL = pathlib.Path(__file__).with_name('activepieces-review-ledger-v1.sql').read_text()

class MigrationTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.executescript(DDL)
        self.db.execute("PRAGMA foreign_keys=ON")
        self.base = ('review-0001','owner-demo-0001','eirden-atelier','demo-mission-0001','r1',
            'a'*64,'["agent-geordi-02"]','demo-request-0001',
            'mission.preview','pending','2026-11-07T03:00:00Z',
            '2026-11-07T03:00:00Z','2026-11-07T04:00:00Z',None,1)
        self.sql = "INSERT INTO scotty_activepieces_review_requests_v1 VALUES ("+','.join('?'*len(self.base))+")"

    def tearDown(self):
        self.db.close()

    def test_migration_additive_idempotent(self):
        self.db.executescript(DDL)
        tabs = {r[0] for r in self.db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertIn('scotty_activepieces_review_requests_v1',tabs)
        self.assertIn('scotty_activepieces_review_audit_v1',tabs)
        self.assertNotIn('brain_notes',tabs)

    def test_unique_and_invalid_state_rejected(self):
        self.db.execute(self.sql,self.base)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(self.sql,('review-0002',*self.base[1:]))
        wrong=list(self.base)
        wrong[0]='review-0003';wrong[7]='other-request';wrong[9]='executing'
        with self.assertRaises(sqlite3.IntegrityError):self.db.execute(self.sql,wrong)

    def test_no_pending_decision_or_wrong_scope_or_digest(self):
        for col,bad in [(13,'2026-11-07T03:02:00Z'),(8,'mission.execute'),(5,'not-a-digest')]:
            row=list(self.base);row[col]=bad
            with self.assertRaises(sqlite3.IntegrityError):
                self.db.execute(self.sql,row)

    def test_audit_requires_auth_owner_and_registered_request(self):
        self.db.execute(self.sql,self.base)
        cmd="INSERT INTO scotty_activepieces_review_audit_v1 VALUES (?,?,?,?,?,?,?,?,?,?)"
        args=['event-0001','review-0001','owner-demo-0001','authenticated-owner',
          'created',None,'pending','r1','a'*64,'2026-11-07T03:00:00Z']
        self.db.execute(cmd,args)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(cmd,['event-0002','does-not-exist',*args[2:]])
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(cmd,['event-0003','review-0001','owner-demo-0001','activepieces-workflow',*args[4:]])

    def test_tables_do_not_contain_private_notes(self):
        columns=[]
        for table in ('scotty_activepieces_review_requests_v1','scotty_activepieces_review_audit_v1'):
            columns += [row[1] for row in self.db.execute(f"PRAGMA table_info({table})")]
        for forbidden in ('prompt','content','memory','secret','api_key','client_document','token'):
            self.assertNotIn(forbidden,columns)

if __name__ == "__main__":
    unittest.main()
