package br.com.tech.challenge.appointmentservice.config;

import br.com.tech.challenge.appointmentservice.client.AuthUserClient;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.security.KeyStore;

@Configuration
@EnableConfigurationProperties(AuthServiceProperties.class)
public class AuthServiceClientConfiguration {

    @Bean
    AuthUserClient authUserClient(AuthServiceProperties properties, ResourceLoader resourceLoader) {
        try {
            KeyStore clientKeyStore = loadKeyStore(
                    resourceLoader.getResource(properties.keyStore()),
                    properties.keyStorePassword());
            KeyStore trustStore = loadKeyStore(
                    resourceLoader.getResource(properties.trustStore()),
                    properties.trustStorePassword());

            KeyManagerFactory keyManagerFactory = KeyManagerFactory.getInstance(
                    KeyManagerFactory.getDefaultAlgorithm());
            keyManagerFactory.init(clientKeyStore, properties.keyStorePassword().toCharArray());

            TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(
                    TrustManagerFactory.getDefaultAlgorithm());
            trustManagerFactory.init(trustStore);

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(
                    keyManagerFactory.getKeyManagers(),
                    trustManagerFactory.getTrustManagers(),
                    null);

            HttpClient httpClient = HttpClient.newBuilder()
                    .sslContext(sslContext)
                    .build();

            RestClient restClient = RestClient.builder()
                    .baseUrl(properties.baseUrl())
                    .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                    .build();

            return new AuthUserClient(restClient);
        } catch (Exception exception) {
            throw new IllegalStateException("Não foi possível configurar o cliente mTLS do auth-service", exception);
        }
    }

    private KeyStore loadKeyStore(Resource resource, String password) throws Exception {
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        try (InputStream inputStream = resource.getInputStream()) {
            keyStore.load(inputStream, password.toCharArray());
        }
        return keyStore;
    }
}
