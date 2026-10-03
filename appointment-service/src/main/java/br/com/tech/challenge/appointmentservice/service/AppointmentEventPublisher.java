package br.com.tech.challenge.appointmentservice.service;

import br.com.tech.challenge.appointmentservice.client.AuthUserClient;
import br.com.tech.challenge.appointmentservice.config.MessagingProperties;
import br.com.tech.challenge.appointmentservice.entity.Appointment;
import br.com.tech.challenge.appointmentservice.event.AppointmentEvent;
import br.com.tech.challenge.appointmentservice.event.AppointmentEventStatus;
import br.com.tech.challenge.appointmentservice.event.PersonSnapshot;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
@Slf4j
public class AppointmentEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final MessagingProperties properties;
    private final ObjectProvider<AuthUserClient> authUserClient;

    public AppointmentEventPublisher(
            RabbitTemplate rabbitTemplate,
            MessagingProperties properties,
            ObjectProvider<AuthUserClient> authUserClient) {
        this.rabbitTemplate = rabbitTemplate;
        this.properties = properties;
        this.authUserClient = authUserClient;
    }

    /**
     * Publica evento de consulta para os consumidores (history-service e notification-service)
     * usando o mesmo exchange com routing keys diferentes.
     *
     * @param appointment Consulta que sofreu alteração
     * @param status      Status da consulta após a alteração
     */
    public void publish(Appointment appointment, AppointmentEventStatus status) {
        AppointmentEvent event = new AppointmentEvent(
                UUID.randomUUID(),
                status,
                Instant.now(),
                appointment.getId(),
                resolveUser(appointment.getPatientId()),
                resolveUser(appointment.getDoctorId()),
                appointment.getAppointmentDate(),
                appointment.getDescription()
        );

        log.info("Publicando evento de appointment: appointmentId={}, eventStatus={}, eventId={}",
                appointment.getId(), status, event.eventId());

        // Publica para history-service com routing key history.created
        rabbitTemplate.convertAndSend(
                properties.appointmentExchange(),
                properties.historyRoutingKey(),
                event
        );

        // Publica para notification-service com routing key notification.created
        rabbitTemplate.convertAndSend(
                properties.appointmentExchange(),
                properties.notificationRoutingKey(),
                event
        );

        log.debug("Evento publicado com sucesso: eventId={}", event.eventId());
    }

    private PersonSnapshot resolveUser(Long id) {
        AuthUserClient client = authUserClient.getIfAvailable();
        if (client == null) {
            return new PersonSnapshot(id, null, null);
        }
        return client.findById(id);
    }
}
