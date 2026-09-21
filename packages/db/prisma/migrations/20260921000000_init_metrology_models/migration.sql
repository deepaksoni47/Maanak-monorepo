-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "laboratories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(10) NOT NULL,
    "contact_email" VARCHAR(255) NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "nabl_accreditation_no" VARCHAR(100),
    "nabl_valid_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laboratories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "permissions_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "laboratory_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "designation" VARCHAR(100) NOT NULL,
    "government_id_no" VARCHAR(100),
    "mobile_number" VARCHAR(20) NOT NULL,
    "x509_cert_fingerprint" VARCHAR(128),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accuracy_classes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "min_verification_scale_intervals" INTEGER NOT NULL,
    "max_verification_scale_intervals" INTEGER,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "accuracy_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_standards" (
    "id" UUID NOT NULL,
    "laboratory_id" UUID NOT NULL,
    "identification_code" VARCHAR(100) NOT NULL,
    "oiml_class" VARCHAR(10) NOT NULL,
    "manufacturer_name" VARCHAR(255),
    "material" VARCHAR(100),
    "nominal_mass_min" DECIMAL(16,8) NOT NULL,
    "nominal_mass_max" DECIMAL(16,8) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reference_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_certificates" (
    "id" UUID NOT NULL,
    "reference_standard_id" UUID NOT NULL,
    "certificate_number" VARCHAR(100) NOT NULL,
    "calibrating_agency" VARCHAR(255) NOT NULL,
    "nabl_cert_no" VARCHAR(100) NOT NULL,
    "calibration_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "expanded_uncertainty_u" DECIMAL(16,8) NOT NULL,
    "uncertainty_unit" VARCHAR(10) NOT NULL DEFAULT 'mg',
    "coverage_factor_k" DECIMAL(4,2) NOT NULL DEFAULT 2.00,
    "certificate_pdf_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calibration_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_packs" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "issuing_body" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_pack_versions" (
    "id" UUID NOT NULL,
    "rule_pack_id" UUID NOT NULL,
    "version_tag" VARCHAR(50) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "rule_schema_version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "table_3_classification_json" JSONB NOT NULL,
    "table_6_mpe_brackets_json" JSONB NOT NULL,
    "formula_definitions_json" JSONB NOT NULL,
    "environmental_limits_json" JSONB NOT NULL,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_pack_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" UUID NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "trade_license_no" VARCHAR(100) NOT NULL,
    "registration_number" VARCHAR(100) NOT NULL,
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL DEFAULT 'India',
    "pincode" VARCHAR(10) NOT NULL,
    "contact_person" VARCHAR(255) NOT NULL,
    "contact_email" VARCHAR(255) NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_models" (
    "id" UUID NOT NULL,
    "manufacturer_id" UUID NOT NULL,
    "accuracy_class_id" UUID NOT NULL,
    "model_name" VARCHAR(255) NOT NULL,
    "pattern_designation" VARCHAR(100) NOT NULL,
    "instrument_type" VARCHAR(100) NOT NULL,
    "weighing_principle" VARCHAR(100) NOT NULL,
    "max_capacity" DECIMAL(16,8) NOT NULL,
    "min_capacity" DECIMAL(16,8) NOT NULL,
    "verification_scale_interval_e" DECIMAL(16,8) NOT NULL,
    "actual_scale_interval_d" DECIMAL(16,8) NOT NULL,
    "scale_division_count_n" INTEGER NOT NULL,
    "unit_of_measure" VARCHAR(10) NOT NULL DEFAULT 'kg',
    "is_multi_interval" BOOLEAN NOT NULL DEFAULT false,
    "is_multiple_range" BOOLEAN NOT NULL DEFAULT false,
    "number_of_partial_ranges" INTEGER NOT NULL DEFAULT 1,
    "temp_range_min_c" DECIMAL(4,1) NOT NULL DEFAULT -10.0,
    "temp_range_max_c" DECIMAL(4,1) NOT NULL DEFAULT 40.0,
    "power_supply_voltage_nominal" DECIMAL(5,1) NOT NULL DEFAULT 230.0,
    "power_supply_frequency_hz" DECIMAL(4,1) NOT NULL DEFAULT 50.0,
    "firmware_version_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_partial_ranges" (
    "id" UUID NOT NULL,
    "instrument_model_id" UUID NOT NULL,
    "range_index" INTEGER NOT NULL,
    "max_capacity_i" DECIMAL(16,8) NOT NULL,
    "min_capacity_i" DECIMAL(16,8) NOT NULL,
    "verification_scale_interval_e_i" DECIMAL(16,8) NOT NULL,
    "actual_scale_interval_d_i" DECIMAL(16,8) NOT NULL,
    "scale_division_count_n_i" INTEGER NOT NULL,

    CONSTRAINT "model_partial_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_units" (
    "id" UUID NOT NULL,
    "instrument_model_id" UUID NOT NULL,
    "serial_number" VARCHAR(100) NOT NULL,
    "year_of_manufacture" INTEGER NOT NULL,
    "indicator_serial_no" VARCHAR(100),
    "load_cell_model_no" VARCHAR(100),
    "load_cell_serial_no" VARCHAR(100),
    "sealing_arrangement_details" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_plans" (
    "id" UUID NOT NULL,
    "instrument_model_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "total_test_clauses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_plan_items" (
    "id" UUID NOT NULL,
    "test_plan_id" UUID NOT NULL,
    "clause_number" VARCHAR(20) NOT NULL,
    "form_number" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "execution_order" INTEGER NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "test_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_sessions" (
    "id" UUID NOT NULL,
    "local_id" UUID,
    "session_number" VARCHAR(100) NOT NULL,
    "laboratory_id" UUID NOT NULL,
    "instrument_unit_id" UUID NOT NULL,
    "test_plan_id" UUID NOT NULL,
    "rule_pack_version_id" UUID NOT NULL,
    "testing_officer_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "sync_status" VARCHAR(20) NOT NULL DEFAULT 'SYNCED',
    "device_id" VARCHAR(100),
    "server_synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_environmental_logs" (
    "id" UUID NOT NULL,
    "test_session_id" UUID NOT NULL,
    "logged_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature_c" DECIMAL(4,2) NOT NULL,
    "relative_humidity_percent" DECIMAL(5,2) NOT NULL,
    "barometric_pressure_hpa" DECIMAL(6,2),
    "temp_drift_rate_c_per_hr" DECIMAL(4,2),
    "is_temp_stable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "session_environmental_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_observations" (
    "id" UUID NOT NULL,
    "local_id" UUID,
    "test_session_id" UUID NOT NULL,
    "test_plan_item_id" UUID NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "test_clause" VARCHAR(20) NOT NULL,
    "load_run_direction" VARCHAR(20) NOT NULL,
    "target_load_l" DECIMAL(16,8) NOT NULL,
    "displayed_indication_i" DECIMAL(16,8) NOT NULL,
    "changeover_weight_dl" DECIMAL(16,8) NOT NULL DEFAULT 0.0,
    "zero_indication_i0" DECIMAL(16,8) NOT NULL DEFAULT 0.0,
    "eccentricity_position" INTEGER,
    "elapsed_time_minutes" DECIMAL(6,2),
    "active_partial_range_index" INTEGER NOT NULL DEFAULT 1,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observation_weights_used" (
    "id" UUID NOT NULL,
    "raw_observation_id" UUID NOT NULL,
    "calibration_certificate_id" UUID NOT NULL,
    "weight_mass_applied" DECIMAL(16,8) NOT NULL,

    CONSTRAINT "observation_weights_used_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_runs" (
    "id" UUID NOT NULL,
    "test_session_id" UUID NOT NULL,
    "rule_pack_version_id" UUID NOT NULL,
    "executed_by_user_id" UUID,
    "executed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overall_compliance_status" VARCHAR(20) NOT NULL,
    "total_points_evaluated" INTEGER NOT NULL,
    "total_points_failed" INTEGER NOT NULL DEFAULT 0,
    "max_error_to_mpe_ratio" DECIMAL(6,4) NOT NULL,

    CONSTRAINT "calculation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_trace_items" (
    "id" UUID NOT NULL,
    "calculation_run_id" UUID NOT NULL,
    "raw_observation_id" UUID NOT NULL,
    "pre_rounding_indication_p" DECIMAL(16,8) NOT NULL,
    "raw_error_e" DECIMAL(16,8) NOT NULL,
    "zero_error_e0" DECIMAL(16,8) NOT NULL DEFAULT 0.0,
    "corrected_intrinsic_error_ec" DECIMAL(16,8) NOT NULL,
    "mpe_limit_applied" DECIMAL(16,8) NOT NULL,
    "mpe_bracket_category" VARCHAR(50) NOT NULL,
    "compliance_status" VARCHAR(10) NOT NULL,
    "step_derivation_tree_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculation_trace_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_audits" (
    "id" UUID NOT NULL,
    "test_session_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "review_stage" VARCHAR(50) NOT NULL,
    "decision" VARCHAR(50) NOT NULL,
    "comments" TEXT,
    "automated_anomaly_flags_json" JSONB NOT NULL DEFAULT '[]',
    "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_signatures" (
    "id" UUID NOT NULL,
    "test_session_id" UUID NOT NULL,
    "signer_user_id" UUID NOT NULL,
    "signer_role" VARCHAR(50) NOT NULL,
    "pdf_binary_hash_sha256" VARCHAR(64) NOT NULL,
    "x509_certificate_serial" VARCHAR(100) NOT NULL,
    "pki_signature_value_base64" TEXT NOT NULL,
    "timestamp_token_base64" TEXT,
    "signed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "test_session_id" UUID NOT NULL,
    "report_number" VARCHAR(100) NOT NULL,
    "pattern_approval_no" VARCHAR(100),
    "current_version_no" INTEGER NOT NULL DEFAULT 1,
    "is_signed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_versions" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "file_format" VARCHAR(10) NOT NULL,
    "file_storage_path" TEXT NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "file_hash_sha256" VARCHAR(64) NOT NULL,
    "generated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_attachments" (
    "id" UUID NOT NULL,
    "test_session_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_storage_path" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_hash_sha256" VARCHAR(64) NOT NULL,
    "exif_timestamp" TIMESTAMPTZ,
    "exif_latitude" DECIMAL(9,6),
    "exif_longitude" DECIMAL(9,6),
    "ocr_extracted_text_json" JSONB,
    "uploaded_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provenance_nodes" (
    "id" UUID NOT NULL,
    "test_session_id" UUID NOT NULL,
    "node_sequence" INTEGER NOT NULL,
    "node_type" VARCHAR(50) NOT NULL,
    "previous_node_hash_sha256" VARCHAR(64) NOT NULL,
    "payload_hash_sha256" VARCHAR(64) NOT NULL,
    "current_node_hash_sha256" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provenance_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_sync_queue" (
    "id" UUID NOT NULL,
    "local_entity_id" UUID NOT NULL,
    "entity_table_name" VARCHAR(50) NOT NULL,
    "operation_type" VARCHAR(10) NOT NULL,
    "payload_json" JSONB NOT NULL,
    "client_timestamp" TIMESTAMPTZ NOT NULL,
    "sync_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offline_sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100),
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "laboratories_code_key" ON "laboratories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_lab" ON "users"("laboratory_id");

-- CreateIndex
CREATE UNIQUE INDEX "accuracy_classes_code_key" ON "accuracy_classes"("code");

-- CreateIndex
CREATE INDEX "idx_ref_std_lab" ON "reference_standards"("laboratory_id");

-- CreateIndex
CREATE UNIQUE INDEX "calibration_certificates_certificate_number_key" ON "calibration_certificates"("certificate_number");

-- CreateIndex
CREATE UNIQUE INDEX "rule_packs_code_key" ON "rule_packs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_rule_version" ON "rule_pack_versions"("rule_pack_id", "version_tag");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_registration_number_key" ON "manufacturers"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "instrument_models_pattern_designation_key" ON "instrument_models"("pattern_designation");

-- CreateIndex
CREATE UNIQUE INDEX "uq_model_range" ON "model_partial_ranges"("instrument_model_id", "range_index");

-- CreateIndex
CREATE UNIQUE INDEX "instrument_units_serial_number_key" ON "instrument_units"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_plan_clause" ON "test_plan_items"("test_plan_id", "clause_number");

-- CreateIndex
CREATE UNIQUE INDEX "test_sessions_local_id_key" ON "test_sessions"("local_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_sessions_session_number_key" ON "test_sessions"("session_number");

-- CreateIndex
CREATE INDEX "idx_test_sessions_lab" ON "test_sessions"("laboratory_id");

-- CreateIndex
CREATE INDEX "idx_test_sessions_status" ON "test_sessions"("status");

-- CreateIndex
CREATE INDEX "idx_test_sessions_unit" ON "test_sessions"("instrument_unit_id");

-- CreateIndex
CREATE INDEX "idx_test_sessions_officer" ON "test_sessions"("testing_officer_id");

-- CreateIndex
CREATE UNIQUE INDEX "raw_observations_local_id_key" ON "raw_observations"("local_id");

-- CreateIndex
CREATE INDEX "idx_raw_obs_session_clause" ON "raw_observations"("test_session_id", "test_clause", "sequence_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_obs_sequence" ON "raw_observations"("test_session_id", "test_plan_item_id", "sequence_number");

-- CreateIndex
CREATE INDEX "idx_calc_trace_run" ON "calculation_trace_items"("calculation_run_id");

-- CreateIndex
CREATE INDEX "idx_calc_trace_obs" ON "calculation_trace_items"("raw_observation_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_test_session_id_key" ON "reports"("test_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_report_number_key" ON "reports"("report_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_report_version" ON "report_versions"("report_id", "version_number", "file_format");

-- CreateIndex
CREATE INDEX "idx_provenance_session_seq" ON "provenance_nodes"("test_session_id", "node_sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_session_provenance_seq" ON "provenance_nodes"("test_session_id", "node_sequence");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_standards" ADD CONSTRAINT "reference_standards_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_certificates" ADD CONSTRAINT "calibration_certificates_reference_standard_id_fkey" FOREIGN KEY ("reference_standard_id") REFERENCES "reference_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_pack_versions" ADD CONSTRAINT "rule_pack_versions_rule_pack_id_fkey" FOREIGN KEY ("rule_pack_id") REFERENCES "rule_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_pack_versions" ADD CONSTRAINT "rule_pack_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_models" ADD CONSTRAINT "instrument_models_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_models" ADD CONSTRAINT "instrument_models_accuracy_class_id_fkey" FOREIGN KEY ("accuracy_class_id") REFERENCES "accuracy_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_partial_ranges" ADD CONSTRAINT "model_partial_ranges_instrument_model_id_fkey" FOREIGN KEY ("instrument_model_id") REFERENCES "instrument_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_units" ADD CONSTRAINT "instrument_units_instrument_model_id_fkey" FOREIGN KEY ("instrument_model_id") REFERENCES "instrument_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_plans" ADD CONSTRAINT "test_plans_instrument_model_id_fkey" FOREIGN KEY ("instrument_model_id") REFERENCES "instrument_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_plan_items" ADD CONSTRAINT "test_plan_items_test_plan_id_fkey" FOREIGN KEY ("test_plan_id") REFERENCES "test_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_instrument_unit_id_fkey" FOREIGN KEY ("instrument_unit_id") REFERENCES "instrument_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_test_plan_id_fkey" FOREIGN KEY ("test_plan_id") REFERENCES "test_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_rule_pack_version_id_fkey" FOREIGN KEY ("rule_pack_version_id") REFERENCES "rule_pack_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_testing_officer_id_fkey" FOREIGN KEY ("testing_officer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_environmental_logs" ADD CONSTRAINT "session_environmental_logs_test_session_id_fkey" FOREIGN KEY ("test_session_id") REFERENCES "test_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_observations" ADD CONSTRAINT "raw_observations_test_session_id_fkey" FOREIGN KEY ("test_session_id") REFERENCES "test_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_observations" ADD CONSTRAINT "raw_observations_test_plan_item_id_fkey" FOREIGN KEY ("test_plan_item_id") REFERENCES "test_plan_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_weights_used" ADD CONSTRAINT "observation_weights_used_raw_observation_id_fkey" FOREIGN KEY ("raw_observation_id") REFERENCES "raw_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_weights_used" ADD CONSTRAINT "observation_weights_used_calibration_certificate_id_fkey" FOREIGN KEY ("calibration_certificate_id") REFERENCES "calibration_certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_runs" ADD CONSTRAINT "calculation_runs_test_session_id_fkey" FOREIGN KEY ("test_session_id") REFERENCES "test_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_runs" ADD CONSTRAINT "calculation_runs_rule_pack_version_id_fkey" FOREIGN KEY ("rule_pack_version_id") REFERENCES "rule_pack_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_runs" ADD CONSTRAINT "calculation_runs_executed_by_user_id_fkey" FOREIGN KEY ("executed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_trace_items" ADD CONSTRAINT "calculation_trace_items_calculation_run_id_fkey" FOREIGN KEY ("calculation_run_id") REFERENCES "calculation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_trace_items" ADD CONSTRAINT "calculation_trace_items_raw_observation_id_fkey" FOREIGN KEY ("raw_observation_id") REFERENCES "raw_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_audits" ADD CONSTRAINT "review_audits_test_session_id_fkey" FOREIGN KEY ("test_session_id") REFERENCES "test_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_audits" ADD CONSTRAINT "review_audits_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_test_session_id_fkey" FOREIGN KEY ("test_session_id") REFERENCES "test_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_signer_user_id_fkey" FOREIGN KEY ("signer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_test_session_id_fkey" FOREIGN KEY ("test_session_id") REFERENCES "test_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_attachments" ADD CONSTRAINT "evidence_attachments_test_session_id_fkey" FOREIGN KEY ("test_session_id") REFERENCES "test_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_attachments" ADD CONSTRAINT "evidence_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_nodes" ADD CONSTRAINT "provenance_nodes_test_session_id_fkey" FOREIGN KEY ("test_session_id") REFERENCES "test_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
