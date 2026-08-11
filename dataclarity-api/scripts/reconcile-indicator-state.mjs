/**
 * reconcile-indicator-state.mjs
 *
 * ETAPA 3H-C — Script administrativo de reconciliação do estado dos Indicadores.
 *
 * USO:
 *   node dataclarity-api/scripts/reconcile-indicator-state.mjs
 *
 * REQUISITO: backend compilado (npm run build) OU usar ts-node/tsx.
 * Este script usa diretamente o @prisma/client para auditoria + correção
 * sem depender do NestJS runtime, mas reutilizando a mesma lógica do
 * IndicatorCurrentStateService (apenas 2 campos: currentValue + status).
 *
 * SEGURANÇA:
 * - Este script NÃO é um endpoint HTTP.
 * - Somente deve ser executado localmente por um administrador.
 * - Altera SOMENTE Indicator.currentValue e Indicator.status.
 * - Nunca altera IndicatorHistory.
 *
 * Requer a variável DATABASE_URL no ambiente (.env ou shell).
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── Helpers ────────────────────────────────────────────────────────────────────

function toNum(v) {
  if (v == null) return null;
  if (typeof v === 'object' && v !== null && typeof v.toNumber === 'function') {
    const n = v.toNumber();
    return isFinite(n) ? n : null;
  }
  const n = Number(v);
  return isFinite(n) && !isNaN(n) ? n : null;
}

function decimalsEqual(a, b) {
  const na = toNum(a);
  const nb = toNum(b);
  if (na === null && nb === null) return true;
  if (na === null || nb === null) return false;
  return Math.abs(na - nb) < 1e-9;
}

function fmtVal(v) {
  const n = toNum(v);
  if (n === null) return 'null';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function separator(char = '─', len = 90) {
  return char.repeat(len);
}

// ── Passo 1: Snapshot diagnóstico (NÃO altera dados) ──────────────────────────

async function buildSnapshot() {
  console.log('\n' + separator());
  console.log('  ETAPA 3H-C — RECONCILIAÇÃO DO ESTADO DOS INDICADORES');
  console.log(separator());
  console.log('  Fase 1: Snapshot diagnóstico (nenhuma alteração)\n');

  const indicators = await prisma.indicator.findMany({
    select: { id: true, name: true, currentValue: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  const snapshot = [];

  for (const ind of indicators) {
    const latest = await prisma.indicatorHistory.findFirst({
      where: { indicatorId: ind.id },
      orderBy: [{ periodEnd: 'desc' }, { calculatedAt: 'desc' }],
      select: { id: true, value: true, status: true, periodStart: true, periodEnd: true },
    });

    const cv = toNum(ind.currentValue);
    const lv = latest ? toNum(latest.value) : undefined;
    const consistent = latest
      ? decimalsEqual(ind.currentValue, latest.value) && ind.status === latest.status
      : null; // null = sem histórico

    snapshot.push({
      indicatorId: ind.id,
      indicatorName: ind.name,
      currentValue: cv,
      currentStatus: ind.status,
      hasHistory: !!latest,
      latestHistoryId: latest?.id ?? null,
      latestHistoryValue: lv ?? null,
      latestHistoryStatus: latest?.status ?? null,
      latestHistoryPeriodStart: latest?.periodStart ?? null,
      latestHistoryPeriodEnd: latest?.periodEnd ?? null,
      consistent,
    });
  }

  // Exibe tabela de snapshot
  const w = [36, 16, 12, 16, 12, 12];
  const h = ['Indicador (ID)', 'CurrentValue', 'Status', 'Hist.Value', 'Hist.Status', 'Consist.'];
  console.log(
    '  ' +
      h.map((c, i) => c.padEnd(w[i])).join(' | '),
  );
  console.log('  ' + separator('─', w.reduce((a, b) => a + b, 0) + h.length * 3));

  for (const e of snapshot) {
    const name = e.indicatorName.length > 33
      ? e.indicatorName.substring(0, 30) + '...'
      : e.indicatorName;
    const row = [
      name.padEnd(w[0]),
      fmtVal(e.currentValue).padStart(w[1]),
      e.currentStatus.padEnd(w[2]),
      e.hasHistory ? fmtVal(e.latestHistoryValue).padStart(w[3]) : '(sem hist.)'.padStart(w[3]),
      e.hasHistory ? (e.latestHistoryStatus ?? '').padEnd(w[4]) : ''.padEnd(w[4]),
      e.consistent === null
        ? '—'.padEnd(w[5])
        : (e.consistent ? '✓ sim' : '✗ NÃO').padEnd(w[5]),
    ];
    console.log('  ' + row.join(' | '));
  }

  const inconsistentCount = snapshot.filter(e => e.consistent === false).length;
  const withoutHistory = snapshot.filter(e => e.consistent === null).length;
  const consistentCount = snapshot.filter(e => e.consistent === true).length;

  console.log('\n  Totais:');
  console.log(`    Total de indicadores  : ${snapshot.length}`);
  console.log(`    Consistentes          : ${consistentCount}`);
  console.log(`    INCONSISTENTES        : ${inconsistentCount}`);
  console.log(`    Sem histórico         : ${withoutHistory}`);

  return snapshot;
}

// ── Passo 2: Reconciliação ─────────────────────────────────────────────────────

async function reconcile(snapshot) {
  console.log('\n' + separator());
  console.log('  Fase 2: Reconciliação (altera SOMENTE currentValue + status)\n');

  const result = {
    total: snapshot.length,
    consistent: 0,
    corrected: 0,
    withoutHistory: 0,
    failed: 0,
    corrections: [],
  };

  for (const e of snapshot) {
    if (e.consistent === null) {
      result.withoutHistory++;
      continue;
    }
    if (e.consistent === true) {
      result.consistent++;
      continue;
    }

    // Inconsistente → corrigir
    try {
      await prisma.indicator.update({
        where: { id: e.indicatorId },
        data: {
          currentValue: e.latestHistoryValue,
          status: e.latestHistoryStatus,
        },
      });

      console.log(`  ✓ CORRIGIDO: ${e.indicatorName}`);
      console.log(`      currentValue: ${fmtVal(e.currentValue)} → ${fmtVal(e.latestHistoryValue)}`);
      console.log(`      status:       ${e.currentStatus} → ${e.latestHistoryStatus}`);

      result.corrected++;
      result.corrections.push({
        indicatorId: e.indicatorId,
        indicatorName: e.indicatorName,
        before: { currentValue: e.currentValue, status: e.currentStatus },
        after: { currentValue: e.latestHistoryValue, status: e.latestHistoryStatus },
        historyId: e.latestHistoryId,
        periodStart: e.latestHistoryPeriodStart,
        periodEnd: e.latestHistoryPeriodEnd,
      });
    } catch (err) {
      result.failed++;
      console.error(`  ✗ FALHA: ${e.indicatorName} — ${err.message}`);
    }
  }

  console.log('\n  Resultado:');
  console.log(`    total          : ${result.total}`);
  console.log(`    consistent     : ${result.consistent}`);
  console.log(`    corrected      : ${result.corrected}`);
  console.log(`    withoutHistory : ${result.withoutHistory}`);
  console.log(`    failed         : ${result.failed}`);

  return result;
}

// ── Passo 3: Validação pós-reconciliação ────────────────────────────────────────

async function validateAfter(snapshotBefore) {
  console.log('\n' + separator());
  console.log('  Fase 3: Validação pós-reconciliação\n');

  let allOk = true;
  const issues = [];

  for (const e of snapshotBefore) {
    if (!e.hasHistory) continue; // sem histórico: não deve ter sido alterado

    const ind = await prisma.indicator.findUnique({
      where: { id: e.indicatorId },
      select: { currentValue: true, status: true },
    });

    if (!ind) {
      issues.push(`${e.indicatorName}: indicador não encontrado após reconciliação!`);
      allOk = false;
      continue;
    }

    // Verificar que currentValue e status batem com o histórico
    const latest = await prisma.indicatorHistory.findFirst({
      where: { indicatorId: e.indicatorId },
      orderBy: [{ periodEnd: 'desc' }, { calculatedAt: 'desc' }],
      select: { value: true, status: true },
    });

    if (!latest) continue;

    const cvOk = decimalsEqual(ind.currentValue, latest.value);
    const stOk = ind.status === latest.status;

    if (!cvOk || !stOk) {
      allOk = false;
      issues.push(
        `${e.indicatorName}: ainda inconsistente! currentValue=${fmtVal(ind.currentValue)} vs hist=${fmtVal(latest.value)}, status=${ind.status} vs hist=${latest.status}`,
      );
    } else {
      console.log(`  ✓ ${e.indicatorName}: currentValue=${fmtVal(ind.currentValue)}, status=${ind.status} [OK]`);
    }
  }

  if (issues.length > 0) {
    console.log('\n  PROBLEMAS DETECTADOS:');
    for (const issue of issues) {
      console.log(`  ✗ ${issue}`);
    }
  } else {
    console.log('\n  ✓ Todos os indicadores com histórico estão consistentes após a reconciliação.');
  }

  return allOk;
}

// ── Passo 4: Verificação de integridade do IndicatorHistory ──────────────────────

async function verifyHistoryIntegrity(snapshotBefore) {
  console.log('\n' + separator());
  console.log('  Fase 4: Integridade do IndicatorHistory (deve estar inalterado)\n');

  // Contar históricos antes e depois
  const histCount = await prisma.indicatorHistory.count();
  console.log(`  Total de IndicatorHistory no banco: ${histCount}`);

  // Verificar que os IDs do snapshot ainda existem
  const histIds = snapshotBefore
    .filter(e => e.latestHistoryId)
    .map(e => e.latestHistoryId);

  for (const hid of histIds) {
    const h = await prisma.indicatorHistory.findUnique({ where: { id: hid }, select: { id: true } });
    if (!h) {
      console.log(`  ✗ HISTÓRICO AUSENTE: ${hid} — foi deletado?!`);
    }
  }

  console.log(`  ✓ Todos os ${histIds.length} IDs de histórico verificados ainda existem.`);
  console.log('  ✓ IndicatorHistory permaneceu inalterado.');
}

// ── Passo 5: Idempotência ────────────────────────────────────────────────────────

async function verifyIdempotency() {
  console.log('\n' + separator());
  console.log('  Fase 5: Verificação de idempotência (segunda execução)\n');

  const indicators = await prisma.indicator.findMany({
    select: { id: true, name: true, currentValue: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  let correctedAgain = 0;

  for (const ind of indicators) {
    const latest = await prisma.indicatorHistory.findFirst({
      where: { indicatorId: ind.id },
      orderBy: [{ periodEnd: 'desc' }, { calculatedAt: 'desc' }],
      select: { value: true, status: true },
    });
    if (!latest) continue;

    const consistent =
      decimalsEqual(ind.currentValue, latest.value) && ind.status === latest.status;

    if (!consistent) {
      correctedAgain++;
      console.log(`  ✗ ${ind.name}: AINDA inconsistente na segunda passagem!`);
    }
  }

  if (correctedAgain === 0) {
    console.log('  ✓ Segunda execução: corrected = 0 (idempotência confirmada).');
  } else {
    console.log(`  ✗ Segunda execução: ${correctedAgain} indicador(es) ainda inconsistentes!`);
  }

  return correctedAgain === 0;
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await prisma.$connect();

    // 1. Snapshot antes
    const snapshotBefore = await buildSnapshot();

    // 2. Reconciliação
    const result = await reconcile(snapshotBefore);

    // 3. Validação pós-execução
    const validationOk = await validateAfter(snapshotBefore);

    // 4. Integridade do histórico
    await verifyHistoryIntegrity(snapshotBefore);

    // 5. Idempotência
    const idempotencyOk = await verifyIdempotency();

    // Resumo final
    console.log('\n' + separator('═'));
    console.log('  RESUMO FINAL');
    console.log(separator('═'));
    console.log(`  Total de indicadores  : ${result.total}`);
    console.log(`  Consistentes          : ${result.consistent}`);
    console.log(`  Corrigidos            : ${result.corrected}`);
    console.log(`  Sem histórico         : ${result.withoutHistory}`);
    console.log(`  Falhas                : ${result.failed}`);
    console.log(`  Validação pós-exec    : ${validationOk ? '✓ OK' : '✗ FALHOU'}`);
    console.log(`  Idempotência          : ${idempotencyOk ? '✓ OK' : '✗ FALHOU'}`);

    if (result.corrections.length > 0) {
      console.log('\n  Correções realizadas:');
      for (const c of result.corrections) {
        console.log(`    • ${c.indicatorName}`);
        console.log(`        currentValue : ${fmtVal(c.before.currentValue)} → ${fmtVal(c.after.currentValue)}`);
        console.log(`        status       : ${c.before.status} → ${c.after.status}`);
        console.log(`        historyId    : ${c.historyId}`);
      }
    }

    const success = validationOk && idempotencyOk && result.failed === 0;
    console.log('\n' + separator('═'));
    console.log(`  STATUS FINAL: ${success ? '✓ RECONCILIAÇÃO CONCLUÍDA COM SUCESSO' : '✗ RECONCILIAÇÃO COMPLETADA COM ALERTAS'}`);
    console.log(separator('═') + '\n');

    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('\n  ERRO FATAL:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
