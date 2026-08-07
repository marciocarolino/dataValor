/**
 * Script de validação do cálculo de daysRemaining
 * Executa: node --env-file=.env test-days-remaining.mjs
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function calcDaysRemaining(endDateIso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDateIso);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

async function main() {
  console.log('\n🧪 Iniciando testes de daysRemaining...\n');

  // ── 1. Validar calcDaysRemaining ───────────────────────────────────────────
  const endDate = '2026-08-28T00:00:00.000Z';
  const days = calcDaysRemaining(endDate);
  console.log(`✅ calcDaysRemaining("${endDate}") = ${days} dias`);
  console.log(`   (hoje = ${new Date().toISOString().substring(0, 10)})`);

  // ── 2. CREATE: criar indicador de teste com endDate ─────────────────────────
  console.log('\n📝 [CREATE] Criando indicador de teste...');
  const created = await prisma.indicator.create({
    data: {
      name: '[TESTE AUTO] daysRemaining',
      category: 'COMMERCIAL',
      status: 'NEUTRAL',
      chartType: 'BAR',
      startDate: new Date('2026-08-07T00:00:00.000Z'),
      endDate: new Date(endDate),
      daysRemaining: calcDaysRemaining(endDate),
    },
  });

  console.log(`   id            = ${created.id}`);
  console.log(`   startDate     = ${created.startDate?.toISOString()}`);
  console.log(`   endDate       = ${created.endDate?.toISOString()}`);
  console.log(`   daysRemaining = ${created.daysRemaining}`);

  if (created.daysRemaining === null) {
    console.error('❌ FALHOU: daysRemaining é null após CREATE!');
    console.error('   → O campo daysRemaining não está sendo salvo no banco.');
    console.error('   → Verifique se a migration foi aplicada: prisma migrate deploy');
    console.error('   → Verifique se o Prisma Client foi regenerado: prisma generate');
  } else {
    console.log(`✅ PASSOU: CREATE salva daysRemaining = ${created.daysRemaining}`);
  }

  // ── 3. VERIFICAR VIA SQL DIRETO ────────────────────────────────────────────
  console.log('\n🔍 [SQL] Verificando diretamente no banco...');
  const raw = await prisma.$queryRaw`
    SELECT id, "startDate", "endDate", "daysRemaining"
    FROM "Indicator"
    WHERE id = ${created.id}
  `;
  console.log('   Resultado SQL:', JSON.stringify(raw, null, 2));

  // ── 4. UPDATE: novo endDate ─────────────────────────────────────────────────
  const newEndDate = '2026-09-30T00:00:00.000Z';
  const newDays = calcDaysRemaining(newEndDate);
  console.log(`\n📝 [UPDATE] Atualizando endDate para ${newEndDate} (${newDays} dias)...`);

  const updated = await prisma.indicator.update({
    where: { id: created.id },
    data: {
      endDate: new Date(newEndDate),
      daysRemaining: newDays,
    },
  });

  console.log(`   endDate       = ${updated.endDate?.toISOString()}`);
  console.log(`   daysRemaining = ${updated.daysRemaining}`);

  if (updated.daysRemaining === newDays) {
    console.log(`✅ PASSOU: UPDATE salva daysRemaining = ${updated.daysRemaining}`);
  } else {
    console.error(`❌ FALHOU: esperado ${newDays}, recebeu ${updated.daysRemaining}`);
  }

  // ── 5. GET: verificar persistência ─────────────────────────────────────────
  const fetched = await prisma.indicator.findUnique({ where: { id: created.id } });
  console.log(`\n📖 [GET] Valor persistido no banco:`);
  console.log(`   daysRemaining = ${fetched?.daysRemaining}`);

  if (fetched?.daysRemaining === newDays) {
    console.log(`✅ PASSOU: GET retorna daysRemaining = ${fetched.daysRemaining}`);
  } else {
    console.error(`❌ FALHOU: esperado ${newDays}, recebeu ${fetched?.daysRemaining}`);
  }

  // ── 6. Cleanup ──────────────────────────────────────────────────────────────
  await prisma.indicator.delete({ where: { id: created.id } });
  console.log('\n🧹 Registro de teste removido.');

  // ── Resumo ──────────────────────────────────────────────────────────────────
  const allPassed = created.daysRemaining !== null
    && updated.daysRemaining === newDays
    && fetched?.daysRemaining === newDays;

  if (allPassed) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! O banco está salvando daysRemaining corretamente.\n');
    console.log('   ℹ️  Se a API ainda retorna null, reinicie o servidor NestJS para carregar o código novo.\n');
  } else {
    console.error('\n❌ ALGUNS TESTES FALHARAM. Verifique os logs acima.\n');
  }
}

main()
  .catch((e) => { console.error('❌ ERRO FATAL:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
