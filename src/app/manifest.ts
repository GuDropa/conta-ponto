import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Conta Ponto — Unimax",
    short_name: "Conta Ponto",
    description: "Registro e controle de ponto — Supermercado Unimax",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f8",
    theme_color: "#233a95",
    lang: "pt-BR",
  };
}
