# Somnia — Documentação técnica e administrativa

> **v0.1.0-alpha:** a raiz `/` agora é o **hub de Mitos** e o app descrito nas seções 1–20 está em `/app`. Instalação recomendada: Docker + GitHub Actions (seção 21.6). As seções 4–5 (systemd) seguem válidas como alternativa; os arquivos estão em `deploy/legado/`.

Público: desenvolvedores que vão manter o código e administradores que operam o servidor.
Usuários finais: ver `public/manual.html` (em `/manual`).

## 1. Visão geral

Somnia é uma aplicação web que une mitologia, psicologia e criação visual:

- **Museu 3D** (three.js) com quadros e esculturas gerados a partir das cartas, avatares especialistas e navegação em 1ª/3ª pessoa.
- **Cartas e decks** com raridade, busca por IA, coleção, relações entre cartas e bibliografia.
- **Registro de sonhos** com visibilidade (privado, profissionais, comunidade) e **pareceres** de profissionais verificados (saúde mental; história e antropologia).
- **Consultas** pagas em créditos com especialistas, **guildas**, **estúdio de jogos** (tabuleiro, RPG, cartas) e **jornada** com conquistas.
- **Economia de créditos** com carteira, pedidos ao administrador, doações, taxas de publicação e pagamento por visualização.
- **Histórico** de ações com restauração, e painel administrativo.

## 2. Arquitetura

```
Navegador                                Servidor (Node 22, sem dependências npm)
┌───────────────────────────┐            ┌───────────────────────────────────────┐
│ public/index.html (app)   │  HTTPS     │ server.js                             │
│  + shim.js  (db/user/ai…) │◄──────────►│  - estáticos (public/) e /uploads     │
│  + server-mode.js (login) │ REST + SSE │  - /api/auth/*  (scrypt, sessões)     │
└───────────────────────────┘            │  - /api/db      (regras por coleção)  │
          ▲                              │  - /api/stream  (tempo real, SSE)     │
          │ Nginx (TLS, proxy)           │  - /api/ai      (proxy Anthropic)     │
          ▼                              │  - /api/upload  (PDF/imagem/áudio)    │
                                         │  SQLite (node:sqlite) em DATA_DIR     │
                                         └───────────────────────────────────────┘
```

Decisões principais:

- **O app foi escrito para um runtime que oferece `window.claude.use(...)`** (banco, usuário, IA, uploads, downloads). Em vez de reescrevê-lo, `shim.js` reimplementa essa interface falando com o servidor. Assim o código do app permanece o mesmo.
- **Toda regra de acesso, preço e privacidade é aplicada no servidor** (`server.js`), nunca só na interface. O navegador é tratado como não confiável.
- O banco é um armazenamento de documentos JSON sobre SQLite: tabela `docs(c, id, j)`, onde `c` é a coleção.
- Tempo real: após cada escrita o servidor envia um evento SSE com o nome da coleção; cada cliente rebusca seus dados (já filtrados pelas permissões).

## 3. Requisitos

- Linux (testado em Ubuntu 22.04/24.04), 1 vCPU e 1 GB de RAM bastam para centenas de usuários.
- **Node.js 22.13 ou superior** (usa o módulo `node:sqlite`, que ainda emite um aviso de "experimental").
- Nginx e Certbot (HTTPS é obrigatório na prática: cookies seguros e senhas em trânsito).
- Opcional: chave da API Anthropic para os recursos de IA.
- O navegador do usuário precisa de acesso a `cdnjs.cloudflare.com` (three.js) e `fonts.googleapis.com` (fontes). Para independência total, baixe os arquivos para `public/vendor/` e ajuste as tags em `index.html` e a CSP em `server.js`.

## 4. Instalação em VPS (Ubuntu)

```bash
# 4.1 Node 22 (se necessário)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx sqlite3
node --version     # deve ser >= 22.13

# 4.2 Usuário e pastas
sudo useradd --system --home /opt/somnia --shell /usr/sbin/nologin somnia
sudo mkdir -p /opt/somnia /var/lib/somnia
sudo cp -r ./* ./.env.example /opt/somnia/
sudo chown -R somnia:somnia /opt/somnia /var/lib/somnia

# 4.3 Configuração
cd /opt/somnia && sudo cp .env.example .env
sudo nano .env        # ROOT_PASSWORD, COOKIE_SECURE=true, DATA_DIR=/var/lib/somnia, ANTHROPIC_API_KEY (opcional)
sudo chown somnia:somnia .env && sudo chmod 600 .env

# 4.4 Serviço systemd
sudo cp deploy/somnia.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now somnia
sudo systemctl status somnia           # logs: journalctl -u somnia -f
curl http://127.0.0.1:3000/healthz     # deve responder: ok
```

## 5. Nginx e HTTPS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/somnia
sudo nano /etc/nginx/sites-available/somnia      # troque seu-dominio.com.br
sudo ln -s /etc/nginx/sites-available/somnia /etc/nginx/sites-enabled/
sudo certbot --nginx -d seu-dominio.com.br       # emite o certificado
sudo nginx -t && sudo systemctl reload nginx
```

Pontos obrigatórios no Nginx: `proxy_buffering off` em `/api/stream` (tempo real) e `client_max_body_size 25m` (uploads de até 20 MB). Com Nginx na frente, mantenha `HOST=127.0.0.1` e `TRUST_PROXY=true`.

Firewall: `sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable`. Não exponha a porta 3000.

### Docker (alternativa)

```bash
cp .env.example .env && nano .env
docker compose up -d --build        # dados no volume "somnia-data"; porta 127.0.0.1:3000
```

## 6. Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | 3000 | Porta HTTP |
| `HOST` | 127.0.0.1 | Interface de escuta (`0.0.0.0` em Docker) |
| `COOKIE_SECURE` | false | `true` em HTTPS (marca o cookie como Secure) |
| `TRUST_PROXY` | false | `true` atrás do Nginx, para registrar o IP real |
| `DATA_DIR` | ./data | Banco `somnia.db` e pasta `uploads/` |
| `ROOT_PASSWORD` | (gerada) | Senha inicial do `root`, usada só se o root ainda não existir |
| `ALLOW_PRIVATE_CONNECTORS` | false | `true` permite que conectores acessem endereços da rede privada (bases do ecossistema no mesmo servidor/rede). Mantenha `false` se a fonte for pública |
| `ALLOW_HTTP_CONNECTORS` | false | `true` permite conectores sem HTTPS (use só em rede confiável) |
| `ANTHROPIC_API_KEY` | vazio | Ativa os recursos de IA. Vazio desativa |
| `ANTHROPIC_MODEL` | claude-sonnet-5-5 | Modelo usado pelo proxy de IA |
| `AI_PER_HOUR` | 30 | Limite de chamadas de IA por usuário por hora |

Se `ROOT_PASSWORD` estiver ausente ou tiver menos de 8 caracteres, o servidor gera uma senha aleatória e a imprime **uma vez** no log do primeiro boot. Senhas com menos de 12 caracteres geram aviso.

## 7. Estrutura do pacote

```
server.js                 servidor completo (rotas, regras, créditos, IA, uploads)
package.json              scripts: start, reset-root
.env.example              modelo de configuração
Dockerfile, docker-compose.yml
deploy/                   somnia.service, nginx.conf.example, backup.sh
public/index.html         aplicação (interface, museu 3D, lógica de negócio do cliente)
public/shim.js            ponte window.claude -> API do servidor
public/server-mode.js     login/cadastro/logout/senha via servidor
public/manual.html        manual do usuário
tests/api.test.js         62 testes de API (permissões, créditos, privacidade, segurança)
tests/market.test.js      56 testes do marketplace (importação, execução isolada, compra, conectores, SSRF)
examples/                 jogo standalone (.zip), pacote Somnia (.json) e lote (.csv) de exemplo
data/ (ou DATA_DIR)       criado em execução: somnia.db e uploads/
```

## 8. Administração

### 8.1 Primeiro acesso
1. Entre com `root` e a senha definida em `ROOT_PASSWORD`.
2. Na aba **Cartas**, o botão "Carregar cartas de exemplo" cria 4 cartas, a bibliografia inicial e uma guilda (conteúdo de demonstração, não verificado: revise ou exclua).
3. Em **Admin**, revise os preços e a seção de usuários.
4. Troque a senha pelo ícone de chave.

### 8.2 Papéis
| Papel | Pode |
|---|---|
| `membro` | Usar o app, registrar sonhos, publicar (pagando), consultar |
| `saude` (verificado) | Pareceres clínicos, responder consultas de saúde mental, ler sonhos compartilhados |
| `historia` (verificado) | Pareceres histórico-antropológicos, responder consultas da área, analisar cartas |
| `admin` | Aprovar cartas, gerir usuários, créditos, preços, fontes; ver histórico geral |
| `root` | Administrador raiz (não pode ser alterado por outros admins) |

Um profissional só ganha acesso quando o papel **e** a marca "verificado" estão definidos pelo administrador.

### 8.3 Verificar profissionais
O usuário envia o pedido em Sonhos > "Sou profissional" (área e registro CRP/CRM/instituição). Em **Admin > Usuários**, o admin vê o pedido, **confere o registro no conselho profissional ou na instituição** (o sistema não faz essa checagem), define a área ("Saúde mental" ou "História/Antropologia") e clica em "Verificar profissional".

### 8.4 Corretora de créditos
Em **Admin**, a seção "Corretora de créditos" lista pedidos pendentes. O admin informa a quantidade (pode ser diferente da pedida) e escolhe **Entregar** ou **Negar** (com observação). Também é possível entregar créditos diretamente a um usuário. A receita da plataforma (taxas, publicações, parte das consultas e visualizações) é o saldo do `root`.

### 8.5 Preços e custo base
Em **Admin > Preços**: créditos iniciais, publicar carta, publicar sonho, ver carta, ver sonho, ver parecer, consulta e percentual do especialista. O "custo base" soma infraestrutura (6) + moderação (4) + IA (4) + armazenamento (6) = **20 créditos** por carta publicada (e metade disso por sonho). O botão "Calcular e aplicar" grava esses valores. Alterações valem para novas operações; o servidor passa a validar os novos preços imediatamente.

### 8.6 Moderação
- Cartas de usuários nascem como **pendentes**; o admin aprova ou exclui em Admin.
- Suspender um usuário bloqueia o login e qualquer escrita.
- Todas as ações ficam em **Histórico**; o admin restaura qualquer uma (exceto sonhos, que não são registrados por privacidade).

### 8.7 Senhas
- Trocar a senha do root: `cd /opt/somnia && sudo -u somnia NEW_ROOT_PASSWORD='nova-senha-longa' node server.js --reset-root` (ou sem a variável, para digitar). Encerra as sessões do root.
- Usuário comum: o próprio usuário troca pelo ícone de chave. **Não há recuperação automática nem tela de admin para redefinir a senha de terceiros.** Procedimento manual, combinado com o usuário (qualquer pessoa poderia assumir o nome enquanto ele estiver livre):
  `sqlite3 /var/lib/somnia/somnia.db "DELETE FROM accounts WHERE id='fulano';"` e o usuário se cadastra de novo com o mesmo nome. Documentos e créditos permanecem e a boas-vindas não é concedida de novo.

### 8.8 Auditoria
A tabela `audit` guarda cadastros, logins (inclusive falhos e bloqueados), trocas de senha, erros de IA e escritas administrativas:
```bash
sqlite3 /var/lib/somnia/somnia.db "select datetime(ts/1000,'unixepoch'),u,ip,ev,d from audit order by id desc limit 50;"
```

### 8.9 Backup e restauração
- Agende `deploy/backup.sh` no cron (`0 3 * * *`): copia o banco com `.backup` (seguro com o servidor ligado) e compacta `uploads/`, mantendo 14 dias.
- **Restaurar:** `systemctl stop somnia`, copie o `.db` de volta para `DATA_DIR/somnia.db`, extraia `uploads`, `systemctl start somnia`.
- Guarde cópias fora do servidor. Os backups contêm dados sensíveis (sonhos): proteja-os (disco criptografado ou `gpg`).

### 8.10 Atualização
`systemctl stop somnia`, faça backup, substitua os arquivos do pacote **preservando `.env` e `DATA_DIR`**, `systemctl start somnia`. Novas coleções ou campos não exigem migração (armazenamento por documentos).

## 9. Modelo de dados

Coleções (tabela `docs`), cada uma com documentos JSON:

| Coleção | Campos principais |
|---|---|
| `cards` | title, deck, rarity, summary, history, details, tags[], files[{name,url}], rels[{to,kind}], bib[ids], status (`pendente`/`publicada`), author, ts |
| `dreams` | title, text, date, affects[], elements[], int (1-5), rec, vis (`privado`/`prof`/`com`), link, author, ts |
| `pareceres` | t (`dream`/`card`), tid, kind (`saude`/`historia`), leitura, afetos, atencao, contexto, evidencia, nota, parallels[], bib[], byRole, byName, author, ts |
| `consults` | from, kind, topic, q, price, status (`aberta`/`respondida`), answer, expert, expertName, answeredAt, ts |
| `ledger` | from, to, amt, reason, ref, ts (imutável; `from='sys'` é emissão) |
| `requests` | user, name, amt, reason, status, note, decidedBy, ts |
| `users` | name, role, status, verified, root, joined, last, pedido{tipo,registro} |
| `groups`, `posts` | name, theme, desc, members[], owner / gid, name, author, text, ts |
| `biblio` | title, author, year, area, note, ver (`a verificar`/`verificada`), by |
| `history` | coll, doc, action, before, after, title, by, byName, ts, undone |
| `config` | documento `prices` com os preços |
| `data/users/<id>` | documento `progress` {xp, got[]} (XP e coleção) |

Tabelas próprias: `accounts` (hash scrypt, nunca exposta; a API devolve só id e nome), `sessions` (token, usuário, validade), `audit`.

**Saldo** = soma dos lançamentos recebidos − soma dos enviados. **Disponível** = saldo − valor reservado em consultas abertas.

## 10. Regras de acesso (aplicadas em `server.js`)

| Coleção | Leitura | Escrita |
|---|---|---|
| cards | publicadas, as suas e (admin) todas. `history` e `details` só para autor, admin, profissional verificado ou quem pagou | criar: autenticado, nasce `pendente` e exige taxa paga; editar: autor/admin; qualquer um só altera `rels` e `bib`; excluir: autor/admin |
| dreams | autor; `com` para todos (texto só após pagar); `prof` para profissionais | autor (exige taxa para `com`); admin pode excluir. Admin **não** lê sonhos privados |
| pareceres | de sonho: segue a visibilidade do sonho; corpo só para dono do sonho, profissional, autor ou quem pagou | criar: só profissional verificado da área (ou admin); autor/admin editam e excluem |
| consults | dono, respondedor, admin e profissionais da área (abertas) | criar: preço definido pelo servidor, exige saldo; responder: profissional da área |
| ledger | admin; ou quem é origem/destino | só criar. Origem = si mesmo e com saldo; `sys` só admin ou conquista (valor fixo, uma vez). Valores mínimos validados |
| requests | admin e o próprio | criar (1 pendente por vez); só admin decide |
| users | todos (sem `pedido`, que só admin e o próprio veem) | o próprio altera nome/último acesso/pedido; só admin altera papel, status e verificação; ninguém altera o root |
| groups, posts, biblio | todos | dono/autor/admin; membros alteram só a própria participação; fonte só admin altera |
| history | admin e autor da ação | criar; marcar restaurada: autor/admin |
| config | todos | só admin |

Falhas retornam HTTP 401 (sem login), 402 (créditos ou taxa), 403 (permissão), 409 (duplicado), 429 (limite).

## 11. Economia de créditos

| Evento | Quem paga | Quem recebe |
|---|---|---|
| Boas-vindas | sistema | novo usuário (padrão 100) |
| Ver histórico/detalhes de carta (padrão 3) | leitor | autor da carta (cartas do sistema: root) |
| Ver sonho da comunidade (padrão 5) | leitor | autor do sonho |
| Ver parecer (padrão 3) | leitor | especialista (percentual `expertShare`, padrão 70%) e root (resto) |
| Consulta (padrão 15) | solicitante (valor reservado) | especialista que responde (70%) e root (30%) |
| Publicar carta (20) / sonho público (10) / deck (n × 20) | autor | root |
| Doação | doador | pessoa escolhida |
| Conquistas (valores fixos 10–40) | sistema | usuário, uma vez cada |
| Pedidos aprovados / entrega direta | sistema | usuário |

Conteúdo pago fica desbloqueado para sempre (vale o lançamento com a referência `card:`, `dream:` ou `par:`). Profissionais verificados e o admin leem sem pagar.

## 12. API

Todas as escritas exigem o cabeçalho `X-Requested-With: somnia` e cookie de sessão (`somnia_sid`, HttpOnly, SameSite=Lax).

| Método e rota | Descrição |
|---|---|
| `GET /api/auth/me` | usuário da sessão e se a IA está ativa |
| `POST /api/auth/register` `{u,name,p}` | cria conta, concede boas-vindas e inicia sessão |
| `POST /api/auth/login` `{u,p}` | login (limite de tentativas por IP e por usuário) |
| `POST /api/auth/logout` | encerra a sessão |
| `POST /api/auth/password` `{old,new}` | troca a senha e encerra as outras sessões |
| `GET /api/db?c=<coleção>` | lista documentos já filtrados pelas permissões |
| `PUT /api/db?c=&id=` (corpo JSON) | cria ou substitui um documento (regras da seção 10) |
| `DELETE /api/db?c=&id=` | exclui um documento |
| `GET /api/stream` | eventos SSE `{c: coleção}` a cada escrita |
| `POST /api/ai` `{prompt}` | proxy para a IA (chave só no servidor) |
| `POST /api/upload` (corpo binário, `X-Filename`) | guarda PDF, imagem ou áudio (até 20 MB); devolve `{url}` |
| `POST /api/games/import` (admin; corpo binário, `X-Filename`, `X-Meta`) | importa jogo: .json, .html, .zip ou .csv |
| `POST /api/games/play` `{id}` | devolve o link temporário de execução de um jogo standalone (exige desbloqueio) |
| `POST /api/games/connector` `{id, dry}` (admin) | testa (`dry`) ou sincroniza um conector externo |
| `GET /api/admin/stats` (admin) | disco, uptime, eventos de segurança |
| `GET /g/<token>/<id>/<arquivo>` | arquivos do jogo, em sandbox, com token assinado de 6 h |
| `GET /uploads/<arquivo>`, `/manual`, `/healthz` | arquivos enviados, manual, verificação de saúde |

## 13. Front-end (para quem altera a interface)

- `public/index.html` é um arquivo único com CSS, a lógica do app e o museu 3D. Os blocos aparecem em ordem: dados e tema → cartas, grupos, estúdio, bibliografia → histórico e usuários → sonhos e pareceres → login e créditos → museu 3D → `render()`.
- A interface é um `view()` que redesenha `#app` conforme `S.tab`; ações de botões usam `data-a` e caem em `ACT2` (um despachante central).
- `window.claude.use('db')` (e `user`, `sample`, `assets`, `downloads`) é fornecido por `shim.js`. Para trocar o back-end, basta reimplementar esse contrato.
- `server-mode.js` substitui login, cadastro, logout e senha pelas rotas do servidor e restaura a sessão ao recarregar.
- **Cenários:** `SCN` (em `index.html`) define cinco paletas de mundo 3D (místico, espacial, mágico, mangá, low poly) e `scnApply(id)` troca o atributo `data-scenario` do `<html>`, reconstrói o mundo 3D (`muRebuild`) e grava a escolha em `localStorage` (`somnia-scn`). O visual da interface vem de variáveis CSS por cenário (bloco "v5"); para criar um cenário novo, adicione uma entrada em `SCN` e um bloco `html[data-scenario=...]` com as mesmas variáveis. As cores de texto e fundo de todos os cenários foram conferidas para contraste mínimo de 4,5:1 (WCAG AA); repita essa conferência ao alterar paletas.
- **Navegação no museu:** `MU.mode` = 2 (isométrica, padrão), 3 (3ª pessoa) ou 1 (1ª pessoa). O clique duplo é detectado em `pointerup` (janela de 320 ms e 14 px; o clique simples é adiado 300 ms para não conflitar). `muDouble` converte o clique em destino (raio contra o chão ou contra uma obra) e `muGoTo` define `MU.goal`; `muLoop` anda até o destino com colisão (`muClamp`), desiste se ficar preso por 0,4 s e executa a ação associada ao chegar. O minimapa (`muMap`) também aceita clique.
- **Área de trabalho (shell):** `shellSync()` mantém três camadas: papel de parede (`#desk` com `#wall`, uma cena three.js própria), janela do aplicativo (`#win`, que contém o `#app` original) e Launchpad (`#lpad`). A barra de menus é desenhada por `hud()` e o dock por `nav()`. Instalação de jogos no desktop é local por usuário (`localStorage`, chave `somnia-inst-<usuário>`). Esc fecha menu, Launchpad e janela, nessa ordem.
- **Mascote Secreto-Bot:** `buildBot(opts)` constrói o modelo (código derivado de `public/mascote.html`, o arquivo original, servido em `/mascote`) com `lo:true` para a versão simplificada usada como avatar do museu (`botAvatar()`, escala 0,42) e a detalhada usada no papel de parede (`wallInit/wallDraw`). Os materiais são compartilhados (`botMats()`). O papel de parede pausa quando o Museu está aberto, quando a aba fica oculta e fica estático com `prefers-reduced-motion`. Sem WebGL, vale a imagem embutida em CSS (`#desk`, versão reduzida da arte do mascote).
- O museu usa three.js r128 (UMD, fixada), sem dependências de build. Obras e esculturas são recriadas só quando os dados mudam.

## 14. Segurança

**Implementado**
- Senhas com scrypt (N=16384) e sal único; comparação em tempo constante; hashes nunca saem do servidor.
- Sessões aleatórias de 256 bits no banco, cookie HttpOnly + SameSite=Lax (+ Secure em HTTPS), validade de 7 dias.
- Limite de tentativas de login (6 por usuário e 20 por IP a cada 15 min), de cadastros, de escritas e de IA.
- Proteção CSRF (cabeçalho obrigatório + SameSite), CSP, `X-Frame-Options`, `nosniff`.
- Regras de acesso, privacidade de sonhos e paywall de conteúdo **no servidor**; validação e limpeza de todos os campos; limites de tamanho.
- Uploads só de tipos permitidos, com nome aleatório; SVG e HTML não são aceitos.
- A chave da IA fica só em `.env` (mode 600), nunca vai ao navegador.
- Auditoria de eventos sensíveis.

**Limitações conhecidas (planeje antes de uso público em larga escala)**
1. **Conquistas** são verificadas no navegador. O servidor limita o valor (tabela fixa) e permite cada uma só uma vez por usuário, mas não confere a condição. Exposição máxima: 145 créditos por conta.
2. Na divisão de pareceres, o servidor valida o valor mínimo do pagamento ao especialista, mas não o da taxa do root.
3. Fontes criadas por usuários comuns não podem ser desfeitas por eles no Histórico (só admin exclui).
4. Não há verificação de e-mail, recuperação de senha automática, nem autenticação em dois fatores.
5. SQLite em um único processo: ótimo para centenas de usuários simultâneos. Acima disso, migre para PostgreSQL.
6. O módulo `node:sqlite` é experimental no Node 22. Fixe a versão do Node e teste antes de atualizar.
7. O admin tem acesso aos sonhos de visibilidade `prof` e `com`, e o operador do servidor tem acesso físico ao banco: trate o disco e os backups como dados sensíveis.
8. Bibliotecas e fontes carregam de CDNs externos (veja a seção 3).

## 15. Proteção de dados (LGPD)

Sonhos e pareceres podem revelar saúde mental e vida íntima, que são **dados pessoais sensíveis**. Antes de abrir ao público: defina o controlador e o encarregado (DPO), escreva política de privacidade e termos de uso, obtenha consentimento específico, ofereça exportação e exclusão de dados, criptografe disco e backups, restrinja o acesso ao servidor e defina prazos de retenção. O app já exibe avisos sobre anonimização e o CVV (188). Consulte um profissional jurídico: esta documentação não é parecer legal. Pareceres na plataforma não substituem atendimento clínico, e o regulamento do seu conselho profissional (por exemplo, CFP e CFM) se aplica a quem atua como especialista.

## 16. Solução de problemas

| Sintoma | Causa provável e ação |
|---|---|
| `Cannot find module 'node:sqlite'` | Node antigo. Instale a versão 22.13+ |
| Página abre mas não carrega dados / tempo real não atualiza | Nginx sem `proxy_buffering off` em `/api/stream` |
| Login funciona, mas cai logo | `COOKIE_SECURE=true` em acesso por HTTP. Use HTTPS |
| Upload falha | Tipo não permitido, mais de 20 MB, ou `client_max_body_size` pequeno no Nginx |
| IA sem resposta (503) | `ANTHROPIC_API_KEY` ausente ou inválida; veja `journalctl -u somnia` |
| Erro 429 | Limite de tentativas ou de IA atingido; aguarde |
| Museu em branco | Sem WebGL ou CDN bloqueado; veja o console do navegador |
| Ficou sem a senha do root | `node server.js --reset-root` no servidor |
| Banco travado/corrompido | Pare o serviço e restaure o último backup (seção 8.9) |

Logs: `journalctl -u somnia -f`. Saúde: `curl http://127.0.0.1:3000/healthz`.

## 17. Testes

```bash
DATA_DIR=/tmp/sd PORT=3999 ROOT_PASSWORD=testroot-123456 node server.js &
node tests/api.test.js          # 62 verificações; deve terminar com "0 falhas"
node tests/market.test.js       # 56 verificações do marketplace (sobe os próprios servidores)
```
Cobrem: autenticação, limite de tentativas, CSRF, forja de créditos, saldo insuficiente, taxas de publicação, paywall de cartas e sonhos, privacidade de sonhos (inclusive para o admin), escalada de privilégio, verificação de profissionais, consultas, conquistas, pedidos de crédito, imutabilidade do extrato e suspensão de contas.
**A interface (navegador, museu 3D, animações) não tem teste automatizado**: valide manualmente após cada alteração, em desktop e celular.

## 18. Licenças de terceiros

three.js (MIT), carregado de cdnjs. Fontes Fredoka, Inter, Bangers, Cinzel e Orbitron (SIL Open Font License), carregadas do Google Fonts. Nenhum pacote npm é instalado.

## 19. Evoluções sugeridas

PostgreSQL e filas para escala; e-mail (verificação, recuperação de senha, avisos); 2FA para admin e profissionais; painel de redefinição de senha; validação das conquistas no servidor; exportação/exclusão de dados do titular; moderação de conteúdo e denúncias; gateway de pagamento caso créditos passem a ter valor monetário (exige estudo fiscal e jurídico); vendorizar bibliotecas e fontes; testes de interface automatizados.

## 20. Marketplace de jogos e área administrativa

### 20.1 Visão geral
A **Loja** (🎮, todos os usuários) lista os jogos com status `publicado`. A **Administração** (👑) virou um painel em estilo marketplace, com menu lateral:

| Seção | Função |
|---|---|
| Visão geral | KPIs (usuários, receita da plataforma, volume de créditos, jogos, cartas, sonhos, consultas, pedidos), gráficos de 14 dias (novos usuários, créditos movimentados), receita por origem, jogos por gênero, jogos mais populares, pendências, atividade recente e métricas do servidor (disco, uptime, eventos de segurança) |
| Catálogo de jogos | Lista com filtros por status; editar, publicar, arquivar e excluir; criar listagens manuais |
| Importar jogos | Envio de .json, .html, .zip e .csv; modelos para download |
| Conectores M3D | Integração com outras bases do ecossistema por API HTTP/JSON |
| Aprovações | Cartas e jogos pendentes |
| Créditos | Corretora: pedidos, entregas, preços e custo base |
| Usuários | Papéis, verificação e suspensão |

O Estúdio de jogos tem o botão **Enviar ao catálogo de jogos** (só admin), que cria um jogo no formato Somnia (rascunho) a partir da base gerada.

### 20.2 Modelo de dados
`games`: title, desc, genre, tags[], cover (somente `/uploads/...`), kind (`somnia` | `standalone` | `external`), source (`manual` | `import` | `csv` | id do conector), extId, price (créditos), status (`rascunho` | `pendente` | `publicado` | `arquivado`), author, entry (arquivo inicial do standalone), url (externo), content ({mode, markdown, cards[]} para `somnia`), version, notes, ts, plays.
Ao ler, o servidor acrescenta `buys`, `rating {avg, n}`, `mine` (voto do usuário) e `owned`, e **remove `content` e o `url` de jogos externos** de quem ainda não desbloqueou.
`connectors`: name, url, format (`generico` | `somnia`), listPath, mapping, authHeader, token (nunca devolvido: a leitura traz `token:''` e `hasToken`), factor, lastSync, lastResult, status.
`ratings` (id = `<jogo>:<usuário>`): stars 1 a 5; só quem desbloqueou o jogo avalia.

### 20.3 Formatos de importação
Todo jogo importado entra como **pendente**.

**Pacote Somnia (.json), formato "da plataforma"**
```json
{ "format": "somnia-game", "version": 1,
  "title": "Nome", "description": "Texto", "genre": "RPG", "tags": ["a","b"],
  "mode": "rpg", "content": "# Regras em Markdown",
  "cards": [{ "title": "Mara", "deck": "Sono", "rarity": "Épica", "summary": "..." }] }
```
Vários jogos: `{ "format": "somnia-catalog", "games": [ ...pacotes... ] }` (até 200). Modelos e um exemplo estão em `examples/` e na tela de importação.

**Standalone (.html ou .zip)**: jogo HTML5 independente.
- `.html`: um arquivo único vira `index.html`.
- `.zip`: precisa de `index.html` na raiz (ou dentro de uma única pasta). Opcionalmente `somnia.json` com `title`, `description`, `genre`, `tags`, `price`, `version` e `cover` (caminho de uma imagem dentro do ZIP). Os campos preenchidos no formulário prevalecem sobre o manifesto.
- Limites: até 400 arquivos, 25 MB por arquivo, 80 MB descompactados, 60 MB de upload. ZIP criptografado e ZIP64 não são aceitos.
- Tipos permitidos: html, htm, js, mjs, css, json, txt, md, xml, csv, png, jpg, gif, webp, svg, ico, mp3, ogg, wav, m4a, mp4, webm, woff, woff2, ttf, otf, wasm, glb, gltf, bin, atlas, map. Outros arquivos são ignorados e listados como aviso. Caminhos com `..`, absolutos ou ocultos (iniciados por ponto) são descartados (proteção contra zip-slip).

**Lote (.csv)**: colunas `title` (obrigatória), `description`, `genre`, `tags` (separadas por `;`), `price`, `url`. Cria listagens externas (até 500 linhas).

### 20.4 Execução isolada de jogos standalone
O jogo roda num `iframe` com `sandbox="allow-scripts allow-pointer-lock allow-fullscreen"` (**sem** `allow-same-origin`), e os arquivos são servidos por `/g/<token>/<id>/...` com `Content-Security-Policy: sandbox ...; connect-src 'self' data: blob:`. Consequências: o jogo tem origem opaca, **não lê cookies, não chama a API do Somnia e não acessa a internet**. O token é um HMAC (segredo em `DATA_DIR/.secret`) com validade de 6 horas, emitido por `/api/games/play` somente a quem desbloqueou o jogo (ou ao admin). O token vai no caminho da URL para que arquivos relativos carreguem sem cookies. Recomenda-se revisar o jogo antes de publicar: o isolamento limita danos, mas não impede conteúdo impróprio nem consumo de CPU.

### 20.5 Conectores (integração com outras bases do ecossistema)
Um conector lê um catálogo por **GET** em uma API que devolve JSON (lista na raiz, em `games` ou no caminho informado em "caminho da lista", por exemplo `data.items`). A autenticação opcional é enviada no cabeçalho informado (padrão `Authorization: Bearer <token>`; com outro nome de cabeçalho, o token é enviado como está).
- **Mapeamento:** objeto `{campo do Somnia: caminho na fonte}` com os campos `id`, `title`, `desc`, `genre`, `tags`, `cover`, `price`, `url`, `version` (caminhos com pontos, ex.: `info.nome`). Itens sem `id` ou sem `title` são ignorados.
- **Preço:** `preço da fonte × fator` arredondado, em créditos.
- **Sincronização:** cria jogos externos pendentes (id estável derivado de conector + id externo), baixa a capa para o servidor (até 60 por sincronização, 2 MB, só imagens) e, em novas execuções, **atualiza título, descrição, gênero, etiquetas, link, versão e capa sem duplicar e sem desfazer edições** de preço e status feitas pelo admin. Máximo de 500 itens por sincronização. O botão **Testar** mostra uma amostra sem gravar.
- **Segurança (SSRF):** por padrão só aceita `https`, resolve o endereço e **bloqueia IPs privados, de loopback e link-local**, não segue redirecionamentos, limita o tempo (10 s) e o tamanho (5 MB). Para bases na rede interna, habilite `ALLOW_PRIVATE_CONNECTORS=true`; para `http`, `ALLOW_HTTP_CONNECTORS=true`. Há uma janela teórica de DNS rebinding entre a verificação e a conexão: use apenas fontes confiáveis.
- **O que o pacote não faz:** não conecta direto a bancos SQL (MySQL, PostgreSQL etc.). Se a base de origem só existe em SQL, exponha uma API de leitura (ou um export em JSON/CSV) e use conector ou importação. Os formatos reais das bases M3D não são conhecidos por este projeto: o mapeamento é configurável justamente para isso; se houver documentação, é simples acrescentar um modelo pronto.

### 20.6 Compra, avaliação e regras
- **Compra:** lançamento do usuário para o autor do jogo (cartas e jogos do sistema: `root`) com `ref = game:<id>`, valor igual ao preço atual, uma vez por jogo. O servidor valida valor mínimo, destinatário e duplicidade, e só aceita jogos publicados. Jogos grátis não exigem lançamento.
- **Leitura:** usuários comuns só veem jogos publicados; `content` e `url` externo só chegam a quem desbloqueou. Admin vê tudo.
- **Escrita:** só o admin cria, edita, publica e exclui jogos e conectores. Excluir um standalone apaga seus arquivos. Jogos standalone só nascem pela importação.
- **Receita:** compras de jogos do sistema entram no saldo do `root` e aparecem no dashboard (origem "Jogos").
- **Limitações:** o dashboard calcula as métricas no navegador a partir das coleções (adequado a milhares de registros; acima disso, mova o cálculo para o servidor). Na versão hospedada no claude.ai (sem este servidor), a Loja e o catálogo funcionam apenas com cadastro manual: importação, conectores e execução de standalone exigem esta versão.


## 21. Hub de Mitos e infraestrutura (v0.1.0-alpha)

### 21.1 Estrutura
```
public/hub/index.html, hub.css      área de trabalho, janelas, dock, estilos (HQ, RPG, infográfico)
public/hub/core.js                  estado, API, gerenciador de janelas, idiomas, sons, notificações
public/hub/art.js                   SVG procedural: ícones Pixar, cenas HQ, retratos, ícones semânticos, bandeiras, Lume
public/hub/i18n.js                  dicionário da interface (zh, es, en, hi, pt)
public/hub/modules/*.js             biblioteca (+boas-vindas), personagens, flashcards, jogos, grafo, outros (agenda, museu, comunidade, ajuda, guia)
public/mitos/santos.json            acervo semente: fontes, 16 mitos (com flashcard), 25 personagens
public/base.js                      prefixo de URLs em homologação (BASE_PATH)
src/mitos.js                        rotas /api/mitos*, /api/i18n (módulo do servidor)
src/prompts/flashcard-mitos.md      engenharia de prompt do gerador de flashcards
```
Cada módulo registra `HUB.mod(id, {title, w, h, render(win)})`. `HUB.open(id, arg)` abre/foca a janela; `render` redesenha `win.body`. Textos de conteúdo levam a classe `tr` (traduzidos sob demanda); rótulos de interface usam `data-i18n`.

### 21.2 Modelo de dados do acervo
- **Mito**: `id, titulo, subtitulo, local, municipio, epoca, ano (referência para ordenar), tipo (assombração|milagre|criatura|fenômeno|encantamento|história-lenda), motivo (cena SVG), raridade, resumo, historia, personagens[], tags[], fontes[chaves], datas[{d,t}], sensivel?, flashcard{pergunta, b{etapas[4]{t,d,ic}, critico}, c{manifestacao,contexto,inflexao,chave}, d{entrada, literal{rotulo,itens[]}, simbolica{rotulo,itens[]}, cruzamento}, e{pontos[], glossario[[termo,significado]]}}`.
- **Personagem**: `id, nome, papel, classe, tipo (retrato), raridade, historico (historico|lenda|coletivo|devocao|cronica|incerto), mitos[], bio, atributos{misterio,coragem,fe,astucia,assombro} (1–10, lúdicos), habilidade`.
- **Fonte**: `t` (referência formatada), `url`, `tipo` (primaria|secundaria), `nota`.
- No banco: coleções `myths` e `mchars` (tabela `docs`). Um documento com o mesmo id de um item da semente **substitui** o item; `status: oculto` o esconde; excluir o documento restaura a semente.

### 21.3 Regras (servidor)
| Ação | Quem |
|---|---|
| Ler `GET /api/mitos` | todos (sem login); pendentes só para curadores e para o autor da proposta |
| Criar/editar com status livre | admin ou profissional verificado `historia` (curador) |
| Propor (vira `pendente`) | membro autenticado; edita só a própria proposta enquanto pendente; 20/h |
| Excluir | admin; autor de proposta pendente |
| Gerar flashcard por IA | curador, com `ANTHROPIC_API_KEY` |
| Guia Lume por IA | usuário autenticado, `GUIA_PER_HOUR` (padrão 20) |
| Tradução `POST /api/i18n` | todos; cache por hash (idioma+texto) em `i18n`; IA só para textos fora do cache, `I18N_PER_HOUR` por IP (padrão 60); até 80 textos/40 mil caracteres por chamada |

### 21.4 Homologação (`BASE_PATH`)
Com `BASE_PATH=/teste`: o servidor aceita caminhos com e sem o prefixo, redireciona `/teste` → `/teste/`, reescreve `src/href/action="/..."` nos HTML, injeta `window.SOMNIA_BASE` e `base.js` (prefixa `fetch`, `EventSource`, XHR, `window.open` e atributos criados dinamicamente) e marca `noindex`. Use `COOKIE_NAME=somnia_sid_teste` para não misturar sessões; o cookie recebe `Path=/teste`.

### 21.5 Variáveis novas
| Variável | Padrão | Descrição |
|---|---|---|
| `BASE_PATH` | vazio | prefixo do ambiente (ex.: `/teste`) |
| `COOKIE_NAME` | somnia_sid | nome do cookie de sessão |
| `I18N_PER_HOUR` | 60 | traduções por IA por IP/hora (cache não conta) |
| `GUIA_PER_HOUR` | 20 | perguntas ao Guia Lume por usuário/hora |
| `AMBIENTE`, `CONTAINER`, `PORT_HOST`, `DATA_PATH` | — | usadas pelo `docker-compose.yml` |

### 21.6 Deploy com Docker e GitHub Actions
- `deploy/setup-vps.sh --ambiente producao|teste` (idempotente): Docker + Compose, Nginx, Certbot (confere se o DNS aponta para a VPS antes de emitir), UFW (SSH e Nginx Full), pastas, `.env` do ambiente, `.env.gerado` com a senha inicial do root, cron de backup 03:17.
- `deploy/remote-deploy.sh --ambiente …`: marca a imagem atual como `somnia:<amb>-previous`, `docker compose build && up -d`, espera `/healthz` por 60 s e faz rollback se falhar.
- `.github/workflows/deploy.yml`: testes (sintaxe + 3 suítes) → rsync para `/opt/somnia[-teste]` (sem `.env*` e `data/`) → `SERVIDOR_ENV` em `.env.segredos` → `setup-vps.sh` na primeira vez (ou `configurar_vps`) → publicação → checagem no domínio.
- `.github/workflows/promover.yml`: digitar `PROMOVER` faz fast-forward de `main` a partir de `teste` e chama o deploy de produção.
- Container: usuário `node`, rootfs somente leitura (escrita só em `/data` e `/tmp`), `cap_drop: ALL`, `no-new-privileges`, 384 MB, porta só em `127.0.0.1`.
- Backups: `/var/backups/somnia/<ambiente>/` (14 dias). Restauração: `docker compose -p somnia stop`, copie o `.db` para `/var/lib/somnia/somnia.db`, `docker compose -p somnia --env-file .env up -d`.

### 21.7 Acervo e rigor
O acervo foi resumido com palavras próprias a partir das fontes listadas em cada mito (Prefeitura de Santos/Fams, Memória Santista/Almanaque de Santos, Del Passo, Juicy Santos, Revista de História USP, Câmara Cascudo) e de fontes primárias quando existem (Gândavo 1576; relato de Spilbergen 1619; Frei Gaspar 1797; folheto de 1821 na BBM-USP). Divergências de datas e versões aparecem no ponto crítico de cada flashcard. A série de lendas do Novo Milênio (`novomilenio.inf.br/santos/lendasnm.htm`) é a referência indicada pelo projeto, mas bloqueia leitura automatizada: confira manualmente e acrescente mitos por proposta (curadoria) ou editando `santos.json`.

### 21.8 Testes
`make test` roda `api.test.js` (62), `market.test.js` (56) e `mitos.test.js` (47). A interface do hub foi verificada com Playwright (desktop 1440×900 e celular 390×844, sem erros de JavaScript); não há teste de navegador no CI.
