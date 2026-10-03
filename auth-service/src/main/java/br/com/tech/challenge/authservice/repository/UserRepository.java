package br.com.tech.challenge.authservice.repository;

import br.com.tech.challenge.authservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findAllByRoleName(br.com.tech.challenge.authservice.entity.RoleEnum role);
}
