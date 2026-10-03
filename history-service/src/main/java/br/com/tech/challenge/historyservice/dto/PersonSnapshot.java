package br.com.tech.challenge.historyservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PersonSnapshot(
        @NotNull Long id,
        @NotBlank @Email String email,
        @NotBlank String name
) {
}
