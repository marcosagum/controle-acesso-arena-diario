# Controle de Acesso - Farmasi Arena (GL Events)

## Comandos Recomendados
* Dev Server: `npm run dev` (configurado para rodar `next dev --webpack`)
* Production Build: `npm run build` (configurado para rodar `prisma generate && next build --webpack`)
* Banco de Dados: `npx prisma studio`

## Diretrizes de Estilização Estritas
> [!IMPORTANT]
> **BLOQUEIO DE VERSÃO DE ESTILOS**:
> Este projeto usa estritamente o **Tailwind CSS v3 (versão fixa 3.4.19)** integrado via PostCSS clássico sobre o compilador do **Webpack** (`--webpack`).
> 
> * **PROIBIDO**: Atualizar, alterar ou migrar para o Tailwind CSS v4. A v4 e o Turbopack possuem bugs severos de compilação JIT de classes utilitárias no ambiente Windows local, quebrando totalmente a formatação, tamanhos dos cartões e as cores do GL Events Premium Suite.
> * **PROIBIDO**: Remover a flag `--webpack` dos scripts do `package.json`. O compilador Turbopack não deve ser ativado em modo dev neste repositório.
> * **Configuração de Estilos**: Toda e qualquer customização de cores, espaçamentos ou arredondamentos do design system deve ser feita estritamente no arquivo `tailwind.config.js` na raiz, e as diretivas de CSS em `src/app/globals.css` devem se manter como `@tailwind base; @tailwind components; @tailwind utilities;`.
