package br.com.tech.challenge.authservice.config;

import org.apache.catalina.connector.Connector;
import org.apache.coyote.http11.Http11NioProtocol;
import org.apache.tomcat.util.net.SSLHostConfig;
import org.apache.tomcat.util.net.SSLHostConfigCertificate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.ResourceUtils;

import java.io.File;

@Configuration
@ConditionalOnProperty(name = "app.mtls.enabled", havingValue = "true", matchIfMissing = true)
public class MtlsServerConfig {

    @Bean
    WebServerFactoryCustomizer<TomcatServletWebServerFactory> mtlsConnector(
            @Value("${app.mtls.port:9443}") int port,
            @Value("${app.mtls.key-store}") String keyStore,
            @Value("${app.mtls.key-store-password}") String keyStorePassword,
            @Value("${app.mtls.trust-store}") String trustStore,
            @Value("${app.mtls.trust-store-password}") String trustStorePassword) {

        return factory -> {
            Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
            connector.setScheme("https");
            connector.setSecure(true);
            connector.setPort(port);

            Http11NioProtocol protocol = (Http11NioProtocol) connector.getProtocolHandler();
            protocol.setSSLEnabled(true);

            SSLHostConfig sslHostConfig = new SSLHostConfig();
            sslHostConfig.setCertificateVerification("required");
            sslHostConfig.setTruststoreFile(filePath(trustStore));
            sslHostConfig.setTruststorePassword(trustStorePassword);
            sslHostConfig.setTruststoreType("PKCS12");

            SSLHostConfigCertificate certificate = new SSLHostConfigCertificate(
                    sslHostConfig,
                    SSLHostConfigCertificate.Type.RSA);
            certificate.setCertificateKeystoreFile(filePath(keyStore));
            certificate.setCertificateKeystorePassword(keyStorePassword);
            certificate.setCertificateKeystoreType("PKCS12");
            sslHostConfig.addCertificate(certificate);

            protocol.addSslHostConfig(sslHostConfig);

            factory.addAdditionalConnectors(connector);
        };
    }

    private String filePath(String location) {
        try {
            File file = ResourceUtils.getFile(location);
            return file.getAbsolutePath();
        } catch (Exception exception) {
            throw new IllegalStateException("Não foi possível carregar o arquivo mTLS: " + location, exception);
        }
    }
}
