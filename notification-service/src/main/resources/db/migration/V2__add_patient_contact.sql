ALTER TABLE notifications
    ADD COLUMN patient_email VARCHAR(255),
    ADD COLUMN patient_name VARCHAR(255);

CREATE INDEX idx_notifications_patient_email
    ON notifications (patient_email, created_at DESC);
