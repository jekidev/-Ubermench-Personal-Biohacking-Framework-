-- Fearprime v0.1 domain schema
-- Raw observations are preserved; derived metrics should be recomputable.

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  timezone TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'da',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  profile_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS memory_targets (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  label TEXT NOT NULL,
  threat_type TEXT NOT NULL,
  trigger_class TEXT,
  threat_prediction TEXT,
  safety_rule TEXT,
  primary_context_id TEXT,
  generalisation_class TEXT,
  interoceptive_component SMALLINT NOT NULL CHECK (interoceptive_component BETWEEN 0 AND 10),
  intrusion_component SMALLINT NOT NULL CHECK (intrusion_component BETWEEN 0 AND 10),
  social_component SMALLINT NOT NULL CHECK (social_component BETWEEN 0 AND 10),
  avoidance_baseline SMALLINT NOT NULL CHECK (avoidance_baseline BETWEEN 0 AND 10),
  safety_behaviour_baseline SMALLINT NOT NULL CHECK (safety_behaviour_baseline BETWEEN 0 AND 10),
  memory_strength SMALLINT CHECK (memory_strength BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'untested',
  current_bottleneck TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  similarity_to_primary SMALLINT CHECK (similarity_to_primary BETWEEN 0 AND 100),
  social_density SMALLINT CHECK (social_density BETWEEN 0 AND 100),
  physical_setting TEXT,
  time_pattern TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stimuli (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL REFERENCES memory_targets(id),
  stimulus_class TEXT NOT NULL,
  similarity_to_target SMALLINT NOT NULL CHECK (similarity_to_target BETWEEN 0 AND 100),
  modality TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS hypotheses (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  target_type TEXT NOT NULL,
  statement TEXT NOT NULL,
  expected_direction TEXT,
  confidence DOUBLE PRECISION CHECK (confidence BETWEEN 0 AND 1),
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interventions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  mechanism JSONB,
  target_phases JSONB NOT NULL,
  evidence_tier TEXT NOT NULL,
  ptsd_evidence_tier TEXT NOT NULL,
  expected_latency TEXT,
  expected_window TEXT,
  carryover_risk TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'library',
  evidence_version TEXT,
  last_evidence_review DATE
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  intervention_id TEXT REFERENCES interventions(id),
  protocol_version TEXT NOT NULL,
  baseline_start TIMESTAMPTZ,
  baseline_end TIMESTAMPTZ,
  primary_endpoint_id TEXT NOT NULL,
  secondary_endpoint_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  predefined_success_rule TEXT NOT NULL,
  predefined_failure_rule TEXT NOT NULL,
  safety_rule TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  memory_id TEXT NOT NULL REFERENCES memory_targets(id),
  stimulus_id TEXT REFERENCES stimuli(id),
  context_id TEXT REFERENCES contexts(id),
  event_type TEXT NOT NULL,
  environment TEXT NOT NULL,
  timestamp_start TIMESTAMPTZ NOT NULL,
  timestamp_end TIMESTAMPTZ,
  protocol_version TEXT NOT NULL,
  expected_outcome TEXT,
  expected_probability SMALLINT CHECK (expected_probability BETWEEN 0 AND 100),
  prediction_confidence SMALLINT CHECK (prediction_confidence BETWEEN 0 AND 100),
  prediction_hash TEXT,
  pre_state JSONB,
  post_state JSONB,
  actual_outcome TEXT,
  learning_quality JSONB,
  data_quality JSONB,
  status TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS followups (
  id TEXT PRIMARY KEY,
  source_event_id TEXT NOT NULL REFERENCES learning_events(id),
  timepoint TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS daily_states (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  timestamp TIMESTAMPTZ NOT NULL,
  period TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS sleep_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  date DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL,
  quality DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS physiology_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  timestamp TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_device TEXT,
  quality DOUBLE PRECISION,
  artifact_flag BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS adverse_events (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  intervention_id TEXT REFERENCES interventions(id),
  timestamp TIMESTAMPTZ NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  suspected_relationship TEXT NOT NULL,
  action TEXT NOT NULL,
  clinician_notified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_type TEXT NOT NULL,
  previous_hash TEXT,
  current_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_learning_events_experiment_time
  ON learning_events(experiment_id, timestamp_start);

CREATE INDEX IF NOT EXISTS idx_followups_source_time
  ON followups(source_event_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_daily_states_patient_time
  ON daily_states(patient_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_physiology_patient_time
  ON physiology_records(patient_id, timestamp);
