-- PostgreSQL Row-Level Security (RLS) Policies for Multi-Tenant RRSL Laboratory Data Isolation
-- Conforms to OIML R-76, WELMEC 7.2, and NABL 129 Statutory Metrological Integrity

-- 1. Operational Table: test_sessions
-- Direct tenant column: laboratory_id
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rrsl_tenant_isolation ON test_sessions;
CREATE POLICY rrsl_tenant_isolation ON test_sessions
  FOR ALL TO public
  USING (
    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL
    OR current_setting('app.bypass_rls', true) = 'true'
    OR laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL
    OR current_setting('app.bypass_rls', true) = 'true'
    OR laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID
  );

-- 2. Operational Table: reference_standards
-- Direct tenant column: laboratory_id
ALTER TABLE reference_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_standards FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rrsl_tenant_isolation ON reference_standards;
CREATE POLICY rrsl_tenant_isolation ON reference_standards
  FOR ALL TO public
  USING (
    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL
    OR current_setting('app.bypass_rls', true) = 'true'
    OR laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL
    OR current_setting('app.bypass_rls', true) = 'true'
    OR laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID
  );

-- 3. Operational Table: raw_observations
-- Scoped via parent test_sessions(laboratory_id)
ALTER TABLE raw_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_observations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rrsl_tenant_isolation ON raw_observations;
CREATE POLICY rrsl_tenant_isolation ON raw_observations
  FOR ALL TO public
  USING (
    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL
    OR current_setting('app.bypass_rls', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM test_sessions ts
      WHERE ts.id = raw_observations.test_session_id
        AND ts.laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID
    )
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL
    OR current_setting('app.bypass_rls', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM test_sessions ts
      WHERE ts.id = raw_observations.test_session_id
        AND ts.laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID
    )
  );

-- 4. Operational Table: evidence_attachments
-- Scoped via parent test_sessions(laboratory_id)
ALTER TABLE evidence_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_attachments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rrsl_tenant_isolation ON evidence_attachments;
CREATE POLICY rrsl_tenant_isolation ON evidence_attachments
  FOR ALL TO public
  USING (
    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL
    OR current_setting('app.bypass_rls', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM test_sessions ts
      WHERE ts.id = evidence_attachments.test_session_id
        AND ts.laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID
    )
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL
    OR current_setting('app.bypass_rls', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM test_sessions ts
      WHERE ts.id = evidence_attachments.test_session_id
        AND ts.laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID
    )
  );
