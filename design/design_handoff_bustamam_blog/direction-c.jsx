// Direction C — "Hybrid" — A's terminal bones + B's editorial display type.
// - Keeps the monospace metadata, terminal chrome, log-style post rows
// - Upgrades display type to Instrument Serif (editorial, literary)
// - Replaces the big log-tail hero with a smaller orbital mark + editorial headline
// - Adds B's pull-quote treatment & warmer neutrals
//
// Palette sits between A and B: slightly warmer paper, ink stays sharp,
// evergreen accent in light / terracotta-lime in dark.

const C_PAL = {
  light: {
    bg:'#f3f0e8',      // warmer paper than A, cooler than B
    surface:'#fbf9f2',
    ink:'#0e110d',
    mute:'#5a5a54',
    faint:'#969088',
    line:'#dcd6c7',
    lineSoft:'#e7e1d1',
    accent:'#2f6b2f',
    accentBg:'#dfe9d6',
    accentInk:'#1a3d1a',
    code:'#ece7d8',
    danger:'#b4432b',
    kbd:'#e9e2d0',
    warm:'#b4442a',   // editorial rust for punctuation
  },
  dark: {
    bg:'#0b0d0b',
    surface:'#131612',
    ink:'#ecebe3',
    mute:'#8f8a7f',
    faint:'#5a5a54',
    line:'#1f231d',
    lineSoft:'#17191476',
    accent:'#9eff5a',
    accentBg:'#16210f',
    accentInk:'#c8ff90',
    code:'#0d100c',
    danger:'#ff6b4a',
    kbd:'#181b16',
    warm:'#e88b5f',
  }
};

const cF = {
  sans:"'Geist',-apple-system,system-ui,sans-serif",
  mono:"'JetBrains Mono',ui-monospace,Menlo,monospace",
  serif:"'Instrument Serif','Iowan Old Style',Georgia,serif",
};

function CChrome({ c, theme, onToggle, path='/' }) {
  return (
    <div style={{display:'flex', alignItems:'center', height:34, borderBottom:`1px solid ${c.line}`, background:c.surface, fontFamily:cF.mono, fontSize:11, color:c.mute}}>
      <div style={{display:'flex', alignItems:'center', gap:6, padding:'0 14px', borderRight:`1px solid ${c.line}`, height:'100%'}}>
        <span style={{width:7,height:7,borderRadius:'50%',background:c.danger}} />
        <span style={{width:7,height:7,borderRadius:'50%',background:c.faint}} />
        <span style={{width:7,height:7,borderRadius:'50%',background:c.accent}} />
      </div>
      <div style={{padding:'0 14px', borderRight:`1px solid ${c.line}`, height:'100%', display:'flex', alignItems:'center', color:c.ink}}>
        rasheed@bustamam <span style={{color:c.faint, margin:'0 6px'}}>·</span> ~/journal{path}
      </div>
      <div style={{flex:1}} />
      <div style={{padding:'0 14px', borderLeft:`1px solid ${c.line}`, height:'100%', display:'flex', alignItems:'center', gap:12}}>
        <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:c.accent}} />
          <span style={{color:c.ink}}>available · Q3</span>
        </span>
        <span style={{color:c.faint}}>·</span>
        <button onClick={onToggle} style={{background:'transparent', border:`1px solid ${c.line}`, color:c.ink, cursor:'pointer', fontFamily:cF.mono, fontSize:10, padding:'3px 8px', borderRadius:2, letterSpacing:'.05em', textTransform:'uppercase'}}>
          {theme==='dark'?'☀ light':'☾ dark'}
        </button>
      </div>
    </div>
  );
}

function CHeader({ c }) {
  return (
    <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 56px', borderBottom:`1px solid ${c.line}`, background:c.bg}}>
      <div style={{display:'flex', alignItems:'center', gap:14}}>
        <BustamamMark size={22} color={c.ink} weight={1.6} />
        <div style={{fontFamily:cF.mono, fontSize:13, color:c.ink, fontWeight:500}}>
          bustamam<span style={{color:c.warm}}>.</span>technology
        </div>
        <div style={{height:14, width:1, background:c.line, margin:'0 4px'}} />
        <div style={{fontFamily:cF.mono, fontSize:11, color:c.mute}}>/journal</div>
      </div>
      <nav style={{display:'flex', alignItems:'center', gap:28, fontFamily:cF.mono, fontSize:12, color:c.mute}}>
        <a style={{color:c.ink, textDecoration:'none'}}>writing</a>
        <a style={{color:c.mute, textDecoration:'none'}}>work</a>
        <a style={{color:c.mute, textDecoration:'none'}}>about</a>
        <a style={{color:c.mute, textDecoration:'none'}}>contact</a>
        <div style={{display:'flex', alignItems:'center', gap:6, padding:'5px 10px', border:`1px solid ${c.line}`, borderRadius:2, color:c.faint, fontSize:11}}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>search</span>
          <span style={{fontSize:10, padding:'1px 5px', background:c.kbd, borderRadius:2, color:c.mute}}>⌘K</span>
        </div>
      </nav>
    </header>
  );
}

// Hybrid hero: editorial headline in Instrument Serif + small orbital mark.
// Orbital replaces the log-tail terminal, as the terminal chrome already
// carries the engineer signal. Orbit is smaller, subtler, used as an accent.
function CHero({ c }) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf; const start = performance.now();
    const tick = (now) => { setT((now-start)/1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const orbits = [
    { r: 48, speed: 0.55, size: 7, label: 'systems' },
    { r: 80, speed: -0.32, size: 6, label: 'craft' },
    { r: 116, speed: 0.19, size: 6, label: 'perf' },
    { r: 148, speed: -0.12, size: 5, label: 'ops' },
  ];

  return (
    <section style={{padding:'64px 56px 56px', borderBottom:`1px solid ${c.line}`, display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:72, alignItems:'center'}}>
      <div>
        <div style={{display:'inline-flex', alignItems:'center', gap:10, padding:'5px 12px', background:c.accentBg, color:c.accentInk, borderRadius:2, fontFamily:cF.mono, fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:28}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:c.accent}} />
          journal · vol 04 · spring 2026
        </div>
        <h1 style={{fontFamily:cF.serif, fontWeight:400, fontSize:96, lineHeight:.92, margin:0, color:c.ink, letterSpacing:'-.032em'}}>
          Notes from<br/>
          the <em style={{fontStyle:'italic', color:c.warm}}>middle</em> of<br/>
          the stack<span style={{color:c.warm}}>.</span>
        </h1>
        <p style={{marginTop:28, maxWidth:560, fontFamily:cF.serif, fontSize:22, lineHeight:1.4, color:c.mute, fontStyle:'italic'}}>
          An engineering journal by <span style={{color:c.ink, fontStyle:'normal'}}>Rasheed Bustamam</span> —
          an independent software consultant based in California. Notes on the craft and
          the decisions behind the code.
        </p>
        <div style={{display:'flex', gap:14, marginTop:32, fontFamily:cF.mono, fontSize:12}}>
          <button style={{background:c.ink, color:c.bg, border:`1px solid ${c.ink}`, padding:'10px 18px', borderRadius:2, cursor:'pointer', fontFamily:cF.mono, fontSize:12, letterSpacing:'.02em'}}>
            $ read latest <span style={{color:c.accent, marginLeft:4}}>→</span>
          </button>
          <button style={{background:'transparent', color:c.ink, border:`1px solid ${c.line}`, padding:'10px 18px', borderRadius:2, cursor:'pointer', fontFamily:cF.mono, fontSize:12, letterSpacing:'.02em'}}>
            $ hire me
          </button>
        </div>
      </div>

      {/* Small orbital — subtle, editorial, not the terminal */}
      <div style={{position:'relative', width:340, height:340, margin:'0 auto'}}>
        <svg width="340" height="340" viewBox="-170 -170 340 340" style={{position:'absolute', inset:0}}>
          {orbits.map((o, i) => (
            <circle key={i} cx="0" cy="0" r={o.r} fill="none" stroke={c.line} strokeWidth="1" strokeDasharray={i%2?"2 4":"none"} />
          ))}
          {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
            const a = (i/12)*Math.PI*2;
            const x1 = Math.cos(a)*158, y1 = Math.sin(a)*158;
            const x2 = Math.cos(a)*166, y2 = Math.sin(a)*166;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.line} strokeWidth="1" />;
          })}
        </svg>
        <div style={{position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', width:64, height:64, borderRadius:'50%', background:c.warm, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:cF.serif, fontSize:38, color:c.bg, letterSpacing:'-.02em'}}>
          <span style={{marginTop:-4}}>B</span>
        </div>
        <div style={{position:'absolute', left:'50%', top:'50%', fontFamily:cF.mono, fontSize:9, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase', pointerEvents:'none'}}>
          {orbits.map((o, i) => {
            const a = t*o.speed + i*0.8;
            const x = Math.cos(a)*o.r, y = Math.sin(a)*o.r;
            return (
              <React.Fragment key={i}>
                <div style={{position:'absolute', left:x, top:y, width:o.size, height:o.size, marginLeft:-o.size/2, marginTop:-o.size/2, borderRadius:'50%', background: i===0 ? c.warm : c.ink}} />
                <div style={{position:'absolute', left:x, top:y, marginLeft:10, marginTop:-4, color:c.mute, whiteSpace:'nowrap', fontSize:9}}>{o.label}</div>
              </React.Fragment>
            );
          })}
        </div>
        {/* Corner metadata, terminal-style */}
        <div style={{position:'absolute', bottom:-8, left:0, fontFamily:cF.mono, fontSize:10, color:c.faint, letterSpacing:'.08em', textTransform:'uppercase'}}>
          {POSTS.length} essays · since 2019
        </div>
      </div>
    </section>
  );
}

function CNowStrip({ c }) {
  return (
    <div style={{padding:'16px 56px', borderBottom:`1px solid ${c.line}`, background:c.surface, display:'flex', alignItems:'center', gap:20, fontFamily:cF.mono, fontSize:11, color:c.mute}}>
      <span style={{color:c.faint, letterSpacing:'.12em', textTransform:'uppercase'}}>§ now</span>
      <span style={{color:c.ink, fontFamily:cF.serif, fontSize:15, fontStyle:'italic'}}>writing: a taxonomy of idempotency keys</span>
      <span style={{color:c.faint}}>·</span>
      <span style={{fontFamily:cF.serif, fontSize:15, fontStyle:'italic'}}>reading: designing data-intensive applications, 2nd ed.</span>
      <span style={{marginLeft:'auto', color:c.faint}}>updated 3 days ago</span>
    </div>
  );
}

function CFilters({ c, activeTag, setActiveTag, query, setQuery }) {
  return (
    <div style={{padding:'22px 56px', borderBottom:`1px solid ${c.line}`, background:c.bg, display:'flex', alignItems:'center', gap:20, flexWrap:'wrap'}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:'6px 10px', border:`1px solid ${c.line}`, borderRadius:2, background:c.surface, minWidth:280}}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{color:c.mute}}>
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="grep titles, tags, years..."
          style={{border:'none', outline:'none', background:'transparent', flex:1, fontFamily:cF.mono, fontSize:12, color:c.ink}} />
        <span style={{fontFamily:cF.mono, fontSize:10, padding:'2px 6px', background:c.kbd, color:c.mute, borderRadius:2}}>/</span>
      </div>
      <div style={{height:18, width:1, background:c.line}} />
      <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
        {TAGS.map(t => {
          const on = t.name === activeTag;
          return (
            <button key={t.name} onClick={()=>setActiveTag(t.name)} style={{
              fontFamily:cF.mono, fontSize:11, letterSpacing:'.02em', padding:'5px 10px', borderRadius:2, cursor:'pointer',
              border:`1px solid ${on ? c.ink : c.line}`, background: on ? c.ink : 'transparent', color: on ? c.bg : c.mute,
            }}>
              {t.name.toLowerCase()}<span style={{opacity:.55, marginLeft:4}}>{t.count}</span>
            </button>
          );
        })}
      </div>
      <div style={{marginLeft:'auto', fontFamily:cF.mono, fontSize:11, color:c.faint}}>
        sort: <span style={{color:c.ink}}>recent ↓</span>
      </div>
    </div>
  );
}

function CRow({ c, post, n, active }) {
  return (
    <article style={{
      display:'grid', gridTemplateColumns:'48px 110px 1fr 150px 90px 24px', gap:24, alignItems:'baseline',
      padding:'26px 56px', borderBottom:`1px solid ${c.lineSoft}`,
      background: active ? c.surface : 'transparent', cursor:'pointer',
    }}>
      <div style={{fontFamily:cF.mono, fontSize:11, color:c.faint, letterSpacing:'.05em', fontVariantNumeric:'tabular-nums'}}>
        {String(n).padStart(3,'0')}
      </div>
      <div style={{fontFamily:cF.mono, fontSize:11, color:c.mute, fontVariantNumeric:'tabular-nums'}}>
        {fmtDate(post.date)}
      </div>
      <div>
        <h3 style={{margin:0, fontFamily:cF.serif, fontSize:30, lineHeight:1.1, fontWeight:400, color:c.ink, letterSpacing:'-.02em'}}>
          {post.title}<span style={{color:c.warm}}>.</span>
        </h3>
        <p style={{margin:'8px 0 0', fontFamily:cF.sans, fontSize:14, lineHeight:1.55, color:c.mute, maxWidth:640}}>
          {post.dek}
        </p>
      </div>
      <div style={{fontFamily:cF.mono, fontSize:11, color:c.mute}}>
        <span style={{padding:'2px 7px', border:`1px solid ${c.line}`, color:c.ink, borderRadius:2, letterSpacing:'.04em', fontSize:10, textTransform:'uppercase'}}>
          {post.tag}
        </span>
      </div>
      <div style={{fontFamily:cF.mono, fontSize:11, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, textAlign:'right', fontVariantNumeric:'tabular-nums'}}>
        <span style={{color:c.ink}}>{post.readMin} min</span>
        <span style={{color:c.faint}}>{post.words.toLocaleString()} w</span>
      </div>
      <div style={{color:c.faint, fontFamily:cF.mono, fontSize:14, alignSelf:'center', textAlign:'right'}}>→</div>
    </article>
  );
}

function CBio({ c }) {
  return (
    <section style={{padding:'64px 56px', borderTop:`1px solid ${c.line}`, background:c.surface}}>
      <blockquote style={{
        maxWidth:920, margin:'0 auto 40px', fontFamily:cF.serif, fontSize:40, lineHeight:1.25,
        color:c.ink, fontStyle:'italic', textAlign:'center', letterSpacing:'-.015em', fontWeight:400,
      }}>
        "Good software is mostly someone making a series of boring decisions for ten years<span style={{color:c.warm}}>.</span>"
      </blockquote>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:56, alignItems:'start', maxWidth:1100, margin:'0 auto'}}>
        <div>
          <div style={{fontFamily:cF.mono, fontSize:10, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:18}}>
            § about the author
          </div>
          <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:18}}>
            <div style={{width:56, height:56, borderRadius:'50%', background:`linear-gradient(135deg, ${c.warm}, ${c.ink})`, display:'flex', alignItems:'center', justifyContent:'center', color:c.bg, fontFamily:cF.serif, fontSize:26}}>A</div>
            <div>
              <div style={{fontFamily:cF.serif, fontSize:26, color:c.ink, letterSpacing:'-.015em'}}>{AUTHOR.name}</div>
              <div style={{fontFamily:cF.mono, fontSize:11, color:c.faint, marginTop:3, letterSpacing:'.02em'}}>
                independent consultant · {AUTHOR.location}
              </div>
            </div>
          </div>
          <p style={{fontFamily:cF.serif, fontSize:18, lineHeight:1.55, color:c.mute, margin:0, fontStyle:'italic'}}>
            {AUTHOR.longBio}
          </p>
        </div>
        <div style={{border:`1px solid ${c.line}`, borderRadius:3, padding:'28px 32px', background:c.bg}}>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:18}}>
            <span style={{width:7, height:7, borderRadius:'50%', background:c.accent, boxShadow:`0 0 0 3px ${c.accentBg}`}} />
            <span style={{fontFamily:cF.mono, fontSize:11, color:c.accentInk, letterSpacing:'.1em', textTransform:'uppercase', background:c.accentBg, padding:'3px 8px', borderRadius:2}}>
              accepting new work
            </span>
          </div>
          <div style={{fontFamily:cF.serif, fontSize:28, color:c.ink, lineHeight:1.25, letterSpacing:'-.015em', marginBottom:26, fontStyle:'italic'}}>
            Taking on new engagements for <span style={{color:c.warm, fontStyle:'normal'}}>Q3 2026</span>.
            Let's talk about what you're building.
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, fontFamily:cF.mono, fontSize:11, color:c.mute}}>
            <div>
              <div style={{color:c.faint, fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4}}>based in</div>
              <div style={{color:c.ink}}>California</div>
            </div>
            <div>
              <div style={{color:c.faint, fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4}}>working</div>
              <div style={{color:c.ink}}>remote</div>
            </div>
            <div>
              <div style={{color:c.faint, fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4}}>contact</div>
              <div style={{color:c.ink}}>rasheed@bustamam.technology</div>
            </div>
            <div>
              <div style={{color:c.faint, fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4}}>elsewhere</div>
              <div style={{color:c.ink}}>github · rss</div>
            </div>
          </div>
          <button style={{marginTop:24, background:c.ink, color:c.bg, border:'none', padding:'10px 18px', borderRadius:2, cursor:'pointer', fontFamily:cF.mono, fontSize:12, letterSpacing:'.02em'}}>
            $ start a conversation →
          </button>
        </div>
      </div>
    </section>
  );
}

function CFooter({ c }) {
  return (
    <footer style={{padding:'28px 56px', borderTop:`1px solid ${c.line}`, background:c.surface, display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:cF.mono, fontSize:11, color:c.mute}}>
      <div style={{display:'flex', gap:20}}>
        <span>© 2026 bustamam.technology</span>
        <a style={{color:c.mute}}>rss</a>
        <a style={{color:c.mute}}>json feed</a>
        <a style={{color:c.mute}}>colophon</a>
      </div>
      <div style={{display:'flex', gap:20, alignItems:'center'}}>
        <span style={{color:c.faint, fontFamily:cF.serif, fontSize:14, fontStyle:'italic'}}>typeset in Instrument Serif &amp; JetBrains Mono</span>
        <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:c.accent}} />
          all systems nominal
        </span>
      </div>
    </footer>
  );
}

function DirectionCIndex({ theme: initialTheme }) {
  const [theme, setTheme] = React.useState(initialTheme);
  const [activeTag, setActiveTag] = React.useState('All');
  const [query, setQuery] = React.useState('');
  const c = C_PAL[theme];
  const filtered = POSTS.filter(p =>
    (activeTag==='All' || p.tag===activeTag || p.kind===activeTag) &&
    (query==='' || p.title.toLowerCase().includes(query.toLowerCase()) || p.tag.toLowerCase().includes(query.toLowerCase()))
  );
  return (
    <div style={{background:c.bg, color:c.ink, minHeight:'100%', fontFamily:cF.sans}}>
      <CChrome c={c} theme={theme} onToggle={()=>setTheme(theme==='light'?'dark':'light')} path="/writing" />
      <CHeader c={c} />
      <CHero c={c} />
      <CFilters c={c} activeTag={activeTag} setActiveTag={setActiveTag} query={query} setQuery={setQuery} />
      <div style={{display:'grid', gridTemplateColumns:'48px 110px 1fr 150px 90px 24px', gap:24, padding:'14px 56px', borderBottom:`1px solid ${c.line}`, fontFamily:cF.mono, fontSize:10, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase'}}>
        <div>№</div><div>date</div><div>title · dek</div><div>tag</div><div style={{textAlign:'right'}}>length</div><div />
      </div>
      {filtered.map((p, i) => <CRow key={p.slug} c={c} post={p} n={i+1} active={i===0} />)}
      <CBio c={c} />
      <CFooter c={c} />
    </div>
  );
}

Object.assign(window, { DirectionCIndex });
