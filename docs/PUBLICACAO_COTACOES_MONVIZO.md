# Publicacao externa das cotacoes Monvizo

## Objetivo

Publicar o Control S Hub de cotacoes em:

- Publico: `http://cotacoes.monvizo.com.br:8080/`
- Interno frontend: `http://192.168.1.70:5174/`
- Interno backend Control S Hub: `http://192.168.1.70:3334/`

Sem alterar a publicacao existente:

- `http://api.monvizo.com.br:8080/` -> `http://192.168.1.70:3333/`

## Arquivo Nginx

Arquivo pronto no projeto:

`deploy/nginx/controlshub-cotacoes-monvizo.conf`

Copie esse arquivo para o servidor Nginx, normalmente em:

`/etc/nginx/conf.d/controlshub-cotacoes-monvizo.conf`

ou, em servidores com `sites-available`:

`/etc/nginx/sites-available/controlshub-cotacoes-monvizo.conf`

e crie o link simbolico para `sites-enabled`.

## Comandos de validacao e reload

```bash
nginx -t
systemctl reload nginx
```

## DNS ou hosts

O DNS de `cotacoes.monvizo.com.br` deve apontar para o mesmo IP publico usado por `api.monvizo.com.br`.

Para teste local antes do DNS, adicionar no arquivo `hosts` da maquina cliente:

```text
IP_PUBLICO_DO_SERVIDOR cotacoes.monvizo.com.br
```

## Variaveis de ambiente

Backend Control S Hub:

```env
PORTA_API=3334
ORIGEM_FRONTEND=true
```

Frontend:

```env
VITE_API_BASE=
```

Com `VITE_API_BASE` vazio, o frontend chama `/api/...` na mesma origem publica:

`http://cotacoes.monvizo.com.br:8080/api/...`

O Nginx encaminha `/api/` para:

`http://192.168.1.70:3334/api/`

## Tela Configuracoes

Preencher:

- Dominio publico: `cotacoes.monvizo.com.br:8080`
- Link publico: `http://cotacoes.monvizo.com.br:8080/`
- Link interno: `http://192.168.1.70:5174/`
- Ambiente do link: `HOMOLOGACAO`

Observacao: os links enviados para transportadoras usam sempre `Link publico`. O `Link interno` permanece documentado para referencia tecnica e chamadas internas futuras.

## Migration opcional

Para preencher os parametros via banco:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/020_parametros_publicacao_cotacoes_monvizo.sql
```

## Testes no navegador

Abrir:

`http://cotacoes.monvizo.com.br:8080/`

Testar:

- Login.
- Dashboard.
- Cotações.
- Gerar novo link de transportadora.
- Verificar se o link gerado começa com `http://cotacoes.monvizo.com.br:8080/cotacao/token/`.
- Abrir o link publico em aba anonima.

Confirmar que a aplicacao antiga continua funcionando:

`http://api.monvizo.com.br:8080/`

## Observacoes tecnicas

- Nao configurar cookie como `secure=true` obrigatorio enquanto estiver em HTTP.
- O Nginx envia `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Real-IP` e `X-Forwarded-For`.
- O server block de cotacoes e separado por `server_name`, portanto nao altera `api.monvizo.com.br`.
