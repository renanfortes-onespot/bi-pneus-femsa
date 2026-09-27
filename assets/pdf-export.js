/* ============================================================
   Exportador de PDF — relatório em slides 16:9 (estilo PowerPoint)
   Compartilhado por todos os painéis. Uso no painel:
     <script src="../assets/pdf-export.js"></script>   (ajuste o ../ conforme a profundidade)
     <script> initPdfExport(); </script>               (após o restante carregar)
   Opções (todas opcionais):
     initPdfExport({ title, subtitle, main, fileBase, btnContainer, btnClass,
                     views, viewAtual, irPara, setTheme, isLight })
   - title:      título do relatório (default: .brand h1 / .s-top b / document.title)
   - subtitle:   subtítulo (default: .brand p)
   - main:       seletor OU função do container do conteúdo (default: 'main')
   - fileBase:   base do nome do arquivo (default: slug do título)
   - btnContainer: onde pendurar o botão (default: '.header-right')
   - btnClass:   classe do botão, p/ reaproveitar o estilo do painel (default: 'pdf-btn')
   - views:      array/função → [{label, ativar}] — painéis de VISÕES (layout padrão):
                 UM SLIDE POR VISÃO, com o painel inteiro e o menu lateral recolhido
   - viewAtual / irPara: leitura e restauração da visão ativa ao terminar
   - setTheme:   função(t) que aplica 'light'/'dark' (default: applyTheme/aplicaTema)
   - isLight:    função → true se a tela está no tema claro
   Funciona nos dois layouts: o antigo (body.light-mode, página que rola) e o
   padrão do portal (body.claro, .app de altura fixa com áreas que rolam).
   ============================================================ */
(function(){
  // ---------- CSS ----------
  const CSS = `
.pdf-wrap{position:relative;}
.pdf-btn{display:flex;align-items:center;gap:5px;background:rgba(249,115,22,.15);border:1px solid rgba(249,115,22,.3);border-radius:4px;padding:5px 9px;cursor:pointer;color:var(--orange,#F97316);font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;letter-spacing:.5px;}
.pdf-btn:hover{background:rgba(249,115,22,.32);}
.pdf-btn:disabled,.pdf-wrap button:disabled{opacity:.55;cursor:default;}
/* menu POSICIONADO POR JS (fixed): dentro da lateral, que rola, um absolute seria cortado */
.pdf-menu{display:none;position:fixed;z-index:9500;flex-direction:column;background:var(--pop,#0f1824);border:1px solid var(--card-brd,#2a3a50);border-radius:6px;overflow:hidden;box-shadow:0 18px 44px rgba(0,0,0,.45),0 3px 10px rgba(0,0,0,.30);min-width:118px;}
.pdf-menu.open{display:flex;}
.pdf-menu button{background:none;border:none;color:var(--txt,var(--text,#F1F5F9));font-family:'Montserrat',sans-serif;font-size:11px;font-weight:700;text-align:left;padding:8px 12px;cursor:pointer;}
.pdf-menu button:hover{background:var(--hover,rgba(249,115,22,.18));color:var(--laranja,var(--orange,#F97316));}
#pdf-overlay{position:fixed;inset:0;z-index:9999;background:rgba(8,11,16,.82);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;}
#pdf-overlay .pdf-ov-box{display:flex;flex-direction:column;align-items:center;gap:14px;color:#F1F5F9;font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;letter-spacing:.5px;}
#pdf-overlay .pdf-ov-spin{width:34px;height:34px;border:3px solid rgba(249,115,22,.25);border-top-color:#F97316;border-radius:50%;animation:pdfspin .8s linear infinite;}
@keyframes pdfspin{to{transform:rotate(360deg);}}
#pdf-report-head,.pdf-view-tit{display:none;}
body.exporting #pdf-report-head{display:block;background:#FFFFFF;color:#111;padding:0 0 6px;margin-bottom:10px;font-family:'Montserrat',sans-serif;}
body.exporting:not(.light-mode):not(.claro) #pdf-report-head{background:#0C1017;color:#F1F5F9;}
#pdf-report-head .rh-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;}
#pdf-report-head .rh-title{font-size:30px;font-weight:800;color:#0C1017;letter-spacing:.3px;}
#pdf-report-head .rh-sub{font-size:11px;color:#555;margin-top:2px;font-weight:600;}
#pdf-report-head .rh-meta{font-size:10px;color:#555;text-align:right;font-weight:600;line-height:1.5;}
#pdf-report-head .rh-filtros{margin-top:10px;font-size:10.5px;color:#222;line-height:1.6;}
#pdf-report-head .rh-filtros b{color:#F97316;}
body.exporting:not(.light-mode):not(.claro) #pdf-report-head .rh-title{color:#FFFFFF;}
body.exporting:not(.light-mode):not(.claro) #pdf-report-head .rh-sub,body.exporting:not(.light-mode):not(.claro) #pdf-report-head .rh-meta{color:#94A3B8;}
body.exporting:not(.light-mode):not(.claro) #pdf-report-head .rh-filtros{color:#CBD5E1;}
body.exporting .pdf-view-tit{display:block;font-family:'Montserrat',sans-serif;font-size:19px;font-weight:800;letter-spacing:.2px;color:#0C1017;margin:0 0 9px;}
body.exporting:not(.light-mode):not(.claro) .pdf-view-tit{color:#FFFFFF;}
/* Capa do relatório (layout padrão): ocupa a tela inteira e vira o 1º slide */
#pdf-capa{display:none;}
body.exporting #pdf-capa{display:flex;position:fixed;inset:0;z-index:9000;flex-direction:column;justify-content:center;
  padding:0 7%;font-family:'Montserrat',sans-serif;color:var(--txt,#F1F5F9);}
#pdf-capa .cp-tit{font-size:78px;font-weight:700;letter-spacing:-2.5px;line-height:1;}
#pdf-capa .cp-regua{width:120px;height:5px;border-radius:3px;background:var(--laranja,#F97316);margin:22px 0 20px;}
#pdf-capa .cp-sub{font-size:23px;font-weight:600;color:var(--txt2,#94A3B8);}
#pdf-capa .cp-fil{font-size:17px;color:var(--txt2,#94A3B8);line-height:2;margin-top:42px;max-width:84%;}
#pdf-capa .cp-fil b{color:var(--laranja,#F97316);font-weight:700;}
#pdf-capa .cp-meta{font-size:15px;font-weight:600;color:var(--txt3,#676F83);margin-top:44px;line-height:1.7;}
/* Durante a captura: o próprio botão de PDF e as dicas saem do quadro */
body.exporting .pdf-wrap,body.exporting .dica{display:none!important;}
@media print{ .pdf-wrap{display:none;} }
`;

  let CFG = {};

  window.initPdfExport = function(cfg){
    CFG = cfg || {};
    const st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);

    // botão + menu no header-right (ou container informado)
    const cont = document.querySelector(CFG.btnContainer || '.header-right');
    if(cont){
      const wrap=document.createElement('div'); wrap.className='pdf-wrap';
      wrap.innerHTML =
        '<button class="'+(CFG.btnClass||'pdf-btn')+'" id="pdfBtn" title="Exportar relatório PDF (estado filtrado)">'+
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>'+
        '<span>PDF</span></button>'+
        '<div class="pdf-menu" id="pdfMenu"><button data-mode="light">☀ Claro</button><button data-mode="dark">🌙 Escuro</button></div>';
      if(CFG.btnAoFim) cont.appendChild(wrap); else cont.insertBefore(wrap, cont.firstChild);
      // o menu vai para o BODY: dentro do .app, que tem backdrop-filter, um
      // position:fixed se ancora no .app (não na tela) e o menu sai do lugar.
      // Os cliques são ligados ANTES de mover — depois ele não é mais filho do wrap.
      const menu=document.getElementById('pdfMenu');
      menu.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>exportar(b.dataset.mode)));
      document.body.appendChild(menu);
      document.getElementById('pdfBtn').addEventListener('click',e=>{e.stopPropagation();
        const m=menu, b=e.currentTarget;
        const abrir=!m.classList.contains('open');
        m.classList.toggle('open', abrir);
        if(abrir){                                    // posiciona junto do botão, sem depender do container
          const r=b.getBoundingClientRect();
          m.style.left=Math.min(r.left, window.innerWidth-m.offsetWidth-8)+'px';
          m.style.top =Math.min(r.bottom+4, window.innerHeight-m.offsetHeight-8)+'px';
        }
      });
      document.addEventListener('click',e=>{ if(!e.target.closest('.pdf-wrap,.pdf-menu')) menu.classList.remove('open'); });
    }

    // o cabeçalho do relatório é criado/movido no momento da exportação (suporta painéis SPA por página)
  };

  function getMain(){ const s=CFG.main; let el=null; if(typeof s==='function'){try{el=s();}catch(_){}} else if(s) el=document.querySelector(s); return el || document.querySelector('main') || document.querySelector('.main'); }
  function isTableBlock(e){ return e.classList.contains('tbl-section') || e.classList.contains('adh-table-wrap') || !!(e.querySelector && e.querySelector('table')); }
  function resolveTitle(){ const t=CFG.title; const v=(typeof t==='function')?t():t;
    return v || (document.querySelector('.brand h1')||{}).textContent || (document.querySelector('.s-top b')||{}).textContent || document.title; }
  function resolveSub(){ const s=CFG.subtitle; const v=(typeof s==='function')?s():s; return v!=null?v:((document.querySelector('.brand p')||{}).textContent||''); }
  function resolveViews(){ const v=CFG.views; const a=(typeof v==='function')?v():v; return Array.isArray(a)?a.filter(Boolean):[]; }
  function temaClaro(){ if(typeof CFG.isLight==='function') return !!CFG.isLight();
    return document.body.classList.contains('light-mode') || document.body.classList.contains('claro'); }
  // garante o cabeçalho como 1º filho do main atual (cria/move; atualiza título dinâmico)
  function ensureHead(main){
    let head=document.getElementById('pdf-report-head');
    if(!head){ head=document.createElement('div'); head.id='pdf-report-head';
      head.innerHTML='<div class="rh-top"><div><div class="rh-title"></div><div class="rh-sub"></div></div><div class="rh-meta" id="rh-meta"></div></div><div class="rh-filtros" id="rh-filtros"></div>'; }
    if(main && main.firstChild!==head) main.insertBefore(head, main.firstChild);
    head.querySelector('.rh-title').textContent=resolveTitle();
    const sub=resolveSub(), se=head.querySelector('.rh-sub'); se.textContent=sub; se.style.display=sub?'':'none';
    return head;
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  function slug(s){return String(s||'relatorio').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'');}

  // rótulo do filtro: o botão tem ícone e a pílula de contagem — tira os dois.
  // (Não dá p/ raspar dígitos do texto: existe filtro chamado "NÍVEL 3".)
  function rotuloFiltro(w){
    const prev=w.previousElementSibling;
    if(prev && prev.classList.contains('filter-label')) return prev.textContent.trim();
    const b=w.querySelector('.ms-btn');
    if(!b) return '';
    const c=b.cloneNode(true); c.querySelectorAll('.ms-cnt,svg').forEach(e=>e.remove());
    return c.textContent.trim();
  }
  function filtrosResumo(){
    // só os filtros da barra do topo — o painel pode ter outros .ms-wrap no miolo
    // (a busca de cenários do Forecast, p.ex.), que não são recorte do relatório
    let wraps=[...document.querySelectorAll('.filtros .ms-wrap,.header-filters .ms-wrap')];
    if(!wraps.length) wraps=[...document.querySelectorAll('.ms-wrap')];
    wraps=wraps.filter(w=>rotuloFiltro(w));
    if(!wraps.length) return '';
    const parts=wraps.map(w=>{
      const sel=(w._sel && w._sel.size)?[...w._sel] : null;
      return '<b>'+esc(rotuloFiltro(w))+':</b> '+ (sel? esc(sel.join(', ')) : 'Todos');
    });
    return 'Filtros aplicados &nbsp; '+parts.join(' &nbsp;·&nbsp; ');
  }

  const espera=ms=>new Promise(r=>setTimeout(r,ms));

  // As bibliotecas (html2canvas + jsPDF) são carregadas AQUI, no clique —
  // não entram mais no <head> dos painéis bloqueando o primeiro render
  // (eram ~350KB de JS antes de qualquer pixel, em 39 páginas).
  const H2C_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const JSPDF_SRC='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
  function carregaLib(id,src,pronto){
    return new Promise((res,rej)=>{
      if(pronto()) return res();
      let s=document.getElementById(id);
      if(!s){ s=document.createElement('script'); s.id=id; s.src=src; document.head.appendChild(s); }
      s.addEventListener('load',()=>res());
      s.addEventListener('error',()=>rej(new Error(src)));
    });
  }
  function ensureLibs(){
    return Promise.all([
      carregaLib('h2c-cdn',H2C_SRC,()=>typeof html2canvas!=='undefined'),
      carregaLib('jspdf-cdn',JSPDF_SRC,()=>!!window.jspdf)
    ]);
  }

  async function exportar(mode){
    const mn=document.getElementById('pdfMenu'); if(mn)mn.classList.remove('open');
    try{ await ensureLibs(); }
    catch(e){ alert('Não foi possível carregar o componente de PDF. Verifique a conexão.'); return; }
    const claro = mode!=='dark';
    const btn=document.getElementById('pdfBtn');
    if(!getMain()){ alert('Não encontrei o conteúdo para exportar.'); return; }
    const setTheme=CFG.setTheme||window.applyTheme||window.aplicaTema;
    const temaOrig=temaClaro()?'light':'dark';
    const temaAlvo=claro?'light':'dark';
    if(temaOrig!==temaAlvo && typeof setTheme==='function') setTheme(temaAlvo);
    const vistas=resolveViews();
    const vwOrig=(vistas.length && typeof CFG.viewAtual==='function')?CFG.viewAtual():null;
    const temporarios=[];               // elementos criados só p/ o relatório
    const desfazer=[];                  // estados mexidos durante a captura
    // menu lateral RECOLHIDO no PDF (Renan, 16/08/2026)
    const side=vistas.length?document.querySelector('.side'):null;
    if(side && !side.classList.contains('mini')){ side.classList.add('mini'); desfazer.push(()=>side.classList.remove('mini')); }
    document.body.classList.add('exporting');
    if(btn){ btn.disabled=true; const s=btn.querySelector('span'); if(s)s.textContent='Gerando…'; }
    const ov=document.createElement('div'); ov.id='pdf-overlay';
    ov.innerHTML='<div class="pdf-ov-box"><div class="pdf-ov-spin"></div><span id="pdf-ov-txt">Gerando PDF…</span></div>';
    document.body.appendChild(ov);
    window.scrollTo(0,0);
    await espera(500);
    try{
      const { jsPDF }=window.jspdf;
      const PW=338.67, PH=190.5, m=9, uw=PW-2*m, uh=PH-2*m, gap=6;   // 16:9 widescreen (PowerPoint)
      // No layout padrão o slide é o painel inteiro: o fundo da página do PDF é o
      // MESMO tom uniforme da página do portal, então o slide fica igual à tela.
      const prep0=window.H2CPrep||null;
      const bg=(vistas.length && prep0) ? prep0.fundoDe(document.body) : (claro?'#FFFFFF':'#0C1017');
      const baseOpts={scale:2,backgroundColor:bg,useCORS:true,logging:false,ignoreElements:el=>el.id==='pdf-overlay'};
      const SKIP=/(^|\s)(topbar|toolbar|header|header-filters|filters|filtros|sidebar|side|no-pdf)(\s|$)/;
      const isTitle=e=>e.classList.contains('sec-title')||e.classList.contains('pdf-view-tit')||['H1','H2','H3','H4'].includes(e.tagName);
      // captura: tabelas na largura natural (sem cortar colunas); o resto ao vivo.
      // O preparo é o mesmo do PNG (assets/excel-export.js): grava cor/fundo já
      // computados nos nós, porque o html2canvas 1.4.1 não resolve var(--x) e
      // ABORTA em color(), que é como o Chromium computa nosso color-mix().
      const prep=prep0;
      // no layout de vidro as camadas translúcidas precisam ser ACHATADAS, senão
      // o card branco sobre fundo branco (tema claro) some no PNG do html2canvas
      const achatar=!!vistas.length;
      const cap=async(el,topo)=>{
        let o=baseOpts;
        if(isTableBlock(el) && !el.classList.contains('app')){ // tabela: largura natural, min 1560, teto 2800
          const t=el.querySelector('table')||el; const ww=Math.max(1560, Math.min(2800, (t.scrollWidth||1560)+60));
          o=Object.assign({},baseOpts,{windowWidth:ww});
        }
        const nodes=prep?prep.preparar(el,achatar):null;
        if(prep) o=Object.assign({},o,{onclone:prep.onclone});
        try{ const c=await html2canvas(el,o); return {canvas:c, nat:c.height*uw/c.width, head: !!topo}; }
        finally{ if(prep) prep.limpar(nodes); }
      };
      // monta os slides de UM container (uma visão, ou a página inteira nos painéis antigos)
      async function slidesDe(main, headEl, label){
        const kids=[...main.children].filter(e=>e.id!=='pdf-report-head' && !e.classList.contains('pdf-view-tit')
          && e.tagName!=='HEADER' && !SKIP.test(e.className) && !e.classList.contains('divider')
          && e.offsetHeight>2 && getComputedStyle(e).display!=='none');
        const topoEls=[];
        if(headEl) topoEls.push(headEl);
        if(label){ const t=document.createElement('div'); t.className='pdf-view-tit'; t.textContent=label;
          main.insertBefore(t, headEl?headEl.nextSibling:main.firstChild); temporarios.push(t); topoEls.push(t); }
        const tableGroups=[];
        for(const e of kids){
          if(isTableBlock(e)){
            const g=[];
            const last=topoEls[topoEls.length-1];
            if(last && last!==headEl && isTitle(last)) g.push(topoEls.pop()); // título junto da tabela
            g.push(e);
            tableGroups.push(g);
          } else topoEls.push(e);
        }
        // topo do slide (sem centralizar) só p/ o cabeçalho do relatório e o título da visão
        const noTopo=el=>el===headEl||el.classList.contains('pdf-view-tit');
        const topoItems=[]; for(const el of topoEls) topoItems.push(await cap(el, noTopo(el)));
        const tableSlides=[]; for(const g of tableGroups){ const its=[]; for(const el of g) its.push(await cap(el, noTopo(el))); tableSlides.push(its); }
        const out=[]; let grp=[], sum=0;
        for(const it of topoItems){ if(grp.length && (sum+gap+it.nat)>1.3*uh){ out.push(grp); grp=[]; sum=0; } if(grp.length) sum+=gap; sum+=it.nat; grp.push(it); }
        if(grp.length) out.push(grp);
        for(const ts of tableSlides) out.push(ts);
        return out;
      }
      // ── layout padrão do portal: UM SLIDE POR VISÃO ──────────────────────
      // A visão já é do tamanho da página, então o slide é o painel inteiro
      // (com o menu recolhido), como na tela. Só quando uma tabela não coube
      // é que entra uma página extra com ela inteira, p/ não perder linhas.
      async function slidesDasVisoes(){
        const app=document.querySelector('.app')||getMain();
        const out=[];
        out.push([await cap(montaCapa(), false)]);         // capa: título, filtros, data
        let i=0;
        for(const v of vistas){
          i++; const t=document.getElementById('pdf-ov-txt');
          if(t) t.textContent='Gerando PDF… '+(v.label||'')+' ('+i+'/'+vistas.length+')';
          if(typeof v.ativar==='function'){ v.ativar(); await espera(520); }
          out.push([await cap(app, false)]);
          for(const extra of await tabelasCortadas()) out.push(extra);
        }
        return out;
      }
      // tabela que rola por dentro → uma página extra com ela inteira
      async function tabelasCortadas(){
        const vw=document.querySelector('.vw.on'); if(!vw) return [];
        const wraps=[...vw.querySelectorAll('.twrap,.tab-wrap')].filter(w=>w.scrollHeight>w.clientHeight+4);
        const out=[];
        for(const w of wraps){
          const alvo=w.closest('.tsec,.card')||w;
          const mexidos=[[w,w.style.cssText],[alvo,alvo.style.cssText]];
          w.style.cssText+=';height:auto!important;max-height:none!important;overflow:visible!important;flex:none!important;';
          alvo.style.cssText+=';height:auto!important;max-height:none!important;overflow:visible!important;flex:none!important;';
          await espera(60);
          try{ out.push([await cap(alvo, false)]); }
          finally{ mexidos.forEach(([el,css])=>{ el.style.cssText=css; }); }
        }
        return out;
      }
      function montaCapa(){
        const capa=document.createElement('div'); capa.id='pdf-capa';
        const now=new Date();
        capa.innerHTML='<div class="cp-tit"></div><div class="cp-regua"></div><div class="cp-sub"></div>'+
          '<div class="cp-fil">'+filtrosResumo()+'</div>'+
          '<div class="cp-meta">Gerado em '+now.toLocaleDateString('pt-BR')+' '+
          now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'<br>Gestão em Movimento · BI Frota</div>';
        capa.querySelector('.cp-tit').textContent=resolveTitle();
        capa.querySelector('.cp-sub').textContent=resolveSub();
        document.body.appendChild(capa); temporarios.push(capa);
        return capa;
      }
      // cabeçalho do relatório (uma vez, no começo)
      const primeiroMain=vistas.length ? null : getMain();
      let slides=[];
      if(!vistas.length){
        const head=ensureHead(primeiroMain);
        const fr=document.getElementById('rh-filtros'); if(fr) fr.innerHTML=filtrosResumo();
        carimbaMeta();
        slides = await slidesDe(primeiroMain, head, null);
      } else {
        slides = await slidesDasVisoes();
      }
      if(!slides.length){ alert('Não encontrei o conteúdo para exportar.'); return; }
      // cada slide é composto num ÚNICO canvas (fundo + blocos + faixa) → 1 imagem por página,
      // sem emendas (o problema da "sombra" retangular vinha de mesclar JPEGs separados com o fundo).
      const COMP_W=2000, COMP_H=Math.round(COMP_W*PH/PW), ppm=COMP_W/PW;
      let pdf=null;
      for(const slide of slides){
        const natTotal=slide.reduce((a,im)=>a+im.nat,0)+gap*(slide.length-1);
        const sf=Math.min(1, uh/natTotal);
        const drawW=uw*sf, x=m+(uw-drawW)/2, g=gap*sf;
        const grpH=slide.reduce((a,im)=>a+im.nat*sf,0)+g*(slide.length-1);
        const hasHead=slide.some(im=>im.head);
        let y=hasHead?m:m+(uh-grpH)/2;   // slide do título: topo; demais: centralizado
        const cv=document.createElement('canvas'); cv.width=COMP_W; cv.height=COMP_H;
        const cx=cv.getContext('2d');
        cx.fillStyle=bg; cx.fillRect(0,0,COMP_W,COMP_H);
        for(const im of slide){ const h=im.nat*sf; cx.drawImage(im.canvas, x*ppm, y*ppm, drawW*ppm, h*ppm); y+=h+g; }
        cx.fillStyle='#F97316'; cx.fillRect(PW*0.55*ppm, 0, PW*0.45*ppm, 5*ppm);   // faixa laranja padrão
        if(!pdf) pdf=new jsPDF({unit:'mm',orientation:'landscape',format:[PW,PH]});
        else pdf.addPage([PW,PH],'landscape');
        pdf.addImage(cv.toDataURL('image/jpeg',0.92),'JPEG',0,0,PW,PH);
      }
      const fb=CFG.fileBase || slug(resolveTitle());
      pdf.save(fb+'_'+(claro?'claro':'escuro')+'_'+new Date().toISOString().slice(0,10)+'.pdf');
    }catch(e){ console.error(e); alert('Erro ao gerar PDF: '+(e&&e.message||e)); }
    finally{
      ov.remove();
      temporarios.forEach(t=>t.remove());
      desfazer.forEach(f=>{ try{ f(); }catch(e){} });
      const hd=document.getElementById('pdf-report-head'); if(hd) hd.remove();
      document.body.classList.remove('exporting');
      if(btn){ btn.disabled=false; const s=btn.querySelector('span'); if(s)s.textContent='PDF'; }
      if(temaOrig!==temaAlvo && typeof setTheme==='function') setTheme(temaOrig);
      if(vwOrig!=null && typeof CFG.irPara==='function') CFG.irPara(vwOrig);
    }
  }
  function carimbaMeta(){
    const now=new Date(), rm=document.getElementById('rh-meta');
    if(rm) rm.innerHTML='Gerado em '+now.toLocaleDateString('pt-BR')+' '+now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'<br>Gestão em Movimento · BI Frota';
  }
  window.exportarPDF = exportar;   // permite chamada externa
})();
