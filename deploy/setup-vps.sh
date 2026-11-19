#!/usr/bin/env bash
# Somnia — configuração inicial da VPS (Ubuntu 22.04/24.04). Idempotente: pode rodar de novo.
#   sudo bash deploy/setup-vps.sh --ambiente producao   # /opt/somnia        -> https://somnia.m3d.pro/        (porta 3401)
#   sudo bash deploy/setup-vps.sh --ambiente teste      # /opt/somnia-teste  -> https://somnia.m3d.pro/teste/  (porta 3402)
# Opções: --dominio somnia.m3d.pro  --email info@exemplo  --sem-ssl  --sem-ufw
# O que faz: Docker + Compose, Nginx, Certbot, UFW, pastas, .env do ambiente, senha inicial do root (.env.gerado),
#            site Nginx com SSE sem buffer e HTTPS (Let's Encrypt), backup diário.
set -Eeuo pipefail
AMBIENTE=producao; DOMINIO=somnia.m3d.pro; EMAIL=""; SSL=1; UFW=1
while [ $# -gt 0 ]; do case "$1" in
  --ambiente) AMBIENTE="$2"; shift 2;; --dominio) DOMINIO="$2"; shift 2;; --email) EMAIL="$2"; shift 2;;
  --sem-ssl) SSL=0; shift;; --sem-ufw) UFW=0; shift;; -h|--help) sed -n 2,8p "$0"; exit 0;;
  *) echo "Opção desconhecida: $1"; exit 2;; esac; done
[ "$(id -u)" -eq 0 ] || { echo "Rode como root (sudo)."; exit 1; }
case "$AMBIENTE" in
  producao) DIR=/opt/somnia;       DATA=/var/lib/somnia;       PORTA=3401; BASE="";       CK=somnia_sid;       CT=somnia-app ;;
  teste)    DIR=/opt/somnia-teste; DATA=/var/lib/somnia-teste; PORTA=3402; BASE="/teste"; CK=somnia_sid_teste; CT=somnia-teste-app ;;
  *) echo "Ambiente inválido: $AMBIENTE (use producao ou teste)"; exit 2;;
esac
log(){ printf '\n\033[1;35m[somnia:%s]\033[0m %s\n' "$AMBIENTE" "$*"; }
export DEBIAN_FRONTEND=noninteractive

log "Pacotes base"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg rsync nginx certbot python3-certbot-nginx sqlite3 ufw dnsutils >/dev/null

if ! command -v docker >/dev/null 2>&1; then
  log "Instalando Docker (repositório oficial)"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq && apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
  systemctl enable --now docker
fi
docker compose version >/dev/null || { echo "docker compose (plugin v2) ausente"; exit 1; }

log "Pastas: $DIR (código) e $DATA (banco SQLite e uploads)"
mkdir -p "$DIR" "$DATA" /var/backups/somnia
chown -R 1000:1000 "$DATA"     # usuário 'node' (uid 1000) do container
chmod 750 "$DATA"

log "Arquivo .env do ambiente (sem segredos)"
cat > "$DIR/.env" <<EOF
# Gerado por deploy/setup-vps.sh em $(date -Is). Segredos: .env.gerado (local) e .env.segredos (GitHub SERVIDOR_ENV).
AMBIENTE=$AMBIENTE
CONTAINER=$CT
PORT_HOST=$PORTA
DATA_PATH=$DATA
COOKIE_SECURE=true
TRUST_PROXY=true
BASE_PATH=$BASE
COOKIE_NAME=$CK
ANTHROPIC_MODEL=claude-sonnet-5-5
AI_PER_HOUR=30
I18N_PER_HOUR=60
GUIA_PER_HOUR=20
EOF
chmod 640 "$DIR/.env"
if [ ! -s "$DIR/.env.gerado" ]; then
  PW="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  printf 'ROOT_PASSWORD=%s\n' "$PW" > "$DIR/.env.gerado"; chmod 600 "$DIR/.env.gerado"
  log "Senha inicial do root gerada em $DIR/.env.gerado (veja com: sudo cat $DIR/.env.gerado)"
fi
touch "$DIR/.env.segredos"; chmod 600 "$DIR/.env.segredos"

if [ "$UFW" = 1 ]; then
  log "Firewall (UFW): SSH + HTTP/HTTPS; portas do app ficam só em 127.0.0.1"
  ufw allow OpenSSH >/dev/null; ufw allow 'Nginx Full' >/dev/null
  case "$(ufw status)" in *"Status: active"*) ;; *) ufw --force enable >/dev/null ;; esac
fi

log "Nginx: site $DOMINIO (produção em / -> 3401; homologação em /teste/ -> 3402)"
SITE=/etc/nginx/sites-available/somnia
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
sed "s/__DOMINIO__/$DOMINIO/g" "$REPO_DIR/deploy/nginx-somnia.conf" > "$SITE.novo"
# preserva o bloco SSL que o certbot já tenha incluído
if [ -f "$SITE" ] && grep -q "managed by Certbot" "$SITE"; then
  log "Site já tem SSL do Certbot: mantendo o arquivo atual (novo modelo salvo em $SITE.novo)"
else
  mv "$SITE.novo" "$SITE"
fi
ln -sf "$SITE" /etc/nginx/sites-enabled/somnia
nginx -t && systemctl reload nginx

if [ "$SSL" = 1 ]; then
  IP_VPS="$(curl -fsS4 https://api.ipify.org || true)"
  IP_DNS="$(dig +short A "$DOMINIO" | tail -n1 || true)"
  if [ -z "$IP_DNS" ] || [ "$IP_DNS" != "$IP_VPS" ]; then
    log "ATENÇÃO: DNS de $DOMINIO aponta para '${IP_DNS:-nada}', mas esta VPS é '$IP_VPS'. Corrija o registro A (Hostinger) e rode de novo. Pulando o certificado."
  elif [ -d "/etc/letsencrypt/live/$DOMINIO" ]; then
    log "Certificado já existe para $DOMINIO"
  else
    log "Emitindo certificado Let's Encrypt"
    if [ -n "$EMAIL" ]; then certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos -m "$EMAIL" --redirect
    else certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos --register-unsafely-without-email --redirect; fi
  fi
fi

log "Backup diário (03:17) do banco e uploads deste ambiente"
cat > "/etc/cron.d/somnia-backup-$AMBIENTE" <<EOF
17 3 * * * root DATA_DIR=$DATA BACKUP_DIR=/var/backups/somnia/$AMBIENTE /bin/sh $DIR/deploy/backup.sh >/dev/null 2>&1
EOF

log "Pronto. Próximo passo: deploy pelo GitHub Actions (push na branch ${AMBIENTE/producao/main}) ou: sudo bash $DIR/deploy/remote-deploy.sh --ambiente $AMBIENTE"
