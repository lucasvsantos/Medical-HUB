package br.com.tech.challenge.appointmentservice.client;

import br.com.tech.challenge.appointmentservice.event.PersonSnapshot;
import br.com.tech.challenge.appointmentservice.exception.BusinessException;
import org.springframework.web.client.RestClient;

public class AuthUserClient {

    private final RestClient restClient;

    public AuthUserClient(RestClient restClient) {
        this.restClient = restClient;
    }

    public PersonSnapshot findById(Long id) {
        UserSummary user = restClient.get()
                .uri("/internal/users/{id}", id)
                .retrieve()
                .body(UserSummary.class);

        if (user == null || user.id() == null || user.email() == null || user.name() == null) {
            throw new BusinessException("Auth-service retornou dados incompletos para o usuário " + id);
        }

        return new PersonSnapshot(user.id(), user.email(), user.name());
    }

    private record UserSummary(Long id, String name, String email, String role) {
    }
}
