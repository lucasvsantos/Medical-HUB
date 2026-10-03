package br.com.tech.challenge.authservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.security.auth.x500.X500Principal;
import java.io.IOException;
import java.security.cert.X509Certificate;
import javax.naming.InvalidNameException;
import javax.naming.ldap.LdapName;
import javax.naming.ldap.Rdn;

@Component
public class InternalMtlsFilter extends OncePerRequestFilter {

    private static final String CERTIFICATE_ATTRIBUTE = "jakarta.servlet.request.X509Certificate";

    private final String expectedClientCommonName;

    public InternalMtlsFilter(
            @Value("${app.mtls.client-common-name:appointment-service}") String expectedClientCommonName) {
        this.expectedClientCommonName = expectedClientCommonName;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (!request.getRequestURI().startsWith("/internal/")) {
            filterChain.doFilter(request, response);
            return;
        }

        Object attribute = request.getAttribute(CERTIFICATE_ATTRIBUTE);
        if (!(attribute instanceof X509Certificate[] certificates)
                || certificates.length == 0
                || !hasExpectedCommonName(certificates[0])) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Certificado de serviço inválido");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean hasExpectedCommonName(X509Certificate certificate) {
        X500Principal principal = certificate.getSubjectX500Principal();
        String distinguishedName = principal.getName(X500Principal.RFC2253);
        try {
            return new LdapName(distinguishedName).getRdns().stream()
                    .filter(rdn -> "CN".equalsIgnoreCase(rdn.getType()))
                    .map(Rdn::getValue)
                    .anyMatch(expectedClientCommonName::equals);
        } catch (InvalidNameException exception) {
            return false;
        }
    }
}
