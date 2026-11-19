# Somnia — atalhos de desenvolvimento e operação
.PHONY: run test test-api test-mitos check zip setup-teste setup-prod
DATA ?= /tmp/somnia-dev
run:            ## servidor local em http://127.0.0.1:3000 (hub em /, app clássico em /app)
	DATA_DIR=$(DATA) ROOT_PASSWORD=dev-root-123456 COOKIE_SECURE=false node server.js
check:          ## sintaxe de todo o JS, JSON da semente e scripts
	@for f in server.js src/*.js public/*.js public/hub/*.js public/hub/modules/*.js; do node --check $$f || exit 1; done
	@node -e "JSON.parse(require('fs').readFileSync('public/mitos/santos.json','utf8'))"
	@bash -n deploy/setup-vps.sh && bash -n deploy/remote-deploy.sh && echo "check ok"
test: check     ## todas as suítes (API 62, marketplace 56, mitos 47)
	@rm -rf /tmp/sd && (DATA_DIR=/tmp/sd PORT=3999 ROOT_PASSWORD=testroot-123456 node server.js >/tmp/somnia-test.log 2>&1 & echo $$! > /tmp/somnia-test.pid); sleep 1.5
	@node tests/api.test.js; R1=$$?; kill `cat /tmp/somnia-test.pid`; node tests/market.test.js; R2=$$?; node tests/mitos.test.js; R3=$$?; exit $$((R1+R2+R3))
zip:            ## pacote para envio
	cd .. && zip -qr somnia-v$$(node -p "require('./somnia/package.json').version").zip somnia -x 'somnia/.git/*' 'somnia/data/*' 'somnia/.env' 'somnia/.env.gerado' 'somnia/.env.segredos'
setup-teste:    ## na VPS: configurar homologação
	sudo bash deploy/setup-vps.sh --ambiente teste
setup-prod:     ## na VPS: configurar produção
	sudo bash deploy/setup-vps.sh --ambiente producao
