import "@testing-library/jest-dom/vitest";

// Sessão secret default para testes
process.env.SI_SESSION_SECRET ??= "test-secret-test-secret-test-secret";
