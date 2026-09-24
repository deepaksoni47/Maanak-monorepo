-- WORM (Write-Once-Read-Many) Immutability Trigger for APPROVED_LOCKED Test Sessions
-- Conforms to OIML R-76, WELMEC 7.2, and NABL 129 Statutory Metrological Integrity

CREATE OR REPLACE FUNCTION enforce_approved_session_immutability()
RETURNS TRIGGER AS $$
DECLARE
    session_status VARCHAR(50);
BEGIN
    -- 1. If modifying or deleting the test_sessions table directly
    IF (TG_TABLE_NAME = 'test_sessions') THEN
        IF (TG_OP = 'DELETE' AND OLD.status = 'APPROVED_LOCKED') THEN
            RAISE EXCEPTION 'SESSION_IMMUTABLE_LOCKED: Test session % is statutorily APPROVED_LOCKED (WORM) and cannot be deleted.', OLD.id
                USING ERRCODE = '55000';
        END IF;

        IF (TG_OP = 'UPDATE' AND OLD.status = 'APPROVED_LOCKED') THEN
            IF (NEW.status IS DISTINCT FROM 'APPROVED_LOCKED') THEN
                RAISE EXCEPTION 'SESSION_IMMUTABLE_LOCKED: Test session % is statutorily APPROVED_LOCKED (WORM) and its status cannot be changed.', OLD.id
                    USING ERRCODE = '55000';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    -- 2. If modifying or deleting child records (observations, trace items, weights, logs)
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        SELECT status INTO session_status FROM test_sessions WHERE id = OLD.test_session_id;
        IF (session_status = 'APPROVED_LOCKED') THEN
            RAISE EXCEPTION 'SESSION_IMMUTABLE_LOCKED: Test session % is statutorily APPROVED_LOCKED (WORM). Modifying or deleting observation records is strictly prohibited.', OLD.test_session_id
                USING ERRCODE = '55000';
        END IF;
        IF (TG_OP = 'DELETE') THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- 3. If inserting child records into an already approved session
    IF (TG_OP = 'INSERT') THEN
        SELECT status INTO session_status FROM test_sessions WHERE id = NEW.test_session_id;
        IF (session_status = 'APPROVED_LOCKED') THEN
            RAISE EXCEPTION 'SESSION_IMMUTABLE_LOCKED: Test session % is statutorily APPROVED_LOCKED (WORM). Appending observations to an approved session is strictly prohibited.', NEW.test_session_id
                USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers
DROP TRIGGER IF EXISTS trg_worm_test_sessions ON test_sessions;
CREATE TRIGGER trg_worm_test_sessions
    BEFORE UPDATE OR DELETE ON test_sessions
    FOR EACH ROW
    EXECUTE FUNCTION enforce_approved_session_immutability();

DROP TRIGGER IF EXISTS trg_worm_raw_observations ON raw_observations;
CREATE TRIGGER trg_worm_raw_observations
    BEFORE INSERT OR UPDATE OR DELETE ON raw_observations
    FOR EACH ROW
    EXECUTE FUNCTION enforce_approved_session_immutability();
