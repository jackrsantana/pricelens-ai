# Product Requirements Document (PRD): PriceLens AI

## 1. Visão Geral (Overview)
O **PriceLens AI** é uma plataforma de inteligência de preços desenhada para monitorar, analisar e prever a evolução de ofertas de supermercados e outros estabelecimentos. A ferramenta extrai dados brutos de panfletos (flyers) utilizando visão computacional e modelos multimodais (Google Gemini), normalizando os dados em inteligência acionável e transparente.

## 2. Objetivos
- **Automatização Eficiente:** Reduzir o trabalho manual e repetitivo na coleta de preços de encartes através de IA e extração estruturada.
- **Inteligência de Mercado:** Prover insights históricos de preços, acompanhando tendências, sazonalidades e inflação local de forma granular por estabelecimento e produto.
- **Economia Inteligente:** Permitir aos consumidores e gestores descobrir rapidamente as melhores ofertas e gerar cestas de compras otimizadas (Simulador Multiloja).
- **Curadoria e Auditoria (Human-in-the-loop):** Manter total rastreabilidade sobre os dados extraídos pela IA, incluindo interface gráfica interativa para conferência humana através de coordenadas visuais (Bounding Boxes) dos encartes analisados.

## 3. Públicos-Alvo (Personas)
1. **Administradores e Analistas de Dados:** Responsáveis por subir encartes, aprovar/corrigir extrações do modelo, realizar a normalização de produtos na base canônica e monitorar a saúde do pipeline de IA através do painel de controle.
2. **Consumidores / Analistas Comerciais:** Usuários que consultam o painel principal em busca das melhores ofertas, analisando a evolução histórica de preços e tirando dúvidas de mercado usando o assistente "Copiloto IA".

## 4. Escopo e Funcionalidades Principais

### 4.1. Observatório de Preços (Dashboard)
- Visualização analítica dos produtos rastreados.
- Gráficos de série histórica que demonstram o comportamento do preço de itens ao longo do tempo.
- Filtros por cidade, supermercado, marca e categoria.

### 4.2. Cesta Inteligente e Classificador de Ofertas
- Identificação avançada: As ofertas são classificadas utilizando o histórico armazenado (Ex: "Excelente oportunidade", "Preço Normal" ou "Outlier/Anomalia").
- Simulador multiloja para organizar as melhores compras do dia em diferentes locais minimizando o gasto.

### 4.3. Assistente IA (Copiloto de Preços)
- Chatbot contextual: Utiliza a API de GenAI estruturada com "System Instructions".
- Grounding Baseado no Banco de Dados: As respostas da IA são "ancoradas" pelo histórico da plataforma (Firebase), permitindo precisão matemática a questionamentos como "Em qual local a Coca-Cola 2L está mais barata hoje?".

### 4.4. Área de Administração (Backoffice)
- **Central de Upload de Folhetos:** Interface drag-and-drop para inserir novas imagens definindo vigência, cidade e estabelecimento-alvo.
- **Pipeline Híbrido de OCR Visão:** Comunicação server-side com IA para devolução em JSON estruturado de itens, preços, promoções (Ex: "Leve 3, Pague 2") e regras atreladas à publicidade.
- **Auditoria Visual (Gerenciar Recortes):** Tela onde cada item extraído pode ser checado ao lado do recorte da imagem original.
- **Normalização (Produtos Canônicos):** Associação de descrições ruidosas de OCR (Ex: `"S. PÓ OMO L3 P2 1KG"`) a um cadastro base (`Sabão em Pó Omo 1Kg`).
- **Diagnóstico do Sistema (Observabilidade):** Ferramenta voltada a desenvolvedores e mantenedores que verifica "cost efficiency", registrando volume de chamadas (Firestore/Gemini) e ciclos de re-renderização das Views.

## 5. Especificações Técnicas

### 5.1. Stack Tecnológico
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion (para transições orgânicas entre modais e rotas).
- **Backend:** Node.js, Express (Arquitetura Full-Stack servida via "esbuild" para conteinerização rápida).
- **IA e Modelos:** SDK Oficial `@google/genai`, modelos nativos Gemini (Gemini Flash).
- **Armazenamento e Autenticação:** Firebase Firestore (banco NoSQL orientado a documentos).

### 5.2. Segurança e Arquitetura de Integração
- Processamento Full-Stack fechado: Chamadas aos grandes modelos de linguagem (LLMs) originam sempre de APIs server-side (`/api/process-flyer`, `/api/ai-chat`), mantendo `GEMINI_API_KEY` isolada e oculta dos navegadores.
- O sistema é focado em alta coesão e baixo acoplamento nos hooks React.

## 6. Modelo de Dados e Entidades (Firestore)

| Entidade | Descrição |
| --- | --- |
| `Market` | Estabelecimentos/Supermercados acompanhados. Guarda CNPJ, nome e localização. |
| `Flyer` | O panfleto importado na plataforma, armazena datas de validade da campanha e imagens processadas. |
| `Offer` | Uma oferta extraída. Guarda o preço, a descrição literal e a caixa delimitadora (`BoundingBox`) gerada na extração IA. |
| `CanonicalProduct`| A lista canônica/oficial. Representa a "Tabela Mestre" para viabilizar relatórios de variação precisos através do tempo. |
| `ChatMessage` | Histórico do assistente para fornecer contexto na manutenção do bate-papo. |

## 7. Requisitos Não Funcionais (RNFs)
- **Desempenho no Reconhecimento:** O OCR deve informar métricas de duração (`geminiDuration`) no retorno do Node.js, mantendo resiliência frente a arquivos grandes.
- **Experiência de Usuário (UX/UI):** Padrão Premium. Adota o princípio de "Craftsmanship": uso de "Negative Space" generoso, tema sofisticado e limpo, sem componentes visuais sobrecarregados (falsos loaders técnicos ou loggers expostos para o usuário final - *Anti-AI-Slop*).
- **Instrumentação:** Módulo de rastreio (`MetricTracker`) injetado transparentemente sob variáveis de ambiente isoladas em dev-mode.

## 8. Considerações Adicionais
O PriceLens AI resolve o principal gargalo das plataformas de inteligência de varejo: a transcrição estruturada e limpa de encartes heterogêneos. O foco no pipeline human-in-the-loop afasta o risco de "alucinações" do modelo poluírem a série histórica de dados da plataforma, provendo segurança analítica para usuários e corporações.
