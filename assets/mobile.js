/* ============================================================
   Mobile app-like (compartilhado em TODAS as páginas do portal).
   Inclua 1 linha antes do </body> (ajuste ../ conforme a pasta):
     <script src="../assets/mobile.js"></script>

   1) TRAVA DE ZOOM — comportamento de app (Facebook/Instagram):
      sem pinça, sem duplo-toque; a página só se adapta à tela.
   2) TABELAS NO MOBILE — visão COMPACTA padronizada: rótulo +
      Meta (Rem/Orç) + Real + Δ% (fonte menor), nunca só o Real.
      O botão "+ Detalhar" abre a tabela COMPLETA (igual ao PC),
      com rolagem horizontal própria. Tabelas com células mescladas
      ou cabeçalho composto ficam inteiras atrás do botão.
      NADA muda no desktop (tudo escopado em @media ≤768px).
   3) "(INATIVO)" nunca aparece em nenhuma tela.
   ============================================================ */
(function(){
  var d=document;

  /* ── 1) trava de zoom ── */
  function lockZoom(){
    var m=d.querySelector('meta[name="viewport"]');
    if(!m){m=d.createElement('meta');m.setAttribute('name','viewport');(d.head||d.documentElement).appendChild(m);}
    m.setAttribute('content','width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    var st=d.createElement('style');
    st.textContent=
      'html{touch-action:manipulation;-webkit-text-size-adjust:100%;}'+
      '.mt-detail-btn{display:inline-flex;align-items:center;gap:6px;margin:2px 0 10px;background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.3);border-radius:4px;padding:6px 12px;font-family:Montserrat,sans-serif;font-size:10px;font-weight:700;color:#F97316;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;}'+
      '@media(max-width:768px){'+
        'html,body{overflow-x:hidden;}'+
        /* tipografia de app: heros, cards, títulos e chips menores no mobile
           (classes compartilhadas por todos os painéis clonados do visão-financeira) */
        '.hero-value{font-size:30px!important;}'+
        '.hero-label{font-size:9px!important;letter-spacing:.6px!important;}'+
        '.hero-deltas{gap:8px 16px!important;flex-wrap:wrap!important;}'+
        '.hero-delta{font-size:8.5px!important;}'+
        '.hero-delta b{font-size:12px!important;}'+
        '.kpi-card{padding:9px 10px!important;}'+
        '.card-label{font-size:8px!important;}'+
        '.card-value{font-size:15px!important;}'+
        '.card-delta-v{font-size:13px!important;}'+
        '.card-delta-p,.card-meta,.card-imp{font-size:9px!important;}'+
        '.tbl-title{font-size:13px!important;}'+
        '.tbl-sub{font-size:9px!important;}'+
        '.chart-title{font-size:12px!important;padding-right:64px;}'+
        '.chart-leg{font-size:9px!important;}'+
        '.ref-toggle{font-size:9px!important;padding:3px 8px!important;}'+
        '.dim-btn,.seg-btn{font-size:9px!important;padding:4px 8px!important;}'+
        '[data-mt-wrap]{overflow-x:auto;max-width:100%;}'+
        '[data-mt-box] table{table-layout:auto!important;}'+
        /* compacta: só as colunas escolhidas, fonte menor, sem estouro */
        '[data-mt-box="compact"]:not(.mt-open) .mt-hide{display:none!important;}'+
        '[data-mt-box="compact"]:not(.mt-open) .mt-keep{display:table-cell!important;}'+
        '[data-mt-box="compact"]:not(.mt-open) table{min-width:0!important;width:100%;font-size:11px;}'+
        '[data-mt-box="compact"]:not(.mt-open) th,[data-mt-box="compact"]:not(.mt-open) td{padding:7px 5px!important;white-space:normal;}'+
        /* detalhada: TODAS as colunas (inclusive as escondidas pelo CSS da página), com rolagem */
        '[data-mt-box].mt-open .mt-hide,[data-mt-box].mt-open .mt-keep{display:table-cell!important;}'+
        '[data-mt-box].mt-open table{min-width:max-content;font-size:10px;}'+
        '[data-mt-box].mt-open th,[data-mt-box].mt-open td{white-space:nowrap;}'+
      '}';
    (d.head||d.documentElement).appendChild(st);
    ['gesturestart','gesturechange','gestureend'].forEach(function(ev){
      d.addEventListener(ev,function(e){e.preventDefault();},{passive:false});
    });
  }

  /* ── 3) "(INATIVO)" nunca aparece na tela ── */
  var RE_INAT=/\s*\(INATIVO\)/gi;
  function scrubInativo(){
    if(!d.body||d.body.textContent.indexOf('(INATIVO)')<0)return;
    var w=d.createTreeWalker(d.body,NodeFilter.SHOW_TEXT,null),n;
    while((n=w.nextNode())){
      if(n.nodeValue&&n.nodeValue.indexOf('(INATIVO)')>=0)
        n.nodeValue=n.nodeValue.replace(RE_INAT,'');
    }
  }

  /* ── 2) tabelas no mobile ── */
  var MQ=window.matchMedia('(max-width:768px)');
  var NORM=function(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/\s+/g,' ').trim();};
  function tooWide(t){return t.scrollWidth>d.documentElement.clientWidth+8;}
  function pageHidCols(t){var r=t.tHead&&t.tHead.rows[0];if(!r)return false;
    return [].some.call(r.cells,function(c){return getComputedStyle(c).display==='none';});}
  function isStacked(t){var td=t.querySelector('tbody td')||t.querySelector('td');
    return !!td&&getComputedStyle(td).display!=='table-cell';}

  /* Escolha das colunas da visão compacta:
     rótulo (1ª col; +2ª se a 1ª for '#') · Meta (Rem > Orç > Meta) · Real · Δ%
     (Δ% da mesma referência quando houver). Sem coluna Real: 3 primeiras + última. */
  function pickCols(t){
    var hr=t.tHead.rows[t.tHead.rows.length-1];
    var hs=[].map.call(hr.cells,function(c){return NORM(c.textContent);});
    var n=hs.length,keep={};
    keep[0]=1;
    if((hs[0]===''||hs[0]==='#')&&n>1)keep[1]=1;
    function find(re,not){for(var i=0;i<n;i++){if(keep[i])continue;var h=hs[i];if(re.test(h)&&(!not||!not.test(h)))return i;}return -1;}

    /* RANKING (Renan, 21/08/2026): tabela larga com um indicador por coluna
       mostra no celular só QUEM é a linha + a PONTUAÇÃO; os indicadores
       aparecem no "+ Detalhar". O bloco de identidade são as colunas de
       TEXTO do começo (ex.: # · Unidade · Tier) — sem elas duas linhas da
       mesma unidade em tiers diferentes ficariam iguais. */
    if(n>=6){
      var score=-1,ordem=[/PONTUA|SCORE|\bNOTA\b/,/M[EÉ]DIA/,/ADER[EÊ]NCIA TOTAL|\bTOTAL\b/];
      for(var o=0;o<ordem.length&&score<0;o++)score=find(ordem[o]);
      if(score>=0){
        var linha=t.tBodies[0]&&t.tBodies[0].rows[0];
        var ident=2;                                   /* sem corpo: rótulo (+#) */
        if(linha){
          ident=0;
          for(var c=0;c<Math.min(n,4);c++){
            var txt=NORM((linha.cells[c]||{}).textContent||'');
            if(hs[c]===''||hs[c]==='#'){ ident=c+1; continue; }   /* a coluna do ranking (#) é identidade */
            if(txt==='')  { ident=c+1; continue; }      /* célula vazia ainda é identidade */
            if(/[A-Z]/.test(txt)&&!/^[-+]?[\d.,]+\s*(%|PP|R\$)?$/.test(txt)){ ident=c+1; continue; }
            break;                                     /* achou número: acabou a identidade */
          }
          if(!ident)ident=1;
        }
        keep={}; for(var k=0;k<ident&&k<score;k++)keep[k]=1; keep[score]=1;
        return keep;
      }
    }
    var NOT_D=/Δ|DELTA|DESV|VAR|%/;
    var real=find(/REALIZAD|\bREAL\b/,NOT_D);
    if(real>=0){
      keep[real]=1;
      var metaKind='';
      var meta=find(/REMUNERAD|\bREM\b|\bREM\./,NOT_D); if(meta>=0)metaKind='REM';
      if(meta<0){meta=find(/ORCAD|\bORC\b|\bORC\./,NOT_D); if(meta>=0)metaKind='ORC';}
      if(meta<0){meta=find(/\bMETA\b|OBJETIVO/,NOT_D);}
      if(meta>=0)keep[meta]=1;
      var dq=-1;
      if(metaKind==='REM')dq=find(/(Δ|DELTA|DESV|VAR)[^%]*REM[^%]*%|REM[^%]*(Δ|DELTA)[^%]*%/);
      if(dq<0&&metaKind==='ORC')dq=find(/(Δ|DELTA|DESV|VAR)[^%]*OR[CÇ][^%]*%|OR[CÇ][^%]*(Δ|DELTA)[^%]*%/);
      if(dq<0)dq=find(/(Δ|DELTA|DESV|VAR|ATING|ADER)[^%]*%/);
      if(dq<0)dq=find(/%$/);
      if(dq>=0)keep[dq]=1;
    }else{
      for(var i=1;i<Math.min(3,n);i++)keep[i]=1;
      if(n>3)keep[n-1]=1;   /* última col costuma ser status/valor */
    }
    return keep;
  }
  function stamp(t,keep){
    [].forEach.call(t.rows,function(row){
      [].forEach.call(row.cells,function(c,i){
        if(c.classList.contains('mt-keep')||c.classList.contains('mt-hide'))return;
        c.classList.add(keep[i]?'mt-keep':'mt-hide');
      });
    });
  }
  function wrap(t,mode){
    var box=d.createElement('div');box.setAttribute('data-mt-box',mode);
    var btn=d.createElement('button');btn.type='button';btn.className='mt-detail-btn';btn.textContent='+ Detalhar';
    var wr=d.createElement('div');wr.setAttribute('data-mt-wrap','1');
    if(mode==='hide')wr.style.display='none';
    t.parentNode.insertBefore(box,t);
    wr.appendChild(t);box.appendChild(btn);box.appendChild(wr);
    btn.addEventListener('click',function(){
      var open=box.classList.toggle('mt-open');
      if(mode==='hide')wr.style.display=open?'':'none';
      btn.textContent=open?'− Ocultar detalhes':'+ Detalhar';
    });
    return box;
  }

  /* ── 2b) Chart.js no mobile: eixos/legendas menores (todas as páginas) ──
     Plugin global registrado antes dos gráficos serem criados (eles nascem
     depois do fetch). No desktop não interfere. */
  function setupChartMobile(){
    if(!window.Chart||!Chart.register||Chart._mtMobile)return;
    Chart._mtMobile=true;
    var shrinkF=function(o,key){var f=o[key];if(f&&typeof f!=='object')return;f=o[key]=f||{};f.size=Math.min(f.size||12,8);};
    Chart.register({id:'mtMobileFonts',beforeInit:function(c){
      if(!MQ.matches)return;
      try{
        var o=c.options||{};
        var sc=o.scales||{};
        Object.keys(sc).forEach(function(k){var s=sc[k]||{};if(s.ticks){shrinkF(s.ticks,'font');if(s.ticks.padding==null)s.ticks.padding=2;}});
        var pl=o.plugins||{};
        if(pl.legend&&pl.legend.labels){shrinkF(pl.legend.labels,'font');if(pl.legend.labels.boxWidth)pl.legend.labels.boxWidth=Math.min(pl.legend.labels.boxWidth,10);}
        if(pl.datalabels)shrinkF(pl.datalabels,'font');
        if(pl.title)shrinkF(pl.title,'font');
      }catch(e){}
    }});
  }

  var t0=null;
  function scan(){
    scrubInativo();
    if(!MQ.matches){ /* desktop / rotação: tudo aberto, botões escondidos */
      d.querySelectorAll('[data-mt-wrap]').forEach(function(w){w.style.display='';});
      d.querySelectorAll('.mt-detail-btn').forEach(function(b){b.style.display='none';});
      d.querySelectorAll('[data-mt-pbtn]').forEach(function(b){b.style.display='';b.removeAttribute('data-mt-pbtn');});
      return;
    }
    d.querySelectorAll('.mt-detail-btn').forEach(function(b){b.style.display='';});
    /* re-carimba linhas novas de tabelas compactas já tratadas (re-render de tbody) */
    d.querySelectorAll('[data-mt-box="compact"] table').forEach(function(t){if(t._mtKeep)stamp(t,t._mtKeep);});
    d.querySelectorAll('table').forEach(function(t){
      if(t.closest('[data-mt-wrap]'))return;                 /* já tratada */
      if(!t.offsetParent)return;                              /* invisível agora */
      if(t.closest('.ms-panel,.farol-panel,.kmodal'))return;  /* dropdowns/modais */
      if(isStacked(t))return;                                 /* página já vira cards no mobile */
      var simple=t.tHead&&t.tHead.rows.length===1&&t.tHead.rows[0].cells.length>=3&&!t.querySelector('[colspan],[rowspan]');
      if(simple&&(tooWide(t)||pageHidCols(t))){
        var keep=pickCols(t);t._mtKeep=keep;stamp(t,keep);wrap(t,'compact');
      }else if(tooWide(t)){
        wrap(t,'hide');                                       /* mesclada/complexa: inteira atrás do botão */
      }
    });
    /* botões de detalhe próprios das páginas viram redundantes no mobile */
    d.querySelectorAll('button').forEach(function(b){
      if(b.classList.contains('mt-detail-btn'))return;
      if(/^\s*[+−-]?\s*(ver detalhes|detalhar|ocultar detalhes)/i.test(b.textContent||'')){
        b.setAttribute('data-mt-pbtn','1');b.style.display='none';
      }
    });
  }
  function schedule(){clearTimeout(t0);t0=setTimeout(scan,250);}
  function start(){
    lockZoom();
    setupChartMobile();
    new MutationObserver(schedule).observe(d.documentElement,{childList:true,subtree:true});
    window.addEventListener('resize',schedule);
    window.addEventListener('orientationchange',schedule);
    schedule();
  }
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start);else start();
})();
