ALTER TABLE medical_history
    ADD COLUMN patient_email VARCHAR(255),
    ADD COLUMN doctor_email VARCHAR(255);

CREATE INDEX idx_medical_history_patient_email
    ON medical_history (patient_email, occurred_at DESC);
