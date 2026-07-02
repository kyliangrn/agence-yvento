/* =====================================================================
   Yvento — Diagnostic de force commerciale (logique + rendu)
   S'auto-monte dans #yvento-diagnostic. Aucune dépendance.
   ⚙️  Toute la configuration se fait dans YV_CONFIG ci-dessous.
   La logique de scoring n'est PAS modifiée.
   ===================================================================== */
(function () {
  'use strict';

  /* ================= CONFIG ================= */
  const YV_CONFIG = {
    mountId: 'yvento-diagnostic',
    formspreeUrl: 'https://formspree.io/f/mdarekwg', // capture du lead (mêmes leads que la landing)
    calendlyUrl: 'https://calendly.com/yvento/30min', // prise de RDV (= CALENDLY_URL de la landing)
    accentHex: '#FF4329',   // doit rester aligné avec --yv-accent dans le CSS (utilisé par le radar)
    thresholds: {
      acquisition: 55,      // Acquisition si Ciblage < x OU Prospection < x
      growthMulticanal: 60, // Growth si Multicanal < x
    },
    potential: {
      floor: 85,            // toute catégorie remonte au moins à ce niveau avec l'accompagnement
      gain: 12,             // …et gagne au minimum ce nombre de points (plafonné à 100)
    },
  };

  /* ================= DONNÉES ================= */
  // 5 catégories × 3 questions. Chaque réponse = 0 à 10. Score catégorie = somme/30 → /100.
  const CATS = [
    {key:'cible', label:"Ciblage & données", short:"Ciblage", q:[
      {q:"Votre client idéal (qui cibler exactement) est…", o:[
        {t:"Ultra clair : secteur, taille, fonction décisionnaire",p:10},
        {t:"Défini dans les grandes lignes, à affiner",p:6},
        {t:"Une idée générale, assez large",p:3},
        {t:"Pas vraiment formalisé, on prend ce qui vient",p:0}]},
      {q:"Votre fichier de prospects, aujourd'hui…", o:[
        {t:"Base ciblée, à jour, coordonnées fiables (email pro, tél. direct)",p:10},
        {t:"Un fichier existant mais incomplet ou à rafraîchir",p:6},
        {t:"Quelques contacts dispersés",p:3},
        {t:"Pas de fichier exploitable",p:0}]},
      {q:"Vos prospects sont priorisés et segmentés…", o:[
        {t:"Oui, par potentiel et par segment",p:10},
        {t:"Un tri sommaire",p:5},
        {t:"Non, on traite dans l'ordre d'arrivée",p:2},
        {t:"On n'a pas assez de volume pour ça",p:0}]},
    ]},
    {key:'activite', label:"Activité de prospection", short:"Prospection", q:[
      {q:"Chaque semaine, vous contactez de nouveaux prospects…", o:[
        {t:"De façon régulière et structurée, en volume",p:10},
        {t:"Quelques-uns, quand le temps le permet",p:6},
        {t:"Rarement, par à-coups",p:3},
        {t:"Quasiment jamais, les clients viennent par le réseau",p:0}]},
      {q:"Votre prospection suit une méthode…", o:[
        {t:"Oui : séquences, scripts, cadence définie",p:10},
        {t:"Une trame, mais appliquée de façon variable",p:6},
        {t:"Plutôt à l'instinct",p:3},
        {t:"Aucune méthode formalisée",p:0}]},
      {q:"La prospection sortante dans votre quotidien, c'est…", o:[
        {t:"Un réflexe quotidien, intégré",p:10},
        {t:"Présent mais irrégulier",p:6},
        {t:"Une intention plus qu'une action",p:3},
        {t:"Inexistant aujourd'hui",p:0}]},
    ]},
    {key:'multicanal', label:"Couverture multicanale & outils", short:"Multicanal", q:[
      {q:"Pour toucher vos prospects, vous activez…", o:[
        {t:"Téléphone + email + LinkedIn coordonnés",p:10},
        {t:"Deux canaux",p:7},
        {t:"Un seul canal principal",p:4},
        {t:"Aucun canal sortant",p:0}]},
      {q:"Vos relances et votre suivi sont…", o:[
        {t:"Outillés et automatisés (CRM + séquences)",p:10},
        {t:"Suivis dans un CRM, manuellement",p:6},
        {t:"Dans un tableur ou de tête",p:3},
        {t:"Pas de suivi réel",p:0}]},
      {q:"Le canal le plus efficace pour atteindre vos décideurs…", o:[
        {t:"Le digital coordonné (téléphone, email, LinkedIn)",p:10,sig:'digital'},
        {t:"Surtout le téléphone",p:7,sig:'digital'},
        {t:"Surtout le terrain, le face-à-face",p:5,sig:'terrain'},
        {t:"On n'a pas trouvé de canal qui fonctionne",p:0,sig:'none'}]},
    ]},
    {key:'perf', label:"Performance & conversion", short:"Performance", q:[
      {q:"Votre taux de réponse en prospection…", o:[
        {t:"Bon et mesuré, on sait ce qui marche",p:10},
        {t:"Correct mais pas suivi précisément",p:6},
        {t:"Faible",p:3},
        {t:"Inconnu, on ne mesure pas",p:0}]},
      {q:"Transformer un contact en rendez-vous…", o:[
        {t:"On y arrive régulièrement",p:10},
        {t:"Variable selon les périodes",p:6},
        {t:"C'est difficile",p:3},
        {t:"On n'en est pas encore là",p:0}]},
      {q:"Vos rendez-vous commerciaux sont…", o:[
        {t:"Prévisibles : je sais combien j'en aurai ce mois-ci",p:10},
        {t:"Irréguliers",p:6},
        {t:"Rares, c'est le point bloquant",p:3},
        {t:"Inexistants",p:0}]},
    ]},
    {key:'orga', label:"Organisation & pilotage", short:"Organisation", q:[
      {q:"Le temps consacré à la prospection dans l'équipe…", o:[
        {t:"Une personne dédiée",p:10},
        {t:"Du temps partiel, entre deux missions",p:6},
        {t:"Très peu",p:3},
        {t:"Aucun, personne n'a le temps",p:0}]},
      {q:"Entre prospecter et closer, chez vous…", o:[
        {t:"Les rôles sont clairs et tenus",p:10},
        {t:"C'est la même personne, qui jongle",p:5},
        {t:"Le closing prend tout, la prospection passe après",p:3},
        {t:"Ni l'un ni l'autre n'est structuré",p:0}]},
      {q:"Vous pilotez votre commercial avec des KPIs…", o:[
        {t:"Oui, suivis régulièrement",p:10},
        {t:"Quelques indicateurs basiques",p:6},
        {t:"Au ressenti",p:3},
        {t:"Pas de pilotage",p:0}]},
    ]},
  ];

  const FLAT = [];
  CATS.forEach(c => c.q.forEach((q, i) => FLAT.push({catKey:c.key, catLabel:c.label, qi:i, q:q.q, o:q.o})));
  const N = FLAT.length;

  const LEVELS = [
    {min:80, name:"Machine bien rodée", adj:"très solide"},
    {min:55, name:"Solides fondations", adj:"prometteur"},
    {min:30, name:"Mécanique à enclencher", adj:"en construction"},
    {min:0,  name:"Tout est à construire", adj:"à structurer"},
  ];

  // copies par catégorie
  const STRONG = {
    cible:"Vous savez précisément qui viser : ICP clair et données exploitables.",
    activite:"Vous prospectez déjà activement, avec une vraie régularité.",
    multicanal:"Votre dispositif multicanal et vos outils sont en place.",
    perf:"Vos résultats sont au rendez-vous et suffisamment réguliers.",
    orga:"Votre organisation commerciale est structurée et pilotée.",
  };
  const IMPACT = {
    cible:"<b>Ciblage & données à structurer</b> : sans base fiable et à jour, chaque campagne part avec un handicap et touche les mauvaises personnes.",
    activite:"<b>Prospection trop irrégulière</b> : dès que l'opérationnel reprend le dessus, le pipeline se vide et les résultats deviennent imprévisibles.",
    multicanal:"<b>Couverture mono-canal</b> : vous passez à côté des décideurs qui ne répondent pas là où vous les sollicitez, et rien n'est automatisé.",
    perf:"<b>Performance non mesurée</b> : sans suivi des taux, impossible de prévoir le chiffre ni de savoir quoi corriger.",
    orga:"<b>Organisation à caler</b> : sans temps ni rôles dédiés, la prospection reste la première variable sacrifiée.",
  };
  const EXCEL = {
    cible:"<b>Ciblage</b> : déjà solide, un cran de précision en plus ouvre de nouveaux segments.",
    activite:"<b>Prospection</b> : déjà active, plus de cadence se traduit directement en RDV.",
    multicanal:"<b>Multicanal</b> : déjà en place, une coordination plus fine décuple le taux de réponse.",
    perf:"<b>Performance</b> : déjà bonne, mieux mesurée elle devient prévisible au RDV près.",
    orga:"<b>Organisation</b> : déjà structurée, un pilotage plus serré sécurise la croissance.",
  };
  const KPI_NOTE = {
    cible:"Base, ICP et segmentation",
    activite:"Volume, régularité, méthode",
    multicanal:"Canaux coordonnés et automatisation",
    perf:"Taux de réponse, RDV, prévisibilité",
    orga:"Temps, rôles, pilotage KPIs",
  };

  const OFFERS = {
    acquisition:{cls:"yv-acq", kicker:"Bundle Acquisition", name:"Construire un pipeline de zéro",
      sub:"On met votre moteur commercial en route.",
      comble:"Fait remonter <b>Ciblage & données</b> et <b>Activité de prospection</b>.",
      tags:["Téléphone"],
      items:["Fichier prospects qualifié sur votre ICP (poste, email, tél. direct)","Prospection téléphonique avec script validé ensemble","Suivi en temps réel : KPIs, taux de contact, RDV obtenus, feedback terrain"],
      note:"Vous avez déjà votre base ? On l'active directement."},
    growth:{cls:"yv-grw", kicker:"Bundle Growth", name:"Activer l'outbound multicanal",
      sub:"On change d'échelle sur vos meilleures cibles.",
      comble:"Fait remonter <b>Couverture multicanale</b> et <b>Performance</b>.",
      tags:["Téléphone","Email","LinkedIn"],
      items:["Fichier prospects qualifié sur votre ICP (poste, email, tél. direct)","Téléphone + email + LinkedIn coordonnés sur les mêmes cibles","Suivi en temps réel : KPIs par canal, taux de réponse, RDV obtenus"],
      note:null},
    terrain:{cls:"yv-ter", kicker:"Bundle Terrain", name:"Gagner les marchés de terrain",
      sub:"Vos décideurs se gagnent en face-à-face.",
      comble:"Couvre votre <b>accès terrain</b> et muscle la <b>Performance</b>.",
      tags:["Terrain","Occitanie"],
      items:["Fichier prospects qualifié par zone (adresses, décideurs, tournées optimisées)","Qualification sur place : besoin, décideur, timing","CRM mis à jour en temps réel + reporting de transformation"],
      note:null},
  };

  /* ================= ÉTAT ================= */
  let step = -1;
  const answers = {};
  const lead = {};
  let root, pad, pbar;

  /* ================= CALCULS ================= */
  function progress(){ let pct = step<0?0 : step<N ? step/(N+1)*100 : step===N ? N/(N+1)*100 : 100; pbar.style.width = pct+'%'; }
  function catScore(key){ const c = CATS.find(x=>x.key===key); let raw=0; c.q.forEach((q,i)=>{ const a=answers[key+'_'+i]; if(a!=null) raw+=q.o[a].p; }); return Math.round(raw/30*100); }
  function allScores(){ const o={}; CATS.forEach(c=>o[c.key]=catScore(c.key)); return o; }
  function glob(s){ const v=Object.values(s); return Math.round(v.reduce((a,b)=>a+b,0)/v.length); }
  function level(t){ return LEVELS.find(l=>t>=l.min); }
  function terrainSignal(){ const a=answers['multicanal_2']; return a!=null && CATS[2].q[2].o[a].sig==='terrain'; }

  function recommend(s){
    const r=[], T=YV_CONFIG.thresholds;
    if(s.cible<T.acquisition || s.activite<T.acquisition) r.push('acquisition');
    if(s.multicanal<T.growthMulticanal) r.push('growth');
    if(terrainSignal()) r.push('terrain');
    if(!r.length) r.push('growth');
    return ['acquisition','growth','terrain'].filter(k=>r.includes(k));
  }

  // potentiel : chaque catégorie remonte à min(100, max(score+gain, floor)) → hausse garantie, même profil haut.
  function potential(s){
    const P=YV_CONFIG.potential;
    const proj={};
    CATS.forEach(c=>{ proj[c.key]=Math.min(100, Math.max(s[c.key]+P.gain, P.floor)); });
    return Math.round(Object.values(proj).reduce((a,b)=>a+b,0)/5);
  }

  /* ================= RENDU ================= */
  function render(){
    progress(); pad.classList.remove('yv-fade'); void pad.offsetWidth; pad.classList.add('yv-fade');
    root.classList.toggle('yv-diag--wide', step===-1); // carte élargie (format Méthode) seulement à l'écran de lancement
    if(step===-1) return intro();
    if(step<N)   return question();
    if(step===N) return gate();
    return result();
  }

  function intro(){
    pad.innerHTML = `<div class="yv-intro yv-intro--feature">
      <div class="yv-intro-body">
        <h1>Par quel levier <span class="yv-hl">commencer ?</span></h1>
        <p>15 questions, 4 minutes. On situe votre force commerciale sur 5 dimensions et on vous dit précisément lequel de ces leviers activer en premier, avec votre score détaillé.</p>
        <button class="yv-btn yv-btn-accent yv-btn--sm" data-act="start">Lancer mon diagnostic →</button>
      </div>
      <div class="yv-intro-art" aria-hidden="true">
        <div class="yv-minigauge">
          <svg viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="64" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="10"/>
            <circle class="yv-mg-arc" cx="80" cy="80" r="64" fill="none" stroke="url(#yvgm)" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="402" stroke-dashoffset="108" transform="rotate(-90 80 80)"/>
            <defs><linearGradient id="yvgm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8A6E"/><stop offset="1" stop-color="${YV_CONFIG.accentHex}"/></linearGradient></defs>
          </svg>
          <div class="yv-mg-ctr"><div class="yv-mg-n">?</div><div class="yv-mg-l">Indice / 100</div></div>
        </div>
      </div>
    </div>`;
    pad.querySelector('[data-act=start]').onclick = ()=>{ step=0; render(); scrollTop(); };
    // Animation de la jauge : déclenchée au scroll (une fois quand visible), rejouée à chaque réapparition.
    const gauge = pad.querySelector('.yv-minigauge'), arc = pad.querySelector('.yv-mg-arc');
    if(gauge && arc && !matchMedia('(prefers-reduced-motion:reduce)').matches){
      const io = new IntersectionObserver(es=>es.forEach(e=>{
        if(e.isIntersecting){ arc.classList.remove('yv-anim'); void arc.getBoundingClientRect(); arc.classList.add('yv-anim'); }
        else { arc.classList.remove('yv-anim'); }
      }), {threshold:0.45});
      io.observe(gauge);
    }
  }

  function question(){
    const it=FLAT[step], key=it.catKey+'_'+it.qi;
    pad.innerHTML = `<div class="yv-q">
      <div class="yv-eyebrow">${it.catLabel}<span class="yv-step">${step+1} / ${N}</span></div>
      <h2>${it.q}</h2>
      <div class="yv-opts">${it.o.map((o,j)=>`<div class="yv-opt" data-j="${j}"><span class="yv-tick"></span><span>${o.t}</span></div>`).join('')}</div>
      ${step>0?`<div class="yv-nav"><button class="yv-back" data-act="back">← Précédent</button></div>`:''}
    </div>`;
    pad.querySelectorAll('.yv-opt').forEach(el=>{
      if(answers[key]==+el.dataset.j) el.classList.add('yv-sel');
      el.onclick=()=>{ answers[key]=+el.dataset.j;
        pad.querySelectorAll('.yv-opt').forEach(o=>o.classList.remove('yv-sel'));
        el.classList.add('yv-sel');
        setTimeout(()=>{ step=step<N-1?step+1:N; render(); },180);
      };
    });
    const b=pad.querySelector('[data-act=back]'); if(b) b.onclick=()=>{ step--; render(); };
  }

  function gate(){
    const g=glob(allScores());
    pad.innerHTML = `<div class="yv-gate">
      <div class="yv-eyebrow">Dernière étape</div>
      <h2>Votre diagnostic est prêt.</h2>
      <p class="yv-lede">Laissez vos coordonnées pour accéder à votre bilan : score, axes de progression et recommandation.</p>
      <div class="yv-teaser"><div class="yv-big">${g}</div><div class="yv-lab">Votre indice, votre profil détaillé sur 5 catégories et votre plan d'action vous attendent juste derrière.</div></div>
      <div class="yv-grid2">
        <div class="yv-field"><label>Prénom &amp; nom</label><input data-f="name" placeholder="Jean Dupont"></div>
        <div class="yv-field"><label>Société</label><input data-f="company" placeholder="Votre entreprise"></div>
      </div>
      <div class="yv-grid2">
        <div class="yv-field"><label>Email professionnel</label><input data-f="email" type="email" placeholder="jean@entreprise.fr"></div>
        <div class="yv-field"><label>Téléphone</label><input data-f="tel" type="tel" placeholder="06 12 34 56 78"></div>
      </div>
      <label class="yv-consent"><input type="checkbox" data-f="rgpd"> J'accepte d'être recontacté par Yvento au sujet de mon diagnostic. Mes données ne sont pas cédées à des tiers.</label>
      <button class="yv-btn yv-btn-accent" data-act="reveal" disabled>Voir mon bilan complet →</button>
      <div class="yv-nav"><button class="yv-back" data-act="back">← Précédent</button></div>
    </div>`;
    const mail=pad.querySelector('[data-f=email]'), rgpd=pad.querySelector('[data-f=rgpd]'), rev=pad.querySelector('[data-act=reveal]');
    const val=()=>rev.disabled=!(/.+@.+\..+/.test(mail.value)&&rgpd.checked);
    mail.addEventListener('input',val); rgpd.addEventListener('change',val);
    rev.onclick=()=>{
      lead.name=pad.querySelector('[data-f=name]').value;
      lead.company=pad.querySelector('[data-f=company]').value;
      lead.email=mail.value; lead.tel=pad.querySelector('[data-f=tel]').value;
      sendLead();
      step=N+1; render(); scrollTop();
    };
    pad.querySelector('[data-act=back]').onclick=()=>{ step=N-1; render(); };
  }

  // envoi du lead vers Formspree (même collecte que le formulaire de la landing)
  function sendLead(){
    if(!YV_CONFIG.formspreeUrl) return;
    const s=allScores();
    const payload={
      date:new Date().toISOString(),
      nom:lead.name, societe:lead.company, email:lead.email, telephone:lead.tel,
      indice:glob(s), niveau:level(glob(s)).name, potentiel:potential(s),
      score_ciblage:s.cible, score_prospection:s.activite, score_multicanal:s.multicanal,
      score_performance:s.perf, score_organisation:s.orga,
      offres:recommend(s).join(', '),
      source:'Diagnostic Yvento',
      _subject:'Nouveau diagnostic — '+(lead.name||lead.company||lead.email||''),
    };
    try{
      fetch(YV_CONFIG.formspreeUrl,{method:'POST',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify(payload)});
    }catch(e){ /* silencieux */ }
  }

  function openCalendly(){
    // priorité : popup Calendly de la landing (même expérience que les autres CTA), pré-rempli
    if(typeof window.yvBook==='function'){ window.yvBook(lead); return; }
    const u=YV_CONFIG.calendlyUrl;
    if(!u){ console.warn('[Yvento] calendlyUrl non configuré'); return; }
    try{
      const url=new URL(u);
      if(lead.name) url.searchParams.set('name', lead.name);
      if(lead.email) url.searchParams.set('email', lead.email);
      window.open(url.toString(),'_blank');
    }catch(e){ window.open(u,'_blank'); }
  }

  // recentre la carte dans le viewport entre les étapes (parcours long intégré dans la page)
  function scrollTop(){
    if(!root) return;
    const top=root.getBoundingClientRect().top+window.pageYOffset-90;
    if(window.pageYOffset>top+40) window.scrollTo({top, behavior:'smooth'});
  }

  function fillColor(v){ return v>66?'var(--yv-green)':v>=40?'var(--yv-amber)':'var(--yv-accent)'; }
  function tagWord(v){ return v>66?{t:"Point fort",c:'var(--yv-green)'}:v>=40?{t:"À renforcer",c:'var(--yv-amber)'}:{t:"À activer",c:'var(--yv-accent)'}; }

  // construit l'argumentaire forces / axes de progression
  function buildArgument(s,g,lv,pot){
    const entries=CATS.map(c=>({key:c.key,label:c.label,val:s[c.key]}));
    const desc=[...entries].sort((a,b)=>b.val-a.val);
    let strengths=entries.filter(e=>e.val>=67).sort((a,b)=>b.val-a.val).slice(0,2);
    let improves=entries.filter(e=>e.val<60).sort((a,b)=>a.val-b.val).slice(0,2);
    let mode='fix';
    if(!improves.length){ improves=[desc[desc.length-1]]; mode='excel'; }

    let strengthsHTML;
    if(!strengths.length || strengths[0].val<40){
      strengthsHTML=`<p class="yv-arg-empty">Votre socle commercial est encore à bâtir. C'est exigeant, mais c'est aussi le profil sur lequel un accompagnement structuré produit les gains les plus rapides et les plus visibles.</p>`;
    } else {
      strengthsHTML=`<ul class="yv-arg-list">${strengths.map(e=>`<li class="good"><span class="ic">✓</span><span>${STRONG[e.key]}</span></li>`).join('')}</ul>`;
    }
    const improvesHTML=`<ul class="yv-arg-list">${improves.map(e=>`<li class="warn"><span class="ic">↗</span><span>${(mode==='excel'?EXCEL:IMPACT)[e.key]}</span></li>`).join('')}</ul>`;

    return `<div class="yv-arg">
      <p class="yv-arg-intro">Avec un indice de <b>${g}/100</b>, votre profil commercial est <b>${lv.adj}</b>.</p>
      <div class="yv-arg-block"><div class="yv-arg-h good">Ce qui est déjà solide</div>${strengthsHTML}</div>
      <div class="yv-arg-block"><div class="yv-arg-h warn">${mode==='excel'?'Pour passer de bon à excellent':'Ce qui vous freine aujourd\'hui'}</div>${improvesHTML}</div>
    </div>`;
  }

  function result(){
    const s=allScores(), g=glob(s), lv=level(g), recos=recommend(s), pot=potential(s);
    const entries=CATS.map(c=>({key:c.key,label:c.label,val:s[c.key]}));
    const first=lead.name?lead.name.split(' ')[0]+', ':'';
    const R=82, C=2*Math.PI*R;

    pad.innerHTML = `<div class="yv-result">
      <div class="yv-eyebrow yv-center">${first}voici votre diagnostic</div>
      <div class="yv-gauge">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="${R}" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="12"/>
          <circle id="yv-arc" cx="100" cy="100" r="${R}" fill="none" stroke="url(#yvgg)" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 100 100)"/>
          <defs><linearGradient id="yvgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8A6E"/><stop offset="1" stop-color="${YV_CONFIG.accentHex}"/></linearGradient></defs>
        </svg>
        <div class="yv-gnum"><div class="s yv-num" id="yv-snum">0</div><div class="o">INDICE / 100</div></div>
      </div>
      <div class="yv-level">${lv.name}</div>

      <div class="yv-bt">Votre bilan</div>
      ${buildArgument(s,g,lv,pot)}

      <div class="yv-bt">Le détail par catégorie</div>
      ${entries.map(e=>{ const tg=tagWord(e.val); return `
        <div class="yv-kpi" data-v="${e.val}">
          <div class="top"><span class="lab">${e.label}</span>
            <span class="right"><span class="val yv-num">${e.val}<span style="color:var(--yv-faint);font-size:12px"> /100</span></span><span class="tag" style="color:${tg.c}">${tg.t}</span></span></div>
          <div class="track"><div class="fill" style="background:${fillColor(e.val)}"></div></div>
          <div class="note">${KPI_NOTE[e.key]}</div>
        </div>`; }).join('')}

      <div class="yv-bt">Comment on remonte votre score</div>
      ${recos.length>1?`<div class="yv-parcours"><b>Parcours recommandé.</b> Vos besoins se cumulent : on pose d'abord le socle, puis on active la montée en puissance. ${recos.length} leviers ci-dessous.</div>`:''}
      ${recos.map((k,i)=>{ const o=OFFERS[k]; return `
        <div class="yv-offer ${o.cls}">
          <div class="head">${recos.length>1?`<span class="step">${i+1}</span>`:''}<span class="kicker">${o.kicker}</span></div>
          <h3>${o.name}</h3>
          <p class="sub">${o.sub}</p>
          <div class="comble">${o.comble}</div>
          <ul>${o.items.map(it=>`<li><span class="c">✓</span>${it}</li>`).join('')}</ul>
          ${o.note?`<div class="note">${o.note}</div>`:''}
          <div class="tags">${o.tags.map(t=>`<span>${t}</span>`).join('')}</div>
        </div>`; }).join('')}

      <div class="yv-pricing">Ce diagnostic sera approfondi et chiffré lors de votre bilan offert.</div>
      <button class="yv-btn yv-btn-accent" data-act="cta">Réserver mon bilan offert →</button>
      <div class="yv-micro">Bilan offert <span class="yv-sep">·</span> Sans engagement <span class="yv-sep">·</span> Réponse sous 24 h</div>
    </div>`;

    // animations
    const arc=pad.querySelector('#yv-arc'), snum=pad.querySelector('#yv-snum');
    requestAnimationFrame(()=>{ arc.style.transition='stroke-dashoffset 1.15s cubic-bezier(.3,1,.4,1)'; arc.style.strokeDashoffset=C*(1-g/100); });
    const t0=performance.now();
    (function tick(now){ const k=Math.min(1,(now-t0)/1150); snum.textContent=Math.round(g*(1-Math.pow(1-k,3))); if(k<1) requestAnimationFrame(tick); })(t0);
    pad.querySelectorAll('.yv-kpi').forEach((el,i)=>{ const v=+el.dataset.v; setTimeout(()=>{ el.querySelector('.fill').style.width=v+'%'; }, 250+i*110); });
    pad.querySelector('[data-act=cta]').onclick=openCalendly;
  }

  /* ================= MONTAGE ================= */
  function mount(){
    const host=document.getElementById(YV_CONFIG.mountId);
    if(!host){ console.warn('[Yvento] mount #'+YV_CONFIG.mountId+' introuvable'); return; }
    host.innerHTML = `<div class="yv-diag">
      <div class="yv-brand">Yvento<span class="p">.</span></div>
      <div class="yv-card"><div class="yv-pbar"><i></i></div><div class="yv-pad"></div></div>
    </div>`;
    root = host.querySelector('.yv-diag');
    pad  = root.querySelector('.yv-pad');
    pbar = root.querySelector('.yv-pbar > i');
    render();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
