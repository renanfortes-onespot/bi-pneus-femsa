// ============================================================
// BI Pneus FEMSA — Loader Prolog → Supabase
// Apps Script com gatilho de tempo (1x/hora)
//
// Configurar gatilho: Relógio > cargaHoraria > Acionador de tempo > A cada hora
// ============================================================

const CONFIG = {
  TOKEN: 'stgA3aUNggcJNxcgT1tmC720zdlFVxJEoLRqzMfjHils8RxxMKK',
  BASE_URL: 'https://prologapp.com/prolog/api/v3',
  BRANCH_IDS: [2707],                       // adicionar novas unidades aqui
  PAGE_SIZE: 100,
  DELAY_MS: 6500,

  SUPABASE_URL: 'COLE_AQUI_https://xxxx.supabase.co',
  SUPABASE_SERVICE_KEY: 'COLE_AQUI_service_role_key'
};

// ============================================================
// CARGA PRINCIPAL — agendar 1x/hora
// ============================================================
function cargaHoraria() {
  CONFIG.BRANCH_IDS.forEach(branchId => {
    Logger.log('=== Carga branch ' + branchId + ' ===');
    const vehicles    = fetchAllVehicles(branchId);
    const tires       = fetchAllTires(branchId);
    const inspections = fetchAllInspections(branchId);

    upsertSnapshot('vehicles', branchId, vehicles);
    upsertSnapshot('tires', branchId, tires);
    upsertSnapshot('inspections', branchId, inspections);

    Logger.log(`OK: ${vehicles.length} veículos, ${tires.length} pneus, ${inspections.length} medições`);
  });
}

// ============================================================
// FOTO MENSAL — agendar 1x/dia (grava/atualiza a competência do mês)
// ============================================================
function fotoMensal() {
  const hoje = new Date();
  const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

  CONFIG.BRANCH_IDS.forEach(branchId => {
    const tires = fetchAllTires(branchId).filter(t => t.status === 'INSTALLED');
    const rows = tires.map(t => ({
      competencia,
      branch_id: branchId,
      tire_id: t.id,
      serial: t.serial,
      placa: t.placa,
      menor_mm: t.menorMM,
      amplitude: t.amplitude,
      ciclo_vida: t.cicloVida,
      dot: t.dot,
      pressao_atual: t.pressaoAtual,
      pressao_ideal: t.pressaoIdeal,
      pressao_nok: t.pressaoNOK,
      status_mm: t.statusMM
    }));

    // upsert em lotes de 500
    for (let i = 0; i < rows.length; i += 500) {
      supabaseRequest('historico_mensal?on_conflict=competencia,tire_id', 'POST',
        rows.slice(i, i + 500), { Prefer: 'resolution=merge-duplicates' });
    }
    Logger.log(`Foto mensal ${competencia} branch ${branchId}: ${rows.length} pneus`);
  });
}

// ============================================================
// SUPABASE
// ============================================================
function upsertSnapshot(endpoint, branchId, data) {
  supabaseRequest('snapshot', 'POST', [{
    endpoint, branch_id: branchId, data, updated_at: new Date().toISOString()
  }], { Prefer: 'resolution=merge-duplicates' });
}

function supabaseRequest(path, method, body, extraHeaders) {
  const res = UrlFetchApp.fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    contentType: 'application/json',
    headers: Object.assign({
      apikey: CONFIG.SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + CONFIG.SUPABASE_SERVICE_KEY
    }, extraHeaders || {}),
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code >= 300) throw new Error(`Supabase ${code}: ${res.getContentText().slice(0, 300)}`);
}

// ============================================================
// PROLOG API (mesma lógica do proxy atual)
// ============================================================
function fetchPaginated(path, params) {
  const all = [];
  let page = 0;
  do {
    const query = Object.entries(Object.assign({}, params, { pageSize: CONFIG.PAGE_SIZE, pageNumber: page }))
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const res = UrlFetchApp.fetch(`${CONFIG.BASE_URL}${path}?${query}`, {
      method: 'GET',
      headers: { 'x-prolog-api-token': CONFIG.TOKEN },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 429) { Utilities.sleep(61000); continue; }
    const json = JSON.parse(res.getContentText());
    if (!json.content || json.content.length === 0) break;
    all.push(...json.content);
    if (json.lastPage) break;
    page++;
    Utilities.sleep(CONFIG.DELAY_MS);
  } while (true);
  return all;
}

function fetchAllVehicles(branchId) {
  return fetchPaginated('/vehicles', { branchOfficesId: branchId, includeInactive: false }).map(v => ({
    id: v.id,
    placa: v.licensePlate,
    frota: v.fleetId || '',
    tipo: v.type?.name || '',
    marca: v.make?.name || '',
    modelo: v.model?.name || '',
    odometro: v.currentOdometer || 0,
    pneusInstalados: v.totalInstalledTires || 0,
    pneusEsperados: v.expectedInstalledTires || 0,
    atualizadoEm: v.updatedAt || ''
  }));
}

function fetchAllTires(branchId) {
  return fetchPaginated('/tires', { branchOfficesId: branchId }).map(p => {
    const mm1 = p.innerTreadDepth || 0;
    const mm2 = p.middleInnerTreadDepth || 0;
    const mm3 = p.middleOuterTreadDepth || 0;
    const mm4 = p.outerTreadDepth || 0;
    const menor = p.smallestTreadDepth || Math.min(mm1, mm2, mm3, mm4);
    const amplitude = parseFloat((Math.max(mm1, mm2, mm3, mm4) - menor).toFixed(2));

    let statusMM = 'Bom Estado';
    if (menor < 2)       statusMM = 'Bloquear';
    else if (menor <= 3) statusMM = 'Recapar';
    else if (menor <= 6) statusMM = 'Regular';

    const pIdeal = p.recommendedPressure || 0;
    const pAtual = p.currentPressure || 0;
    const desvioPct = pIdeal > 0 ? parseFloat((((pAtual - pIdeal) / pIdeal) * 100).toFixed(2)) : 0;
    const lc = p.tireLifecycles?.[0] || {};

    return {
      id: p.id,
      serial: p.serialNumber || '',
      status: p.status || '',
      marca: p.make?.name?.trim() || '',
      modelo: p.model?.name || '',
      sulcos: p.model?.groovesQuantity || 0,
      cicloVida: p.currentLifeCycle || 1,
      maxCiclos: p.maxLifeCycles || 5,
      banda: p.currentRetread?.model?.name || '',
      dot: p.dot || '',
      mm1, mm2, mm3, mm4,
      menorMM: menor,
      amplitude,
      statusMM,
      pressaoIdeal: pIdeal,
      pressaoAtual: pAtual,
      desvioPressao: desvioPct,
      pressaoNOK: Math.abs(desvioPct) > 15,
      cpk: lc.cpk || 0,
      kmRodados: lc.totalDistanceDriven || 0,
      custo: p.purchaseCost || 0,
      veiculoId: p.installed?.vehicleId || null,
      placa: p.installed?.licensePlate || '',
      frota: p.installed?.fleetId || '',
      posicao: p.installed?.installedPosition || null,
      nomePosicao: p.installed?.installedPositionName || '',
      direcional: p.installed?.isOnSteeringAxle || false,
      criadoEm: p.createdAt || ''
    };
  });
}

function fetchAllInspections(branchId) {
  const hoje = new Date();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - 6);

  const raw = fetchPaginated('/tire-inspections/vehicles', {
    branchOfficesId: branchId,
    startDate: inicio.toISOString().split('.')[0] + 'Z',
    endDate: hoje.toISOString().split('.')[0] + 'Z',
    includeMeasures: true
  });

  const result = [];
  raw.forEach(insp => {
    const dias = Math.floor((hoje - new Date(insp.submittedAt)) / 86400000);
    (insp.inspectionMeasures || []).forEach(m => {
      const mm1 = m.measuredInnerTreadDepth || 0;
      const mm2 = m.measuredMiddleInnerTreadDepth || 0;
      const mm3 = m.measuredMiddleOuterTreadDepth || 0;
      const mm4 = m.measuredOuterTreadDepth || 0;
      const menor = parseFloat(Math.min(mm1, mm2, mm3, mm4).toFixed(2));
      const amplitude = parseFloat((Math.max(mm1, mm2, mm3, mm4) - menor).toFixed(2));
      const pIdeal = m.recommendedPressure || 0;
      const pMedida = m.measuredPressure || 0;
      const desvioPct = pIdeal > 0 ? parseFloat((((pMedida - pIdeal) / pIdeal) * 100).toFixed(2)) : 0;

      result.push({
        inspecaoId: insp.id,
        veiculoId: insp.vehicle?.id || null,
        placa: insp.vehicle?.licensePlate || '',
        frota: insp.vehicle?.fleetId || '',
        dataInspecao: insp.submittedAt,
        dias,
        aderencia: dias <= 20 ? 'No Prazo' : dias <= 30 ? 'Em Atenção' : 'Vencida',
        odometro: insp.odometerReading || 0,
        inspetor: insp.submittedBy?.name || '',
        tireId: m.tireId,
        serial: m.tireSerialNumber || '',
        posicao: m.tirePositionAtInspection,
        mm1, mm2, mm3, mm4,
        menorMM: menor,
        amplitude,
        pressaoIdeal: pIdeal,
        pressaoMedida: pMedida,
        desvioPressao: desvioPct,
        pressaoNOK: Math.abs(desvioPct) > 15
      });
    });
  });
  return result;
}
