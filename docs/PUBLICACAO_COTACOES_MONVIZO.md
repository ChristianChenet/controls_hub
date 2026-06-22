# Publicacao externa das cotacoes Monvizo

## Arquitetura atual

O firewall/NAT externo entrega a porta publica `8080` na porta interna `3333` do servidor `192.168.1.70`.

Fluxo do Control S API Hub:

`http://api.monvizo.com.br:8080/`

-> firewall/NAT

-> `http://192.168.1.70:3333/`

-> Nginx

-> `http://127.0.0.1:3335/`

-> Control S API Hub

Fluxo do Control S Hub Frete:

`http://frete.monvizo.com.br:8080/`

-> firewall/NAT

-> `http://192.168.1.70:3333/`

-> Nginx

-> `http://192.168.1.70:5174/`

-> Frontend Control S Hub

## Portas

- `3333`: Nginx/proxy no servidor.
- `3335`: porta interna do Control S API Hub Node.
- `5174`: frontend Control S Hub.
- `3334`: backend Control S Hub.
- `8080`: porta externa publicada no dominio.

## Arquivo Nginx

Arquivo pronto no projeto:

`deploy/nginx/controlshub-cotacoes-monvizo.conf`

No Windows, copie o conteudo desse arquivo para a configuracao do Nginx, normalmente em:

`C:\nginx\conf\nginx.conf`

ou em um arquivo importado por ele, por exemplo:

`C:\nginx\conf\conf.d\controlshub-cotacoes-monvizo.conf`

## Configuracao aplicada

```nginx
server {
  listen 3333;
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

server {
  listen 3333;
  server_name api.monvizo.com.br;

  location / {
    proxy_pass http://127.0.0.1:3335;

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

## Comandos de validacao e reload no Windows

No servidor Windows:

```bat
cd C:\nginx
nginx.exe -t
nginx.exe -s reload
```

Se o Nginx ainda nao estiver rodando:

```bat
cd C:\nginx
start nginx.exe
```

Se precisar reiniciar sem servico:

```bat
cd C:\nginx
taskkill /F /IM nginx.exe
start nginx.exe
```

## DNS

Os dois dominios devem apontar para o mesmo IP publico:

- `api.monvizo.com.br`
- `frete.monvizo.com.br`

O roteador/firewall deve continuar direcionando a porta externa `8080` para `192.168.1.70:3333`.

## Variaveis de ambiente

Control S Hub backend:

```env
PORTA_API=3334
ORIGEM_FRONTEND=true
```

Control S Hub frontend:

```env
VITE_API_BASE=
```

Com `VITE_API_BASE` vazio, o frontend chama `/api/...`. Como o frontend publicado ainda roda no Vite em `5174`, o proxy do `apps/frontend/vite.config.ts` encaminha `/api` para `http://127.0.0.1:3334`.

## Tela Configuracoes

Preencher no Control S Hub:

- Dominio publico: `frete.monvizo.com.br:8080`
- Link publico: `http://frete.monvizo.com.br:8080/`
- Link interno: `http://192.168.1.70:5174/`
- Ambiente do link: `HOMOLOGACAO`

Os links enviados para transportadoras usam sempre `Link publico`. O `Link interno` fica mantido como referencia tecnica/documentacao.

## Migration opcional

Para preencher os parametros via banco:

```bat
psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f database\migrations\020_parametros_publicacao_cotacoes_monvizo.sql
```

## Testes

No servidor:

```bat
curl http://127.0.0.1:3335/
curl http://192.168.1.70:3333/ -H "Host: api.monvizo.com.br"
curl http://192.168.1.70:3333/ -H "Host: frete.monvizo.com.br"
```

No navegador:

- `http://api.monvizo.com.br:8080/`
- `http://frete.monvizo.com.br:8080/`

No Control S Hub:

- Fazer login.
- Gerar novo link de transportadora.
- Confirmar que o link comeca com `http://frete.monvizo.com.br:8080/cotacao/token/`.
- Abrir o link em aba anonima.

## Observacoes tecnicas

- Nao configurar cookie como `secure=true` obrigatorio enquanto estiver em HTTP.
- O Nginx envia `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Real-IP` e `X-Forwarded-For`.
- A separacao entre API Hub e Frete e feita por `server_name`.
