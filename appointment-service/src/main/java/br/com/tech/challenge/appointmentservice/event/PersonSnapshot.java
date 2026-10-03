package br.com.tech.challenge.appointmentservice.event;

public record PersonSnapshot(
        Long id,
        String email,
        String name
) {
}
