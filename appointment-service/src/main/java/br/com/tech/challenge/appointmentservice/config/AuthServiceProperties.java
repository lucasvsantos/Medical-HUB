package br.com.tech.challenge.appointmentservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public record AuthServiceProperties(
        String baseUrl,
        String keyStore,
        String keyStorePassword,
        String trustStore,
        String trustStorePassword
) {
}
