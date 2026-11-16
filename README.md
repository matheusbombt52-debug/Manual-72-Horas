# Manual das 72 Horas — site estático

Tudo está dentro do `index.html` (CSS, JavaScript e imagens embutidos). Não há build nem pasta de assets.

Cloudflare (Workers ou Pages): publique a raiz deste repositório. Em Pages, deixe o build command em branco e o output directory como `/`.

## Notificações de compras (prova social)

- `notificacoes-compras.js`: componente isolado (sem dependências). Já incluído no `index.html`, porém **inativo** até existir um endpoint real.
- `notificacoes-compras-exemplo.html`: página de testes com dados fictícios (etiqueta DEMONSTRAÇÃO). Não publique no site público.
- Para ativar: troque `endpoint: ''` no final do `index.html` pela URL da sua API. O contrato JSON está no topo do `.js`.
- Só entram pagamentos aprovados, com ID único; sem autorização do cliente a exibição é anônima ("Uma pessoa adquiriu o Plano Premium").
