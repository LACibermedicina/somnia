# Changelog — Somnia

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: SemVer com sufixo de fase.
O ciclo de versões reinicia em `v0.1.0-alpha` com a reorganização em hub + módulo Mitos (o pacote anterior era o "Somnia 1.0 VPS").

## [0.1.0-alpha] — 2026-11-18

### Adicionado
- **Hub estilo macOS** (`public/hub/`): área de trabalho com papel de parede animado (Monte Serrat ao crepúsculo), barra de menus, dock com ampliação, ícones 3D **estilo Pixar** com rosto, piscar, olhos que seguem o ponteiro, "respiração", *squash & stretch* e efeito gelatina; janelas arrastáveis, redimensionáveis, minimizáveis e maximizáveis, com posição lembrada; **clique duplo no fundo fecha a janela ativa**; Esc fecha.
- **Boas-vindas com 3 portais**: Biblioteca, Personagens (cartas) e Jogos.
- **Biblioteca de Mitos**: 16 lendas de Santos e da Baixada Santista em **cards ilustrados estilo HQ** (ilustrações SVG procedurais com retícula, balão e legenda), filtros por tipo, busca, ordenação, **linha do tempo** e leitura em painéis de quadrinho com personagens vinculados e fontes (primárias/secundárias).
- **Cartas RPG de 25 personagens** vinculados aos mitos: retrato ilustrado, classe, raridade, 5 atributos lúdicos, habilidade; verso com biografia e mitos.
- **Flashcards em 4 quadrantes** seguindo a especificação acadêmica e simbólica (cabeçalho; B síntese processual com 4 etapas, ícones semânticos e ponto crítico; C apoio cognitivo; D fluxograma literal × simbólico; E pontos-chave, referências e glossário). Frente com pergunta-gatilho, repetição espaçada (caixas de Leitner, local), impressão do infográfico e **geração por IA** para curadores (`src/prompts/flashcard-mitos.md`).
- **Jogos**: Duelo de Cartas (estilo trunfo com os personagens), Quiz dos Mitos (gerado do acervo) e atalho para a Loja existente.
- **Grafo** mito ↔ personagem com física simples e arrastar e soltar; curadores criam vínculos soltando um personagem sobre um mito.
- **Agenda** com datas dos mitos ("neste dia") e notas por dia guardadas só no navegador.
- **Seletor de idiomas com bandeiras** (mandarim, espanhol, inglês, hindi, português): interface por dicionário estático e **conteúdo por IA contextual** (`POST /api/i18n`) com cache em SQLite; sem chave de IA, mantém o original e avisa.
- **Guia Lume**: mascote vaga-lume animado, arrastável, com silenciar; responde com IA restrita ao acervo público (`POST /api/mitos/guia`) ou por busca local.
- **Museu 3D** (app anterior) aberto em janela interna e em `/app`.
- **API de Mitos**: `GET /api/mitos` (público), `PUT/DELETE /api/mitos/item` (admin e historiador verificado publicam; membros propõem como pendente), `POST /api/mitos/flashcard`.
- **Homologação** em `/teste/`: `BASE_PATH`, `COOKIE_NAME`, reescrita de URLs no HTML e `public/base.js`; `noindex`.
- **Infra**: Dockerfile endurecido (usuário `node`, rootfs somente leitura, sem capabilities, healthcheck), `docker-compose.yml` por ambiente, `deploy/setup-vps.sh` (Docker, Nginx, Certbot com checagem de DNS, UFW, `.env` e senha inicial do root, backup diário), `deploy/remote-deploy.sh` (rollback por imagem `:<ambiente>-previous`), `deploy/nginx-somnia.conf` (SSE sem buffer), GitHub Actions `deploy.yml` (testes → rsync/SSH → publicação) e `promover.yml` (teste → main).
- `tests/mitos.test.js`: 47 verificações (permissões, propostas, ocultar/restaurar semente, tradução, limites, homologação).
- `GET /versao` e versão/ambiente em `/api/auth/me`; `Makefile`.

### Alterado
- `/` agora abre o hub; o app clássico ficou em `/app` (links e login inalterados).
- HTML pode ser exibido em iframe da mesma origem (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`) para as janelas internas; demais respostas continuam `DENY`.
- Chamada à IA centralizada em `callAI()` com timeout de 90 s.
- `systemd` e o Nginx antigo foram movidos para `deploy/legado/`.

### Segurança e LGPD
- Só textos públicos do acervo vão à IA (tradução, flashcards, guia); sonhos e pareceres nunca passam por esses serviços.
- Limites por IP/usuário para tradução (`I18N_PER_HOUR`), guia (`GUIA_PER_HOUR`) e propostas; limpeza profunda e limite de tamanho nos itens.

### Conhecido / próximo ciclo
- Chat em tempo real e videochamada (WebRTC/TURN) estão como esqueleto na janela Comunidade.
- Interface sem teste automatizado de navegador no CI (verificada manualmente com Playwright nesta entrega).
- A página `lendasnm.htm` do Novo Milênio bloqueia leitura automatizada: o acervo foi montado com fontes secundárias e primárias listadas em cada mito e deve ser conferido com o site.
- Atributos das cartas são design de jogo, não dados históricos.
