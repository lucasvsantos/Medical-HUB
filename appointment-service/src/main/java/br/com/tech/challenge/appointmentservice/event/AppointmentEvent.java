package br.com.tech.challenge.appointmentservice.event;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public record AppointmentEvent(
        UUID eventId,
        AppointmentEventStatus eventStatus,
        Instant occurredAt,
        Long appointmentId,
        PersonSnapshot patient,
        PersonSnapshot doctor,
        LocalDateTime appointmentDate,
        String description
) {

    public AppointmentEvent(
            UUID eventId,
            AppointmentEventStatus eventStatus,
            Instant occurredAt,
            Long appointmentId,
            Long patientId,
            String patientName,
            Long doctorId,
            String doctorName,
            LocalDateTime appointmentDate,
            String description) {
        this(eventId, eventStatus, occurredAt, appointmentId,
                new PersonSnapshot(patientId, null, patientName),
                new PersonSnapshot(doctorId, null, doctorName),
                appointmentDate, description);
    }

    public Long patientId() {
        return patient == null ? null : patient.id();
    }

    public String patientName() {
        return patient == null ? null : patient.name();
    }

    public Long doctorId() {
        return doctor == null ? null : doctor.id();
    }

    public String doctorName() {
        return doctor == null ? null : doctor.name();
    }
}
