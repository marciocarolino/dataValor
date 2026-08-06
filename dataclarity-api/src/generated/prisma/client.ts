/*
  Proxy de import do Prisma Client.

  Motivo:
  - O Prisma Client real é gerado em `generated/prisma` (fora de `src/`).
  - O build do Nest gera JS em `dist/src/**`.
  - Imports relativos como "../../generated/prisma/client" resolvem para `dist/generated/...` e quebram em runtime.

  Solução:
  - Criar um wrapper dentro de `src/` para manter o caminho estável no TS e no JS compilado.
  - Em runtime, este arquivo compilado em `dist/src/generated/prisma/client.js` sobe 3 níveis e importa o client real em `generated/prisma`.

  Observação:
  - Mantém a tipagem do PrismaClient e evita hacks de path mapping no runtime.
*/

export { PrismaClient } from '../../../../generated/prisma/client';
