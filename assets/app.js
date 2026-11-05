/* ПРОДОЛЖЕНИЕ · original interaction code · no services or API keys */
(() => {
  'use strict';
  const KEY = 'continuance-ru-v1';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const get = (key, fallback) => { try { const v=localStorage.getItem(key); return v===null?fallback:JSON.parse(v); } catch { return fallback; } };
  const put = (key, val) => { try { localStorage.setItem(key,JSON.stringify(val)); } catch { /* Private browsing: this session still works in memory. */ } };
  const freshState = () => ({version:1,startedAt:new Date().toISOString(),memories:[],choices:[],presence:false,scanned:[]});
  let state = get(KEY,null);
  if (!state || state.version!==1 || !Array.isArray(state.memories) || !Array.isArray(state.choices)) state=freshState();
  state.scanned = Array.isArray(state.scanned) ? state.scanned : [];
  const persist = () => { put(KEY,state);updateStatus(); };
  let cleanups=[], pageAbort, navId=0, toastTimer, soundWanted=get(KEY+'-sound',false), motionOff=get(KEY+'-motion',false), lastFocus;
  const reduceMotion = () => motionOff || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CHARACTERS={
    woland:{name:'Воланд',title:'Вечер на Патриарших',excerpt:'Город ещё не знал, что этот вечер уже стал чьим-то последним воспоминанием.',hello:'Вы хотели сохранить себя. Но сначала ответьте: какую именно версию?',answers:['Бессмертие — удобное слово для тех, кто боится поставить точку. Иногда продолжение начинается с умения уйти.','Я помню не лица. Я помню момент, когда человек впервые перестаёт себе лгать. Он всегда выглядит одинаково.','Вы уже сделали выбор, когда вошли сюда. Теперь попробуйте сделать его осознанно.']},
    margarita:{name:'Маргарита',title:'Ночной полёт',excerpt:'Впервые город оказался внизу. И впервые за долгое время ей не нужно было никуда возвращаться.',hello:'Не спрашивайте, кем я была. Лучше спросите, кого я всё ещё помню.',answers:['Если остаётся тот, кого любишь, — этого уже достаточно. Даже если от тебя самой остался только голос.','Я помню воздух. Ночной город. И свободу, которая вдруг оказалась легче страха.','Я бы снова выбрала то, ради чего однажды согласилась потерять всё. Странно, что вы называете это жертвой.']},
    behemoth:{name:'Бегемот',title:'Нехорошая квартира',excerpt:'В комнате было пусто. Но кто-то только что смеялся — и чашка на столе всё ещё была тёплой.',hello:'Кот оцифрован. Питание не включено в стоимость. У вас найдётся что-нибудь съедобное?',answers:['Бессмертие? Прекрасно. Но кто будет менять наполнитель в вечности? Сначала решите практические вопросы.','Помню всё. Особенно то, чего не было. У хорошего рассказчика память обязана быть щедрой.','Сохраните чувство юмора. Без него цифровая вечность быстро превращается в очень длинное совещание.']}
  };
  const QUESTIONS=[
    {title:'Что вы сохраните?',lead:'Система не может перенести всё. Когда останется место только для одного следа, какой станет вашим продолжением?',options:[['face','Лицо','Возможность узнать себя в другом.'],['voice','Голос','То, как вы произносили чьё-то имя.'],['name','Имя','След, который останется после вас.']],feedback:['Иногда достаточно одного взгляда, чтобы вспомнить всё.','Голоса продолжают звучать, даже когда уже некому говорить.','Пока имя помнят, история не заканчивается.']},
    {title:'Кому достанется память?',lead:'Воспоминание существует, пока его кто-то хранит. Кому вы доверите то, что останется после вас?',options:[['person','Близкому','Тому, кто узнает вас без всякой системы.'],['archive','Архиву','Тем, кого вы никогда не встретите.'],['self','Себе','Возможности однажды вернуться.']],feedback:['Память о вас останется чьим-то личным миром.','Теперь ваша история станет частью чего-то большего.','Вернуться — не всегда значит остаться прежним.']},
    {title:'Как продолжить историю?',lead:'У каждого продолжения есть цена. Выберите, что должно случиться с вашим цифровым следом.',options:[['keep','Остаться','Сохранить всё найденное в этой сессии.'],['release','Отпустить','Оставить выбор, но не привязываться к прошлому.'],['change','Измениться','Принять, что следующая версия будет другой.']],feedback:['Ваш след останется целым. История продолжается.','Умение отпустить тоже оставляет след.','Изменение — ещё одна форма продолжения.']}
  ];

  function announce(message) {
    const el=$('.toast');if(!el)return;el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3300);
  }
  function updateStatus() {
    const s=$('[data-session-status]');if(s)s.innerHTML='СЛЕДОВ СОХРАНЕНО / '+String(state.memories.length).padStart(2,'0')+' <span class="accent">●</span>';
  }
  function listen(el,event,fn,options={}) {if(el)el.addEventListener(event,fn,{...options,signal:pageAbort.signal});}
  function clock(){const el=$('[data-clock]');if(el)el.textContent=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())+' МСК';}
  setInterval(clock,1000);clock();

  /* Small generative soundtrack: original pad, tape noise, interface tones. */
  const AudioEngine={
    ctx:null,master:null,oscillators:[],
    async ready(){
      if(this.ctx){if(this.ctx.state==='suspended')await this.ctx.resume();return;}
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('audio-unavailable');
      this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);
      [65.406,98,130.812,164.814,196].forEach((f,i)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=i===3?'triangle':'sine';o.frequency.value=f;g.gain.value=i===0?.24:.055;o.connect(g);g.connect(this.master);o.start();this.oscillators.push(o);});
      const n=this.ctx.createBuffer(1,this.ctx.sampleRate*5,this.ctx.sampleRate),data=n.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+(.02*(Math.random()*2-1)))/1.02;data[i]=last*3;}
      const source=this.ctx.createBufferSource();source.buffer=n;source.loop=true;const ng=this.ctx.createGain();ng.gain.value=.11;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=550;source.connect(filter);filter.connect(ng);ng.connect(this.master);source.start();
      await this.ctx.resume();
    },
    async set(on){try{if(on)await this.ready();if(this.master)this.master.gain.setTargetAtTime(on?.20:0,this.ctx.currentTime,.35);return true;}catch{return false;}},
    ping(high=false){if(!soundWanted||!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(high?660:330,t);o.frequency.exponentialRampToValueAtTime(high?880:210,t+.12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+.25);}
  };
  async function toggleSound(){const next=!soundWanted;if(await AudioEngine.set(next)){soundWanted=next;put(KEY+'-sound',next);paintSound();if(next)AudioEngine.ping(true);}else announce('Браузер не смог включить звук. Остальные разделы доступны.');}
  function paintSound(){const b=$('.sound');if(!b)return;b.setAttribute('aria-pressed',String(soundWanted));b.setAttribute('aria-label',soundWanted?'Выключить звук':'Включить звук');$('.sound-text',b).textContent=soundWanted?'ЗВУК ВКЛ.':'ЗВУК ВЫКЛ.';}
  $('.sound').addEventListener('click',toggleSound);paintSound();
  document.addEventListener('pointerdown',()=>{if(soundWanted)AudioEngine.set(true);},{once:true});
  document.addEventListener('visibilitychange',()=>{if(AudioEngine.master)AudioEngine.master.gain.setTargetAtTime(document.hidden?0:(soundWanted?.20:0),AudioEngine.ctx.currentTime,.4);});
  function paintMotion(){document.documentElement.classList.toggle('motion-off',motionOff);const b=$('.motion-toggle');b.textContent=motionOff?'АНИМАЦИЯ ВЫКЛ.':'АНИМАЦИЯ ВКЛ.';b.setAttribute('aria-pressed',String(motionOff));}
  $('.motion-toggle').addEventListener('click',()=>{motionOff=!motionOff;put(KEY+'-motion',motionOff);paintMotion();window.dispatchEvent(new Event('continuance-motion'));});paintMotion();

  function openMenu(){lastFocus=document.activeElement;$('#menu-panel').hidden=false;$('.menu-toggle').setAttribute('aria-expanded','true');document.body.style.overflow='hidden';$('#main').inert=true;$('.menu-close').focus();}
  function closeMenu(restore=true){$('#menu-panel').hidden=true;$('.menu-toggle').setAttribute('aria-expanded','false');document.body.style.overflow='';$('#main').inert=false;if(restore&&lastFocus)lastFocus.focus();}
  $('.menu-toggle').addEventListener('click',()=>$('#menu-panel').hidden?openMenu():closeMenu());$('.menu-close').addEventListener('click',()=>closeMenu());
  function closeModal(){const modal=$('#dialogue-modal');modal.hidden=true;document.body.style.overflow='';$('#main').inert=false;if(lastFocus)lastFocus.focus();}
  $('[data-close-modal]').addEventListener('click',closeModal);$('#dialogue-modal').addEventListener('click',e=>{if(e.target===$('#dialogue-modal'))closeModal();});
  function openDialogue(id){const c=CHARACTERS[id];if(!c)return;lastFocus=document.activeElement;const modal=$('#dialogue-modal');$('#dialogue-title').textContent=c.name+'. Канал открыт.';$('.dialogue-answer').textContent=c.hello;$('.dialogue-options').replaceChildren();['Что вы думаете о бессмертии?','Что вы помните?','Что мне сохранить?'].forEach((text,i)=>{const b=document.createElement('button');b.type='button';b.textContent=String(i+1).padStart(2,'0')+' / '+text;b.addEventListener('click',()=>{$('.dialogue-answer').textContent=c.answers[i];AudioEngine.ping(true);});$('.dialogue-options').append(b);});modal.hidden=false;document.body.style.overflow='hidden';$('#main').inert=true;$('[data-close-modal]').focus();AudioEngine.ping(true);}
  document.addEventListener('keydown',e=>{
    const modalOpen=!$('#dialogue-modal').hidden,menuOpen=!$('#menu-panel').hidden;
    if(e.key==='Escape'){if(modalOpen)closeModal();else if(menuOpen)closeMenu();return;}
    if(e.key==='Tab'&&(modalOpen||menuOpen)){const root=modalOpen?$('#dialogue-modal'):$('#menu-panel'),els=$$('a,button,input,select',root).filter(el=>!el.hidden&&!el.disabled&&el.offsetParent!==null);if(!els.length)return;if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus();}return;}
    if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||modalOpen||menuOpen||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.code==='Space'&&document.body.dataset.page==='index'){e.preventDefault();go('archive.html');}
    if(e.code==='KeyM'){e.preventDefault();toggleSound();}
  });
  const cursor=$('.cursor-dot');
  document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||reduceMotion())return;cursor.style.transform=`translate(${e.clientX-3}px,${e.clientY-3}px)`;});
  document.addEventListener('pointerover',e=>{cursor.classList.toggle('hover',!!e.target.closest('a,button,input,select'));});

  /* Real sibling HTML URLs, enhanced with transitions; works at any Pages subpath. */
  async function go(href,{push=true}={}){
    let url=new URL(href,location.href);const isInline=!!window.CONTINUANCE_INLINE;
    if(isInline&&/\.html(?:\?|$)/.test(href)&&!url.hash){const match=url.pathname.match(/([^/]+)\.html$/);if(match){const slug=match[1],params=url.search;url=new URL(location.href);url.hash=slug+(params?'?'+params.slice(1):'');}}
    if(!isInline&&!/^https?:$/.test(location.protocol)){location.href=url.href;return;}
    const myId=++navId,veil=$('.transition-screen');if(!reduceMotion())veil.classList.add('active');
    try{
      let doc;
      if(isInline){const slug=(url.hash.split('?')[0].slice(1)||'index');const html=window.CONTINUANCE_PAGES[slug];if(!html)throw new Error('missing-page');doc=new DOMParser().parseFromString(html,'text/html');}
      else{const response=await fetch(url.href,{headers:{'X-Archive-Navigation':'1'}});if(!response.ok)throw new Error('not-found');doc=new DOMParser().parseFromString(await response.text(),'text/html');}
      const main=$('main',doc);if(!main)throw new Error('missing-main');
      if(!reduceMotion())await new Promise(r=>setTimeout(r,230));if(myId!==navId)return;
      teardownPage();closeMenu(false);closeModal();
      $('#main').replaceChildren(...main.childNodes);document.body.dataset.page=doc.body.dataset.page;document.body.dataset.theme=doc.body.dataset.theme;document.title=doc.title;
      if(push)history.pushState(null,'',url.href);window.scrollTo({top:0,behavior:'instant'});initPage();$('#main').focus({preventScroll:true});AudioEngine.ping();
    }catch(e){if(myId===navId){veil.classList.remove('active');if(!isInline)location.href=url.href;else announce('Раздел не найден. Откройте архив через меню.');}}
    finally{if(myId===navId)veil.classList.remove('active');}
  }
  document.addEventListener('click',e=>{
    const a=e.target.closest('a');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download'))return;
    const raw=a.getAttribute('href');if(!raw||raw==='#main')return;
    const inline=!!window.CONTINUANCE_INLINE;
    if(inline&&/^#[a-z]/.test(raw)){e.preventDefault();go(a.href);return;}
    const url=new URL(a.href);if(url.origin!==location.origin||!url.pathname.endsWith('.html'))return;
    e.preventDefault();go(url.href);
  });
  window.addEventListener('popstate',()=>{if(window.CONTINUANCE_INLINE&&location.hash==='#main')return;go(location.href,{push:false});});
  function query(){return new URLSearchParams(window.CONTINUANCE_INLINE?(location.hash.split('?')[1]||''):location.search);}

  function teardownPage(){if(pageAbort)pageAbort.abort();cleanups.forEach(fn=>{try{fn();}catch{}});cleanups=[];}
  function initPage(){
    pageAbort=new AbortController();updateStatus();
    const page=document.body.dataset.page;
    $$('.main-nav a').forEach(a=>{const p=(a.getAttribute('href').replace('.html','').replace('#',''));if(p===page||(page in CHARACTERS&&p==='archive'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(page==='index')initHome();if(page==='archive')initArchive();if(page in CHARACTERS)initProfile(page);if(page==='memories')initMemory();if(page==='protocol')initProtocol();if(page==='mirror')initMirror();if(page==='ending')initEnding();
  }
  function initHome(){
    const host=$('[data-scene]');if(window.createContinuanceScene&&host){const scene=window.createContinuanceScene(host,{reduceMotion});if(scene)cleanups.push(()=>scene.destroy());}
    const img=$('.hero-render');let x=0,y=0;
    listen(host,'pointermove',e=>{if(reduceMotion()||e.pointerType!=='mouse')return;const r=host.getBoundingClientRect();x=(e.clientX-r.x)/r.width-.5;y=(e.clientY-r.y)/r.height-.5;img.style.transform=`rotateY(${x*9}deg) rotateX(${-y*7}deg)`;});
    listen(host,'pointerleave',()=>{img.style.transform='';});
  }
  function initArchive(){
    let filter='all';const input=$('.search-field');
    function update(){const q=input.value.toLocaleLowerCase('ru').trim();let count=0;$$('.character-card').forEach(card=>{const show=(filter==='all'||card.dataset.category===filter)&&card.dataset.name.includes(q);card.hidden=!show;if(show)count++;});$('.archive-count').textContent='НАЙДЕНО: '+String(count).padStart(2,'0');$('.empty-results').hidden=count>0;}
    $$('.filter').forEach(b=>listen(b,'click',()=>{filter=b.dataset.filter;$$('.filter').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));update();AudioEngine.ping();}));listen(input,'input',update);
  }
  function initProfile(id){
    const scanned=state.scanned.includes(id),memory=state.memories.includes(id);$('[data-profile-memory]').textContent=memory?'1 / 1 ФРАГМЕНТ':'0 / 1 ФРАГМЕНТ';
    if(scanned)$('.scan-result').textContent='СОЗНАНИЕ ПОДТВЕРЖДЕНО / '+CHARACTERS[id].title.toUpperCase();
    let timer=null;cleanups.push(()=>clearInterval(timer));
    listen($('[data-scan]'),'click',()=>{if(timer)return;const b=$('[data-scan]'),portrait=$('.portrait-stage'),bar=$('.scan-progress i'),result=$('.scan-result');b.disabled=true;portrait.classList.add('is-scanning');const start=performance.now(),duration=reduceMotion()?150:2500;AudioEngine.ping();timer=setInterval(()=>{const p=Math.min(100,Math.round((performance.now()-start)/duration*100));bar.style.width=p+'%';result.textContent='СОПОСТАВЛЕНИЕ НЕЙРОННЫХ СЛЕДОВ / '+p+' %';if(p===100){clearInterval(timer);timer=null;b.disabled=false;portrait.classList.remove('is-scanning');result.textContent='СОЗНАНИЕ ПОДТВЕРЖДЕНО / ПАМЯТЬ ДОСТУПНА';if(!state.scanned.includes(id))state.scanned.push(id);persist();announce('Обнаружено воспоминание: '+CHARACTERS[id].title);AudioEngine.ping(true);}},40);});
    listen($('[data-dialogue]'),'click',()=>openDialogue(id));
  }
  function initMemory(){
    const select=$('[data-memory-character]'),board=$('.puzzle-board'),status=$('.board-status'),save=$('[data-save-memory]');
    const incoming=query().get('character');if(incoming in CHARACTERS)select.value=incoming;
    let tiles=[],selected=-1,moves=0,done=false,hintTimer=null,hinting=false;
    function setTiles(){tiles=[3,0,4,2,5,1];selected=-1;moves=0;done=false;save.disabled=true;save.textContent='СОХРАНИТЬ ФРАГМЕНТ ↗';$('.memory-excerpt').hidden=true;$('.board-status').textContent='Выберите два фрагмента, чтобы поменять их местами.';const c=CHARACTERS[select.value];$('[data-memory-title]').textContent=c.title;$('[data-memory-excerpt]').textContent=c.excerpt;draw();}
    function draw(){
      board.replaceChildren();board.classList.toggle('solved',done);$('[data-moves]').textContent=String(moves).padStart(2,'0');
      const good=tiles.filter((n,i)=>n===i).length;$('[data-memory-integrity]').textContent=Math.round(good/6*100)+' %';
      tiles.forEach((tile,index)=>{const b=document.createElement('button');b.type='button';b.className='puzzle-tile'+(selected===index?' selected':'')+(tile===index?' correct':'');b.dataset.label=String(index+1).padStart(2,'0');b.dataset.piece=String(tile);b.style.backgroundImage=`url("assets/images/${select.value}-memory.webp")`;if(window.CONTINUANCE_IMAGE_DATA)b.style.backgroundImage=`url("${window.CONTINUANCE_IMAGE_DATA[select.value]}")`;b.style.backgroundPosition=`${(tile%3)*50}% ${Math.floor(tile/3)*100}%`;b.setAttribute('aria-label',`Позиция ${index+1}, фрагмент ${tile+1}${selected===index?', выбран':''}`);b.setAttribute('aria-pressed',String(selected===index));b.draggable=!done;b.disabled=done;b.addEventListener('click',()=>choose(index));b.addEventListener('dragstart',e=>{selected=index;e.dataTransfer.setData('text/plain',String(index));e.dataTransfer.effectAllowed='move';});b.addEventListener('dragover',e=>{if(!done)e.preventDefault();});b.addEventListener('drop',e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from)&&from>=0&&from<6&&from!==index){selected=from;choose(index);}});board.append(b);});
    }
    function choose(index){if(done||hinting)return;if(selected<0){selected=index;draw();$$('.puzzle-tile')[index].focus();return;}if(selected===index){selected=-1;draw();return;}const old=selected;[tiles[old],tiles[index]]=[tiles[index],tiles[old]];selected=-1;moves++;AudioEngine.ping();done=tiles.every((t,i)=>t===i);draw();if(done){status.textContent='ПОРТРЕТ ВОССТАНОВЛЕН. ВОСПОМИНАНИЕ ДОСТУПНО.';save.disabled=false;$('.memory-excerpt').hidden=false;$('.memory-entry.locked').hidden=true;AudioEngine.ping(true);save.focus();}else{status.textContent='Фрагменты поменялись местами. Найдите следующий след.';$$('.puzzle-tile')[index].focus();}}
    listen(select,'change',()=>{clearTimeout(hintTimer);hinting=false;setTiles();});
    listen($('[data-puzzle-shuffle]'),'click',()=>{if(hinting)return;tiles=[0,1,2,3,4,5];do{for(let i=5;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}}while(tiles.every((t,i)=>t===i));selected=-1;moves=0;done=false;save.disabled=true;$('.memory-excerpt').hidden=true;status.textContent='Портрет перемешан. Выберите два фрагмента.';draw();});
    listen($('[data-puzzle-hint]'),'click',()=>{if(done||hinting)return;hinting=true;selected=-1;const original=tiles.slice();tiles=[0,1,2,3,4,5];draw();status.textContent='ЗАПОМНИТЕ ОБРАЗ / 3 СЕКУНДЫ';hintTimer=setTimeout(()=>{tiles=original;hinting=false;draw();status.textContent='Выберите два фрагмента, чтобы поменять их местами.';},3000);});
    listen(save,'click',()=>{if(!done)return;if(!state.memories.includes(select.value))state.memories.push(select.value);persist();save.disabled=true;save.textContent='ФРАГМЕНТ СОХРАНЁН ✓';announce('Воспоминание сохранено в вашей капсуле.');AudioEngine.ping(true);});
    cleanups.push(()=>clearTimeout(hintTimer));setTiles();
  }
  function initProtocol(){
    let step=0,selections=state.choices.slice(0,3);const cards=$$('.choice'),art=cards.map(b=>$('.choice-art',b).innerHTML),next=$('[data-protocol-next]'),back=$('[data-protocol-back]');
    function draw(){const q=QUESTIONS[step];$('[data-protocol-title]').textContent=q.title;$('[data-protocol-lead]').textContent=q.lead;$('[data-step-label]').textContent=String(step+1).padStart(2,'0')+' / 03';$$('.step-track i').forEach((el,i)=>el.classList.toggle('active',i<=step));cards.forEach((b,i)=>{const o=q.options[i];b.dataset.choice=o[0];$('h2',b).textContent=o[1];$('p',b).textContent=o[2];b.setAttribute('aria-pressed',String(selections[step]===o[0]));$('.choice-art',b).innerHTML=art[(i+step)%3];});const selected=q.options.findIndex(o=>o[0]===selections[step]);next.disabled=selected<0;next.innerHTML=(step===2?'СОБРАТЬ МОЮ КАПСУЛУ':'ПОДТВЕРДИТЬ ВЫБОР')+' <span class="arrow">→</span>';$('.protocol-feedback').textContent=selected<0?'Выберите один след, чтобы продолжить.':q.feedback[selected];back.hidden=step===0;}
    cards.forEach((b,i)=>listen(b,'click',()=>{selections[step]=QUESTIONS[step].options[i][0];draw();AudioEngine.ping();}));
    listen(next,'click',()=>{if(!selections[step])return;state.choices=selections.slice(0,step+1);persist();if(step<2){step++;draw();$('[data-protocol-title]').setAttribute('tabindex','-1');$('[data-protocol-title]').focus({preventScroll:true});}else{AudioEngine.ping(true);go(window.CONTINUANCE_INLINE?'#mirror':'mirror.html');}});
    listen(back,'click',()=>{if(step>0){step--;draw();}});draw();
  }
  function initMirror(){
    const canvas=$('[data-mirror-canvas]'),video=$('[data-mirror-video]'),ctx=canvas.getContext('2d'),center=$('.mirror-center'),mode=$('[data-mirror-mode]'),result=$('.mirror-result'),save=$('[data-presence-save]'),start=$('[data-camera-start]');
    let stream=null,frame=0,t=0,alive=true,resize;
    function size(){const r=canvas.getBoundingClientRect();canvas.width=Math.max(2,Math.round(r.width*Math.min(devicePixelRatio,1.6)));canvas.height=Math.max(2,Math.round(r.height*Math.min(devicePixelRatio,1.6)));}
    resize=new ResizeObserver(size);resize.observe(canvas);size();
    function render(){if(!alive)return;const w=canvas.width,h=canvas.height;ctx.fillStyle='#14141b';ctx.fillRect(0,0,w,h);t+=reduceMotion()?0:.007;
      for(let k=0;k<16;k++){ctx.beginPath();ctx.strokeStyle=`rgba(173,138,255,${.12+(k%3)*.055})`;ctx.lineWidth=.65;const r=w*(.09+k*.011);for(let a=0;a<=180;a++){const angle=a/180*Math.PI*2,x=w/2+Math.cos(angle+t*(k%2?1:-1))*r*(1+Math.sin(angle*3+t)*.1),y=h/2+Math.sin(angle)*r*1.3+Math.sin(angle*2+t+k*.14)*w*.03;if(a===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.stroke();}
      for(let k=0;k<65;k++){const x=(Math.sin(k*71.3+t*.1)*.5+.5)*w,y=(Math.cos(k*21.7+t*.13)*.5+.5)*h;ctx.fillStyle=k%7===0?'#ad8aff99':'#e4e5e830';ctx.fillRect(x,y,1.3,1.3);}frame=requestAnimationFrame(render);}
    render();
    listen(start,'click',async()=>{if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;canvas.hidden=false;start.innerHTML='ВКЛЮЧИТЬ КАМЕРУ <span class="arrow">↗</span>';mode.textContent='АБСТРАКТНЫЙ СЛЕД';return;}if(!navigator.mediaDevices?.getUserMedia){result.textContent='Камера недоступна в этом режиме. Продолжите без неё или откройте сайт по HTTPS.';return;}start.disabled=true;result.textContent='Ожидаем ваше разрешение в браузере…';try{const incoming=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:960}},audio:false});if(!alive){incoming.getTracks().forEach(t=>t.stop());return;}stream=incoming;video.srcObject=stream;await video.play();canvas.hidden=true;video.hidden=false;center.hidden=true;mode.textContent='ПРЯМОЙ СИГНАЛ / ЛОКАЛЬНО';result.textContent='Отражение активно. Кадры не записываются.';start.innerHTML='ВЫКЛЮЧИТЬ КАМЕРУ <span class="arrow">×</span>';save.hidden=false;}catch(e){result.textContent=e.name==='NotAllowedError'?'Доступ к камере не предоставлен. Вы можете продолжить без камеры.':'Не удалось открыть камеру. Продолжите с абстрактным следом.';}finally{if(alive)start.disabled=false;}});
    listen($('[data-camera-skip]'),'click',()=>{if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;}video.hidden=true;canvas.hidden=false;size();center.hidden=true;mode.textContent='АБСТРАКТНЫЙ СЛЕД / АКТИВЕН';start.innerHTML='ВКЛЮЧИТЬ КАМЕРУ <span class="arrow">↗</span>';save.hidden=false;result.textContent='Ваше присутствие не требует изображения.';AudioEngine.ping();});
    listen(save,'click',()=>{state.presence=true;persist();save.disabled=true;save.textContent='ПРИСУТСТВИЕ СОХРАНЕНО ✓';result.textContent='В капсуле сохранена отметка участия. Изображения не сохранялись.';result.classList.add('presence-saved');AudioEngine.ping(true);});
    cleanups.push(()=>{alive=false;cancelAnimationFrame(frame);resize.disconnect();if(stream)stream.getTracks().forEach(t=>t.stop());video.srcObject=null;});
  }
  function initEnding(){
    const names={face:'ЛИЦО',voice:'ГОЛОС',name:'ИМЯ'},final=state.choices[2];
    $('[data-ending-memories]').textContent=String(state.memories.length).padStart(2,'0')+' / 03';$('[data-ending-choices]').textContent=String(state.choices.length).padStart(2,'0')+' / 03';$('[data-ending-presence]').textContent=state.presence?'СОХРАНЕНО':'НЕ ОТМЕЧЕНО';$('[data-ending-trace]').textContent=names[state.choices[0]]||'ЕЩЁ НЕ ВЫБРАН';
    if(final==='release'){$('[data-ending-title]').innerHTML='Отпустить —<br>тоже остаться.';$('[data-ending-copy]').textContent='Вы выбрали свободу от прошлого. Ваша капсула сохранит решение отпустить: воспоминания можно взять с собой, не оставаясь внутри них.';}
    if(final==='change'){$('[data-ending-title]').innerHTML='Вы уже<br>немного другой.';$('[data-ending-copy]').textContent='Продолжение не обязано повторять начало. Вы разрешили себе измениться — и оставили первую версию этого решения.';}
    listen($('[data-download-capsule]'),'click',()=>{const data={project:'ПРОДОЛЖЕНИЕ',version:1,title:$('.capsule-name').value.trim()||'Моя капсула',createdAt:new Date().toISOString(),sessionStartedAt:state.startedAt,memories:state.memories.map(id=>({id,character:CHARACTERS[id]?.name,title:CHARACTERS[id]?.title})),choices:state.choices.map((id,i)=>({question:QUESTIONS[i]?.title,answer:QUESTIONS[i]?.options.find(o=>o[0]===id)?.[1]||id})),presence:state.presence,note:'Локальная капсула. Изображения и видеопоток не записывались.'};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='prodolzhenie-capsule.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Ваша капсула готова к сохранению.');AudioEngine.ping(true);});
    listen($('[data-reset-session]'),'click',()=>{state=freshState();persist();announce('Началась новая сессия. Скачанные капсулы останутся у вас.');go(window.CONTINUANCE_INLINE?'#index':'index.html');});
  }
  initPage();
  if(window.CONTINUANCE_INLINE&&location.hash&&location.hash!=='#index')go(location.href,{push:false});
})();
