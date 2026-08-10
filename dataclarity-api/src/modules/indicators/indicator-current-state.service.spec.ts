import { IndicatorCurrentStateService } from './indicator-current-state.service';
import { IndicatorStatus } from './enums/indicator-status.enum';

// ── FakePrisma ────────────────────────────────────────────────────────────────

function makePrisma(indicatorExists = true) {
  const updateSpy = jest.fn().mockResolvedValue({ id: 'ind-1' });
  return {
    indicator: {
      findUnique: jest
        .fn()
        .mockResolvedValue(indicatorExists ? { id: 'ind-1' } : null),
      update: updateSpy,
    },
    updateSpy,
  };
}

function makeService(prisma: ReturnType<typeof makePrisma>) {
  return new IndicatorCurrentStateService(prisma as never);
}

describe('IndicatorCurrentStateService', () => {
  // ── 1. value numérico ──────────────────────────────────────────────────────

  it('1. value = 100 → currentValue = 100', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: 100,
      status: 'NEUTRAL',
    });
    expect(r.currentValue).toBe(100);
    expect(r.synced).toBe(true);
  });

  it('2. value = 250.50 → currentValue = 250.50', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: 250.5,
      status: 'NEUTRAL',
    });
    expect(r.currentValue).toBe(250.5);
  });

  it('3. value = 0 → currentValue = 0 (COUNT sem medições — valor semântico)', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: 0,
      status: 'NEUTRAL',
    });
    expect(r.currentValue).toBe(0);
    expect(r.synced).toBe(true);
  });

  it('4. value = null → currentValue = null (preservado, não convertido)', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: null,
      status: 'NEUTRAL',
    });
    expect(r.currentValue).toBeNull();
    expect(r.synced).toBe(true);
  });

  it('4b. value = undefined → currentValue = null', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: undefined,
      status: 'NEUTRAL',
    });
    expect(r.currentValue).toBeNull();
  });

  // ── 2. status ─────────────────────────────────────────────────────────────

  it('5. status SUCCESS', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: 500,
      status: 'SUCCESS',
    });
    expect(r.status).toBe(IndicatorStatus.SUCCESS);
  });

  it('6. status WARNING', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: 100,
      status: 'WARNING',
    });
    expect(r.status).toBe(IndicatorStatus.WARNING);
  });

  it('7. status DANGER', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: 10,
      status: 'DANGER',
    });
    expect(r.status).toBe(IndicatorStatus.DANGER);
  });

  it('8. status NEUTRAL', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: 200,
      status: 'NEUTRAL',
    });
    expect(r.status).toBe(IndicatorStatus.NEUTRAL);
  });

  // ── 3. Payload do update — SOMENTE currentValue e status ──────────────────

  it('9. update contém SOMENTE currentValue', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    await svc.syncFromHistory('ind-1', { value: 300, status: 'SUCCESS' });
    const data = (
      prisma.updateSpy.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect('currentValue' in data).toBe(true);
    expect(data['currentValue']).toBe(300);
  });

  it('10. update contém SOMENTE status', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    await svc.syncFromHistory('ind-1', { value: 300, status: 'SUCCESS' });
    const data = (
      prisma.updateSpy.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect('status' in data).toBe(true);
    expect(data['status']).toBe('SUCCESS');
  });

  it('11. update contém EXATAMENTE currentValue e status — nenhum outro campo', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    await svc.syncFromHistory('ind-1', { value: 100, status: 'NEUTRAL' });
    const data = (
      prisma.updateSpy.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    const keys = Object.keys(data);
    expect(keys).toHaveLength(2);
    expect(keys).toContain('currentValue');
    expect(keys).toContain('status');
    // Campos proibidos não devem aparecer
    expect(keys).not.toContain('previousValue');
    expect(keys).not.toContain('variation');
    expect(keys).not.toContain('variationPercent');
    expect(keys).not.toContain('isActive');
    expect(keys).not.toContain('goalValue');
    expect(keys).not.toContain('formula');
    expect(keys).not.toContain('name');
    expect(keys).not.toContain('frequency');
    expect(keys).not.toContain('aggregationType');
  });

  // ── 4. Casos onde NÃO deve atualizar ─────────────────────────────────────

  it('12. indicator inexistente → synced = false, update NÃO chamado', async () => {
    const prisma = makePrisma(false); // indicator não existe
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-missing', {
      value: 100,
      status: 'SUCCESS',
    });
    expect(r.synced).toBe(false);
    expect(prisma.updateSpy).not.toHaveBeenCalled();
  });

  it('13. indicator inexistente → retorna currentValue=null, status=NEUTRAL', async () => {
    const prisma = makePrisma(false);
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-missing', {
      value: 500,
      status: 'SUCCESS',
    });
    expect(r.currentValue).toBeNull();
    expect(r.status).toBe(IndicatorStatus.NEUTRAL);
  });

  // ── 5. Indicador inativo ──────────────────────────────────────────────────

  it('14. indicador inativo → isActive NÃO alterado (não está no payload)', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    await svc.syncFromHistory('ind-1', { value: 100, status: 'SUCCESS' });
    const data = (
      prisma.updateSpy.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect('isActive' in data).toBe(false); // isActive não está no payload
  });

  // ── 6. Tipos de fórmula / aggrégation ────────────────────────────────────

  it('15. fórmula → sincronização normal com value do FormulaEngine', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    // Simula resultado de SUM() / COUNT() = 200
    const r = await svc.syncFromHistory('ind-1', {
      value: 200,
      status: 'SUCCESS',
    });
    expect(r.currentValue).toBe(200);
    expect(r.status).toBe(IndicatorStatus.SUCCESS);
    expect(r.synced).toBe(true);
  });

  it('16. COUNT sem dados → currentValue = 0 (0 é valor semântico válido)', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: 0,
      status: 'NEUTRAL',
    });
    expect(r.currentValue).toBe(0);
    expect(r.synced).toBe(true);
    const data = (
      prisma.updateSpy.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data['currentValue']).toBe(0);
  });

  it('17. NO_DATA → value = null preservado (NÃO converte para 0)', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: null,
      status: 'NEUTRAL',
    });
    expect(r.currentValue).toBeNull();
    const data = (
      prisma.updateSpy.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data['currentValue']).toBeNull();
  });

  // ── 7. Comportamento de erro ──────────────────────────────────────────────

  it('18. erro no update → erro propagado (não mascarado)', async () => {
    const prisma = makePrisma();
    prisma.updateSpy.mockRejectedValue(new Error('DB error'));
    const svc = makeService(prisma);
    await expect(
      svc.syncFromHistory('ind-1', { value: 100, status: 'SUCCESS' }),
    ).rejects.toThrow('DB error');
  });

  // ── 8. Múltiplas sincronizações ───────────────────────────────────────────

  it('19. múltiplas sincronizações preservam o último estado', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    // Primeira: value=100
    await svc.syncFromHistory('ind-1', { value: 100, status: 'NEUTRAL' });
    // Segunda: value=200 (período mais recente)
    await svc.syncFromHistory('ind-1', { value: 200, status: 'SUCCESS' });
    expect(prisma.updateSpy).toHaveBeenCalledTimes(2);
    // Segunda chamada tem value=200
    const lastCall = prisma.updateSpy.mock.calls[1][0] as {
      data: Record<string, unknown>;
    };
    expect(lastCall.data['currentValue']).toBe(200);
    expect(lastCall.data['status']).toBe('SUCCESS');
  });

  // ── 9. Proteção contra campos proibidos ───────────────────────────────────

  it('20. proteção: Decimal-like { toNumber() } convertido corretamente', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const decimalLike = { toNumber: () => 123.456 };
    const r = await svc.syncFromHistory('ind-1', {
      value: decimalLike,
      status: 'SUCCESS',
    });
    expect(r.currentValue).toBe(123.456);
    const data = (
      prisma.updateSpy.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data['currentValue']).toBe(123.456);
  });

  it('21. value negativo preservado', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: -150,
      status: 'DANGER',
    });
    expect(r.currentValue).toBe(-150);
  });

  it('22. value = string numérica → convertida para number', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-1', {
      value: '500.25',
      status: 'SUCCESS',
    });
    expect(r.currentValue).toBe(500.25);
  });

  it('23. where usa indicatorId correto', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    await svc.syncFromHistory('ind-xyz', { value: 100, status: 'SUCCESS' });
    const updateCall = prisma.updateSpy.mock.calls[0][0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(updateCall.where['id']).toBe('ind-xyz');
  });

  it('24. indicatorId retornado no resultado', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    const r = await svc.syncFromHistory('ind-abc', {
      value: 100,
      status: 'SUCCESS',
    });
    expect(r.indicatorId).toBe('ind-abc');
  });
});
