import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

// IMPORTANTE:
// O Prisma Client é gerado em `generated/prisma` (fora de `src/`).
// Em runtime, o código compilado roda a partir de `dist/src/**`.
// Para resolver isso de forma compatível com TS (tipagem) e runtime,
// importamos o PrismaClient do caminho "normal" (dentro de src),
// e apontamos o "runtime target" para o client gerado no root via alias.
//
// - Tipagem/compilação: usa `src/generated/prisma`
// - Runtime: `src/generated/prisma` é só um proxy que reexporta `../../generated/prisma`
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
