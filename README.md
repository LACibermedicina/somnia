# Somnia — Mitos e Lendas de Santos · v0.1.0-alpha

**PROJETO_NOME:** Somnia · **SUBDOMINIO:** somnia.m3d.pro · **Homologação:** somnia.m3d.pro/teste/

Hub estilo macOS com ícones animados "Pixar" que dá acesso a:

| Módulo | O que é |
|---|---|
| Biblioteca | 16 lendas de Santos e da Baixada Santista em cards ilustrados estilo HQ, linha do tempo e leitura em painéis com fontes |
| Personagens | 25 cartas RPG vinculadas aos mitos (retrato, atributos lúdicos, habilidade, biografia) |
| Flashcards | infográfico de 4 quadrantes (padrão acadêmico e simbólico) com repetição espaçada e geração por IA |
| Jogos | Duelo de Cartas, Quiz dos Mitos e a Loja de jogos do Somnia |
| Grafo · Agenda | relações mito ↔ personagem (arrastar e soltar) · datas dos mitos e notas locais |
| Museu 3D | o Somnia clássico (contas, sonhos, cartas, guildas, loja), também em `/app` |
| Guia Lume | mascote com IA restrita ao acervo; bandeiras traduzem a tela (5 idiomas) |

- Mudanças: [`CHANGELOG.md`](CHANGELOG.md) · Documentação técnica: [`DOCUMENTACAO.md`](DOCUMENTACAO.md) (seção 21 para esta versão) · Manual do app clássico: `/manual`
- Acervo: `public/mitos/santos.json` (fontes em cada mito) · Prompt do gerador de flashcards: `src/prompts/flashcard-mitos.md`

## Rodar localmente
```bash
node --version          # 22.13+
make run                # http://127.0.0.1:3000  (root / dev-root-123456)
make test               # 62 + 56 + 47 verificações
```
Sem dependências npm.

## Publicar (GitHub Actions → VPS)
1. Crie o repositório e as branches `main` e `teste`.
2. Secrets do repositório: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (chave privada de deploy), `VPS_KNOWN_HOSTS` (`ssh-keyscan -H <host>`), `SERVIDOR_ENV` (opcional, ex.: `ANTHROPIC_API_KEY=sk-ant-api...`).
3. DNS: registro **A** `somnia` → IP da VPS.
4. `git push origin teste` → testes, rsync, `setup-vps.sh` (só na primeira vez), build Docker e publicação em `/teste/` com rollback.
5. Testou? Actions → **promover** → digite `PROMOVER` → produção em `https://somnia.m3d.pro/`.

Senha inicial do root na VPS: `sudo cat /opt/somnia/.env.gerado` (ou `/opt/somnia-teste/.env.gerado`). Troque após o primeiro acesso.

| Ambiente | Branch | URL | Pasta | Porta (127.0.0.1) | Dados |
|---|---|---|---|---|---|
| teste | teste | /teste/ | /opt/somnia-teste | 3402 | /var/lib/somnia-teste |
| producao | main | / | /opt/somnia | 3401 | /var/lib/somnia |

> Nunca coloque senhas ou chaves em conversas, e-mails ou no repositório: use os secrets do GitHub.
