package br.com.tech.challenge.historyservice.dto;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

import br.com.tech.challenge.historyservice.domain.AppointmentEventStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;

/**
 * Contrato do evento publicado pelo appointment-service.
 * Formato documentado em docs/messaging/appointment-event.md.
 * patientName, doctorName e description sao opcionais; o restante e obrigatorio.
 */
public record AppointmentEventDTO(
        @NotNull UUID eventId,
        @NotNull AppointmentEventStatus eventStatus,
        @NotNull Instant occurredAt,
        @NotNull Long appointmentId,
        @NotNull @Valid PersonSnapshot patient,
        @NotNull @Valid PersonSnapshot doctor,
        @NotNull LocalDateTime appointmentDate,
        String description) {

    /** Compatibilidade de compilação com fixtures antigos durante a migração do contrato. */
    public AppointmentEventDTO(
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

    public String patientEmail() {
        return patient == null ? null : patient.email();
    }

    public String patientName() {
        return patient == null ? null : patient.name();
    }

    public Long doctorId() {
        return doctor == null ? null : doctor.id();
    }

    public String doctorEmail() {
        return doctor == null ? null : doctor.email();
    }

    public String doctorName() {
        return doctor == null ? null : doctor.name();
    }
}
