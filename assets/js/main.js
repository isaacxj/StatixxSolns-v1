(function(){
  /* live US time zone clocks */
  function tick(){
    document.querySelectorAll('.time[data-tz]').forEach(function(el){
      try{
        el.textContent = new Intl.DateTimeFormat('en-US',{
          hour:'2-digit',minute:'2-digit',hour12:true,timeZone:el.dataset.tz
        }).format(new Date());
      }catch(e){ el.textContent = ''; }
    });
  }
  tick(); setInterval(tick, 30000);

  /* signal trace under the hero: dense static resolving into a clean wave */
  const c = document.getElementById('scope');
  if(!c) return;
  const ctx = c.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, t = 0;

  // persistent noise control points, eased toward new targets so the
  // static wanders instead of flickering
  const STEP = 6;
  let pts = [], targets = [];

  function resize(){
    const dpr = window.devicePixelRatio || 1;
    w = c.clientWidth; h = c.clientHeight;
    c.width = w*dpr; c.height = h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const n = Math.ceil(w/STEP)+2;
    pts = new Array(n).fill(0).map(()=>Math.random()*2-1);
    targets = pts.slice();
  }
  window.addEventListener('resize', resize);
  resize();

  function smoothstep(a,b,x){
    const k = Math.min(1, Math.max(0, (x-a)/(b-a)));
    return k*k*(3-2*k);
  }

  function noiseAt(x){
    const i = Math.floor(x/STEP);
    const f = (x - i*STEP)/STEP;
    const a = pts[i] || 0, b = pts[i+1] || 0;
    const u = (1 - Math.cos(f*Math.PI))/2;   // cosine interpolation
    return a*(1-u) + b*u;
  }

  // per-pixel white noise, re-seeded every frame: the high-frequency crackle
  // that makes the left of the trace read as true static
  function staticAt(x){
    const s = Math.sin(x*127.1 + t*311.7) * 43758.5453;
    return (s - Math.floor(s))*2 - 1;
  }

  function drawFrame(){
    // the canvas can be laid out at zero width if the page loads in a
    // hidden tab; re-measure until it has real dimensions
    if(!w){ resize(); if(!w) return; }

    // ease each control point toward its target; re-aim often so the
    // baseline keeps wandering underneath the crackle
    for(let i=0;i<pts.length;i++){
      pts[i] += (targets[i]-pts[i])*0.2;
      if(Math.random() < 0.2) targets[i] = Math.random()*2-1;
    }

    ctx.clearRect(0,0,w,h);
    const mid = h/2, amp = h*0.32;

    // subtle instrument ticks along the midline
    ctx.strokeStyle = 'rgba(154,165,184,0.35)';
    ctx.lineWidth = 1;
    for(let x=0; x<=w; x+=Math.max(56, w/18)){
      ctx.beginPath(); ctx.moveTo(x, mid-4); ctx.lineTo(x, mid+4); ctx.stroke();
    }

    // main trace: static on the left easing into a clean signal
    ctx.beginPath();
    for(let x=0; x<=w; x++){
      const p = x/w;
      const mix = smoothstep(0.12, 0.62, p);           // where noise becomes signal
      const noise = 1 - mix;
      const clean = Math.sin((x*0.028) - t*0.04) * amp;
      const rough = noiseAt(x) * amp * 0.7;            // wandering baseline
      const crackle = staticAt(x) * amp * 0.55 * noise; // frame-to-frame static
      const y = mid + (rough + crackle)*noise + clean*mix;
      x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.strokeStyle = '#2e5bff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    t++;
  }

  // animate only while the trace is on screen
  let running = false, rafId = 0;
  function loop(){
    drawFrame();
    if(running) rafId = requestAnimationFrame(loop);
  }
  if(reduced){
    drawFrame();
  }else if('IntersectionObserver' in window){
    new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting && !running){
        running = true; loop();
      }else if(!entries[0].isIntersecting && running){
        running = false; cancelAnimationFrame(rafId);
      }
    }).observe(c);
  }else{
    running = true; loop();
  }
})();
