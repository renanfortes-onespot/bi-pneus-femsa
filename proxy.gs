// ============================================================
// BI Pneus FEMSA — Apps Script Web App (Proxy)
// Publicar como: Web App > Qualquer pessoa
// ============================================================

const CONFIG = {
  TOKEN: 'stgA3aUNggcJNxcgT1tmC720zdlFVxJEoLRqzMfjHils8RxxMKK',
  BASE_URL: 'https://prologapp.com/prolog/api/v3',
  BRANCH_ID: 2707,
  PAGE_SIZE: 100
};

function doGet(e) {
  const endpoint = e.parameter.endpoint || '';
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    let data;
    if (endpoint === 'vehicles')    data = fetchAllVehicles();
    else if (endpoint === 'tires')  data = fetchAllTires();
    else if (endpoint === 'inspections') data = fetchAllInspections();
    else data = { error: 'Endpoint inválido. Use: vehicles, tires, inspections' };
    output.setContent(JSON.stringify(data));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }

  return output;
}

// ---- UTILITÁRIO ----
function fetchPaginated(path, params) {
  const all = [];
  let page = 0;

  do {
    const query = Object.entries({ ...params, pageSize: CONFIG.PAGE_SIZE, pageNumber: page })
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

    const url = `${CONFIG.BASE_URL}${path}?${query}`;
    const res = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: { 'x-prolog-api-token': CONFIG.TOKEN },
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 429) {
      Utilities.sleep(61000);
      continue;
    }

    const json = JSON.parse(res.getContentText());
    if (!json.content || json.content.length === 0) break;
    all.push(...json.content);
    if (json.lastPage) break;
    page++;
    Utilities.sleep(6500);
  } while (true);

  return all;
}

// ---- VEÍCULOS ----
function fetchAllVehicles() {
  const raw = fetchPaginated('/vehicles', {
    branchOfficesId: CONFIG.BRANCH_ID,
    includeInactive: false
  });

  return raw.map(v => ({
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

// ---- PNEUS ----
function fetchAllTires() {
  const raw = fetchPaginated('/tires', {
    branchOfficesId: CONFIG.BRANCH_ID
  });

  return raw.map(p => {
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
    const pressaoNOK = Math.abs(desvioPct) > 15;

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
      pressaoNOK,
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

// ---- INSPEÇÕES ----
function fetchAllInspections() {
  const hoje = new Date();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - 6);

  const raw = fetchPaginated('/tire-inspections/vehicles', {
    branchOfficesId: CONFIG.BRANCH_ID,
    startDate: inicio.toISOString().split('.')[0] + 'Z',
    endDate: hoje.toISOString().split('.')[0] + 'Z',
    includeMeasures: true
  });

  const result = [];

  raw.forEach(insp => {
    const dataInsp = new Date(insp.submittedAt);
    const dias = Math.floor((hoje - dataInsp) / 86400000);
    let aderencia = dias <= 20 ? 'No Prazo' : dias <= 30 ? 'Em Atenção' : 'Vencida';

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
        aderencia,
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
