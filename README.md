# PriceLens AI

> Plataforma inteligente para monitoramento, análise e acompanhamento da evolução dos preços de ofertas utilizando Inteligência Artificial.

---

## 📌 Visão Geral

O **PriceLens AI** é uma plataforma de inteligência de preços projetada para monitorar, analisar e prever a evolução de ofertas de supermercados e outros estabelecimentos. Combinando o poder de processamento de imagem/OCR espacial de ponta com modelos multimodais da família **Gemini**, o PriceLens AI extrai, normaliza e audita automaticamente dados de panfletos promocionais físicos e digitais, transformando dados brutos em inteligência acionável e transparente para consumidores e gestores.

## 🚀 Funcionalidades Principais

- **Observatório de Preços**: Visualização detalhada e analítica da cesta de produtos com série histórica e comportamento inflacionário local.
- **Ofertas Inteligentes**: Algoritmo avançado que classifica ofertas como excelentes oportunidades, dentro da média ou outliers de preços com base na inteligência histórica.
- **Cesta Inteligente**: Simulador multiloja de lista de compras que calcula matematicamente em qual estabelecimento o usuário economizará mais.
- **Assistente IA (Copiloto)**: Chatbot inteligente treinado com os dados históricos determinísticos da região de monitoramento.
- **Painel do Administrador**: Área técnica restrita para uploads, monitoramento de pipeline OCR espacial e auditorias.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend**: Express, Node.js (TypeScript)
- **Inteligência Artificial**: SDK do Google GenAI (`@google/genai`), Gemini 2.5 Flash / Flash Vision para OCR espacial e normalização
- **Banco de Dados & Auth**: Firebase Firestore e Firebase Authentication

## 📂 Arquitetura de Configuração Centralizada

Todas as variáveis institucionais e de branding estão centralizadas no arquivo `/src/config/app.ts`:

```typescript
export const APP_CONFIG = {
  name: "PriceLens AI",
  shortName: "PriceLens",
  slogan: "Inteligência para acompanhar a evolução dos preços.",
  description: "Plataforma inteligente para monitoramento, análise e acompanhamento da evolução dos preços utilizando Inteligência Artificial.",
  version: "1.0.0",
  company: "PriceLens AI",
  defaultCity: "São Gotardo - MG",
  defaultCityShort: "São Gotardo",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo"
};
```

## 🧑‍💻 Instalação e Execução

### Pré-requisitos
- Node.js instalado (v18 ou superior)
- Conta e base configuradas no Firebase

### Passos
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure as variáveis de ambiente em um arquivo `.env` com base no `.env.example`.
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## ⚖️ Isenção de Responsabilidade

A extração de dados é realizada de panfletos publicitários distribuídos publicamente pelos estabelecimentos comerciais. O **PriceLens AI** garante total imparcialidade e isenção legal de marca, operando unicamente como canal de análise e economia ao consumidor.
