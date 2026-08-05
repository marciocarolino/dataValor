import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

// Prisma v7 pode gerar um client em ESM (com `import.meta.url`) que quebra o Jest (CJS)
// por padrão. Neste projeto, mantemos o client gerado em `generated/prisma` (CJS)
// para compatibilidade imediata.
import { PrismaClient } from '../../generated/prisma/client';

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
