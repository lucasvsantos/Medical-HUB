package br.com.tech.challenge.notificationservice.config;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * PATIENT so ve as proprias notificacoes: o e-mail consultado precisa ser o subject do token.
 * Mesma regra do AppointmentAuthorization (appointment-service) e do MedicalHistoryQueryService
 * (history-service). DOCTOR e NURSE veem qualquer paciente.
 */
@Component
public class NotificationAuthorization {

    public Long checkPatientAccess(Authentication authentication, String patientEmail) {
        if (authentication instanceof JwtAuthenticationToken jwt
                && jwt.getAuthorities().stream().anyMatch(a -> Objects.equals(a.getAuthority(), "ROLE_PATIENT"))) {
            String subject = jwt.getToken().getSubject();
            Number userId = jwt.getToken().getClaim("user_id");
            if (subject == null || userId == null || !subject.equalsIgnoreCase(patientEmail)) {
                throw new AccessDeniedException("Patient cannot access other patient notifications");
            }
            return userId.longValue();
        }
        return null;
    }
}
