package br.com.tech.challenge.notificationservice.notification;

import br.com.tech.challenge.notificationservice.model.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class LogNotificationSender implements NotificationSender {

    @Override
    public void send(Notification notification) {
        log.info(
                "LEMBRETE ENVIADO - destinatario={}, paciente={}, consulta={}, mensagem={}",
                notification.getPatientEmail(),
                notification.getPatientName(),
                notification.getAppointmentId(),
                notification.getMessage()
        );
    }
}
