#!/usr/bin/env bash
# Somnia — publicação na VPS (chamado pelo GitHub Actions depois do rsync). Com rollback automático.
#   sudo bash /opt/somnia/deploy/remote-deploy.sh --ambiente producao|teste
# Passos: guarda a imagem atual como :<amb>-previous -> build -> up -> espera /healthz -> se falhar, volta à anterior.
set -Eeuo pipefail
AMBIENTE=producao
while [ $# -gt 0 ]; do case "$1" in --ambiente) AMBIENTE="$2"; shift 2;; *) echo "Opção desconhecida: $1"; exit 2;; esac; done
case "$AMBIENTE" in
  producao) DIR=/opt/somnia;       PROJ=somnia;       PORTA=3401; PREFIX="" ;;
  teste)    DIR=/opt/somnia-teste; PROJ=somnia-teste; PORTA=3402; PREFIX="/teste" ;;
  *) echo "Ambiente inválido"; exit 2;;
esac
cd "$DIR"
[ -f .env ] || { echo "Falta $DIR/.env — rode antes: sudo bash deploy/setup-vps.sh --ambiente $AMBIENTE"; exit 1; }
touch .env.segredos; chmod 600 .env.segredos .env.gerado 2>/dev/null || true
log(){ printf '[deploy:%s] %s\n' "$AMBIENTE" "$*"; }
IMG="somnia:$AMBIENTE"; PREV="somnia:$AMBIENTE-previous"
DC=(docker compose -p "$PROJ" --env-file .env)

if docker image inspect "$IMG" >/dev/null 2>&1; then docker tag "$IMG" "$PREV"; log "imagem anterior guardada como $PREV"; fi
log "versão: $(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json)"
"${DC[@]}" build --pull
"${DC[@]}" up -d --remove-orphans

ok=0
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORTA$PREFIX/healthz" >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
if [ "$ok" = 1 ]; then
  log "saudável em http://127.0.0.1:$PORTA$PREFIX/  ($(curl -fsS "http://127.0.0.1:$PORTA$PREFIX/versao" || echo '?'))"
  docker image prune -f >/dev/null 2>&1 || true
  exit 0
fi

log "FALHOU a verificação de saúde. Últimos logs:"
"${DC[@]}" logs --tail 60 app || true
if docker image inspect "$PREV" >/dev/null 2>&1; then
  log "ROLLBACK para $PREV"
  docker tag "$PREV" "$IMG"
  "${DC[@]}" up -d --no-build --force-recreate
  sleep 4
  curl -fsS "http://127.0.0.1:$PORTA$PREFIX/healthz" >/dev/null 2>&1 && log "rollback ok" || log "rollback também falhou: verifique manualmente"
fi
exit 1
