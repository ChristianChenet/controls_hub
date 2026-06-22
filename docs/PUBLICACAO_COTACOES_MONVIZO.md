# Publicacao externa das cotacoes Monvizo

## Objetivo

Publicar o Control S Hub de cotacoes em:

- Publico: `http://frete.monvizo.com.br:8080/`
- Interno frontend: `http://192.168.1.70:5174/`
- Interno backend Control S Hub: `http://192.168.1.70:3334/`

Sem alterar a publicacao existente:

- `http://api.monvizo.com.br:8080/` -> `http://192.168.1.70:3333/`

## Arquivo Nginx

Arquivo pronto no projeto:

`deploy/nginx/controlshub-cotacoes-monvizo.conf`

No Windows, copie o conteudo desse arquivo para a configuracao do Nginx, normalmente em:

`C:\nginx\conf\nginx.conf`

ou em um arquivo importado por ele, por exemplo:

`C:\nginx\conf\conf.d\controlshub-cotacoes-monvizo.conf`

## Configuracao aplicada

O bloco dessa aplicacao deve publicar apenas o frontend de cotacoes:

```nginx
server {
  listen 8080;
  server_name frete.monvizo.com.br;

  location / {
    proxy_pass http://192.168.1.70:5174;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
  }
}
```

Nao incluir `/api/` nem `/swagger/` nesse bloco, porque esses caminhos pertencem a outras publicacoes do ecossistema. No ambiente atual, o frontend em `5174` usa o proxy do Vite para encaminhar `/api` ao backend do Control S Hub.

## Comandos de validacao e reload no Windows

No servidor Windows:

```bat
cd C:\nginx
nginx.exe -t
nginx.exe -s reload
```

Se o Nginx nao estiver rodando como servico:

```bat
cd C:\nginx
taskkill /F /IM nginx.exe
start nginx.exe
```

## DNS ou hosts

O DNS de `frete.monvizo.com.br` deve apontar para o mesmo IP publico usado por `api.monvizo.com.br`.

Para teste local antes do DNS, adicionar no arquivo `hosts` da maquina cliente:

```text
IP_PUBLICO_DO_SERVIDOR frete.monvizo.com.br
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

Com `VITE_API_BASE` vazio, o frontend chama `/api/...`. Em desenvolvimento/publicacao via Vite, o proxy configurado em `apps/frontend/vite.config.ts` encaminha `/api` para `http://127.0.0.1:3334`.

## Tela Configuracoes

Preencher:

- Dominio publico: `frete.monvizo.com.br:8080`
- Link publico: `http://frete.monvizo.com.br:8080/`
- Link interno: `http://192.168.1.70:5174/`
- Ambiente do link: `HOMOLOGACAO`

Observacao: os links enviados para transportadoras usam sempre `Link publico`. O `Link interno` permanece documentado para referencia tecnica e chamadas internas futuras.

## Migration opcional

Para preencher os parametros via banco:

```bat
psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f database\migrations\020_parametros_publicacao_cotacoes_monvizo.sql
```

## Testes no navegador

Abrir:

`http://frete.monvizo.com.br:8080/`

Testar:

- Login.
- Dashboard.
- Cotacoes.
- Gerar novo link de transportadora.
- Verificar se o link gerado comeca com `http://frete.monvizo.com.br:8080/cotacao/token/`.
- Abrir o link publico em aba anonima.

Confirmar que a aplicacao antiga continua funcionando:

`http://api.monvizo.com.br:8080/`

## Observacoes tecnicas

- Nao configurar cookie como `secure=true` obrigatorio enquanto estiver em HTTP.
- O Nginx envia `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Real-IP` e `X-Forwarded-For`.
- O server block de cotacoes e separado por `server_name`, portanto nao altera `api.monvizo.com.br`.
