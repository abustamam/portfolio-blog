// Direction B — "Swiss Editorial"
// Warm paper / deep ink, geometric grotesk (Space Grotesk) + serif (Instrument Serif),
// big 12-col grid, literary hierarchy. Clay / rust accent.

const B_PAL = {
  light: {
    bg:'#f2ede4',       // warm paper
    surface:'#fbf7ee',
    ink:'#171310',
    mute:'#6a5d52',
    faint:'#a39585',
    line:'#e0d7c6',
    lineSoft:'#ebe3d2',
    accent:'#b4442a',   // rust
    accentBg:'#f2e0d3',
    hl:'#f4e6b8',
    chip:'#e7dfce',
  },
  dark: {
    bg:'#13110e',
    surface:'#1a1714',
    ink:'#f2ede4',
    mute:'#a39585',
    faint:'#6a5d52',
    line:'#2a2520',
    lineSoft:'#1f1b17',
    accent:'#e88b5f',
    accentBg:'#2d1810',
    hl:'#3a2e0e',
    chip:'#241f1a',
  }
};

const bF = {
  sans:"'Space Grotesk',-apple-system,system-ui,sans-serif",
  serif:"'Instrument Serif','Iowan Old Style',Georgia,serif",
  mono:"'IBM Plex Mono',ui-monospace,Menlo,monospace",
};

function BHeader({ c, theme, onToggle }) {
  return (
    <header style={{
      display:'grid', gridTemplateColumns:'auto 1fr auto auto', alignItems:'center', gap:28,
      padding:'22px 56px', borderBottom:`1px solid ${c.line}`, background:c.bg,
    }}>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <BustamamMark size={26} color={c.ink} weight={1.8} />
        <div>
          <div style={{fontFamily:bF.sans, fontSize:15, fontWeight:600, color:c.ink, letterSpacing:'-.01em'}}>
            Bustamam Technology
          </div>
          <div style={{fontFamily:bF.mono, fontSize:10, color:c.mute, letterSpacing:'.1em', textTransform:'uppercase', marginTop:2}}>
            An engineering journal · est. 2019
          </div>
        </div>
      </div>
      <div />
      <nav style={{display:'flex', gap:28, fontFamily:bF.sans, fontSize:14, color:c.mute, fontWeight:500}}>
        <a style={{color:c.ink, borderBottom:`1px solid ${c.accent}`, paddingBottom:2}}>Journal</a>
        <a>Work</a>
        <a>Studio</a>
        <a>Subscribe</a>
      </nav>
      <button onClick={onToggle} style={{
        background:'transparent', border:`1px solid ${c.line}`, color:c.ink, padding:'6px 12px',
        borderRadius:999, cursor:'pointer', fontFamily:bF.sans, fontSize:12, fontWeight:500,
        display:'flex', alignItems:'center', gap:6,
      }}>
        <span>{theme==='dark' ? '☀' : '☾'}</span>
        <span>{theme==='dark' ? 'Light' : 'Dark'}</span>
      </button>
    </header>
  );
}

function BHero({ c }) {
  // Animated orbiting dots — represents engineers/posts in rotation
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf; const start = performance.now();
    const tick = (now) => { setT((now-start)/1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const orbits = [
    { r: 70, speed: 0.6, size: 10, label: 'systems' },
    { r: 120, speed: -0.35, size: 7, label: 'craft' },
    { r: 170, speed: 0.22, size: 8, label: 'perf' },
    { r: 210, speed: -0.15, size: 6, label: 'ops' },
  ];

  return (
    <section style={{
      display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:56, padding:'72px 56px 64px',
      borderBottom:`1px solid ${c.line}`, alignItems:'center'
    }}>
      <div>
        <div style={{
          display:'inline-flex', alignItems:'baseline', gap:12, fontFamily:bF.mono, fontSize:11,
          color:c.mute, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:32
        }}>
          <span style={{color:c.accent}}>Vol. 04</span>
          <span>·</span>
          <span>Spring 2026</span>
          <span>·</span>
          <span>{POSTS.length} essays</span>
        </div>
        <h1 style={{
          fontFamily:bF.serif, fontWeight:400, fontSize:104, lineHeight:.92, margin:0,
          color:c.ink, letterSpacing:'-.03em'
        }}>
          Notes from<br />
          the <em style={{fontStyle:'italic', color:c.accent}}>middle</em><br />
          of the stack.
        </h1>
        <p style={{
          marginTop:32, maxWidth:520, fontFamily:bF.sans, fontSize:17, lineHeight:1.55,
          color:c.mute, fontWeight:400
        }}>
          An engineering journal from Bustamam Technology — a forty-person consultancy that
          builds backends, rewrites monoliths, and occasionally talks about what went wrong.
          Updated on no particular schedule.
        </p>
        <div style={{display:'flex', gap:14, marginTop:36, alignItems:'center'}}>
          <button style={{
            background:c.ink, color:c.bg, border:'none', padding:'12px 22px', borderRadius:999,
            fontFamily:bF.sans, fontSize:14, fontWeight:500, cursor:'pointer'
          }}>Read the latest →</button>
          <button style={{
            background:'transparent', color:c.ink, border:`1px solid ${c.line}`, padding:'12px 22px',
            borderRadius:999, fontFamily:bF.sans, fontSize:14, fontWeight:500, cursor:'pointer'
          }}>Subscribe via RSS</button>
        </div>
      </div>

      {/* Animated orbital graphic */}
      <div style={{position:'relative', width:480, height:480, margin:'0 auto'}}>
        <svg width="480" height="480" viewBox="-240 -240 480 480" style={{position:'absolute', inset:0}}>
          {orbits.map((o, i) => (
            <circle key={i} cx="0" cy="0" r={o.r} fill="none" stroke={c.line} strokeWidth="1" strokeDasharray={i%2?"2 4":"none"} />
          ))}
          {/* radial marks */}
          {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
            const a = (i/12)*Math.PI*2;
            const x1 = Math.cos(a)*225, y1 = Math.sin(a)*225;
            const x2 = Math.cos(a)*235, y2 = Math.sin(a)*235;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.line} strokeWidth="1" />;
          })}
        </svg>
        {/* Center */}
        <div style={{
          position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
          width:84, height:84, borderRadius:'50%', background:c.accent,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:bF.serif, fontSize:42, color:c.bg, letterSpacing:'-.02em',
        }}>
          <span style={{marginTop:-4}}>B</span>
        </div>
        {/* Orbit labels */}
        <div style={{
          position:'absolute', left:'50%', top:'50%', fontFamily:bF.mono, fontSize:10,
          color:c.faint, letterSpacing:'.12em', textTransform:'uppercase', pointerEvents:'none',
        }}>
          {orbits.map((o, i) => {
            const a = t*o.speed + i*0.8;
            const x = Math.cos(a)*o.r, y = Math.sin(a)*o.r;
            return (
              <React.Fragment key={i}>
                <div style={{
                  position:'absolute', left:x, top:y, width:o.size, height:o.size,
                  marginLeft:-o.size/2, marginTop:-o.size/2, borderRadius:'50%',
                  background: i===0 ? c.accent : c.ink,
                }} />
                <div style={{
                  position:'absolute', left:x, top:y-o.size-4, marginLeft:10, color:c.mute,
                  whiteSpace:'nowrap', fontSize:9
                }}>{o.label}</div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BFilters({ c, activeTag, setActiveTag, query, setQuery }) {
  return (
    <div style={{
      display:'grid', gridTemplateColumns:'1fr auto', gap:32, alignItems:'center',
      padding:'28px 56px', borderBottom:`1px solid ${c.line}`,
    }}>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        {TAGS.map(t => {
          const on = t.name === activeTag;
          return (
            <button key={t.name} onClick={()=>setActiveTag(t.name)} style={{
              fontFamily:bF.sans, fontSize:13, fontWeight:500, padding:'6px 14px', borderRadius:999,
              cursor:'pointer', border:`1px solid ${on ? c.ink : c.line}`,
              background: on ? c.ink : 'transparent', color: on ? c.bg : c.mute,
              display:'inline-flex', alignItems:'center', gap:6,
            }}>
              {t.name}
              <span style={{opacity:.6, fontFamily:bF.mono, fontSize:10}}>{String(t.count).padStart(2,'0')}</span>
            </button>
          );
        })}
      </div>
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'8px 14px',
        border:`1px solid ${c.line}`, borderRadius:999, background:c.surface, minWidth:260,
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{color:c.mute}}>
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search the journal"
          style={{border:'none', outline:'none', background:'transparent', flex:1, fontFamily:bF.sans, fontSize:13, color:c.ink}} />
      </div>
    </div>
  );
}

function BFeaturedRow({ c, post }) {
  return (
    <article style={{
      display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:48, padding:'56px 56px',
      borderBottom:`1px solid ${c.line}`, alignItems:'end'
    }}>
      <div>
        <div style={{fontFamily:bF.mono, fontSize:10, color:c.accent, letterSpacing:'.2em', textTransform:'uppercase', marginBottom:20}}>
          ✦ Featured · {fmtDate(post.date, {long:true})}
        </div>
        <h2 style={{
          fontFamily:bF.serif, fontWeight:400, fontSize:68, lineHeight:1.02, margin:0,
          color:c.ink, letterSpacing:'-.02em'
        }}>
          {post.title}.
        </h2>
        <p style={{marginTop:22, fontFamily:bF.sans, fontSize:18, lineHeight:1.55, color:c.mute, maxWidth:620}}>
          {post.dek}
        </p>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:14, fontFamily:bF.sans, fontSize:13, color:c.mute}}>
        <div style={{display:'flex', justifyContent:'space-between', paddingBottom:12, borderBottom:`1px solid ${c.lineSoft}`}}>
          <span style={{color:c.faint, fontFamily:bF.mono, fontSize:10, letterSpacing:'.1em', textTransform:'uppercase'}}>By</span>
          <span style={{color:c.ink, fontWeight:500}}>{post.author}</span>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', paddingBottom:12, borderBottom:`1px solid ${c.lineSoft}`}}>
          <span style={{color:c.faint, fontFamily:bF.mono, fontSize:10, letterSpacing:'.1em', textTransform:'uppercase'}}>Field</span>
          <span style={{color:c.ink}}>{post.tag}</span>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', paddingBottom:12, borderBottom:`1px solid ${c.lineSoft}`}}>
          <span style={{color:c.faint, fontFamily:bF.mono, fontSize:10, letterSpacing:'.1em', textTransform:'uppercase'}}>Length</span>
          <span style={{color:c.ink}}>{post.readMin} min · {post.words.toLocaleString()} w</span>
        </div>
        <button style={{
          alignSelf:'flex-start', marginTop:14,
          background:'transparent', border:`1px solid ${c.ink}`, color:c.ink,
          padding:'10px 20px', borderRadius:999, fontFamily:bF.sans, fontSize:13, fontWeight:500,
          cursor:'pointer',
        }}>Read the essay →</button>
      </div>
    </article>
  );
}

function BPostRow({ c, post, n }) {
  return (
    <article style={{
      display:'grid', gridTemplateColumns:'60px 1.3fr 1fr 200px', gap:32, alignItems:'baseline',
      padding:'26px 56px', borderBottom:`1px solid ${c.lineSoft}`, cursor:'pointer',
    }}>
      <div style={{fontFamily:bF.mono, fontSize:11, color:c.faint, letterSpacing:'.1em'}}>
        №{String(n).padStart(2,'0')}
      </div>
      <div>
        <h3 style={{margin:0, fontFamily:bF.serif, fontSize:30, fontWeight:400, lineHeight:1.1, color:c.ink, letterSpacing:'-.015em'}}>
          {post.title}
        </h3>
        <div style={{display:'flex', gap:14, marginTop:10, fontFamily:bF.sans, fontSize:12, color:c.faint}}>
          <span>{fmtDate(post.date, {long:true})}</span>
          <span>·</span>
          <span>{post.author}</span>
          <span>·</span>
          <span style={{color:c.accent}}>{post.tag}</span>
        </div>
      </div>
      <p style={{margin:0, fontFamily:bF.sans, fontSize:14, lineHeight:1.5, color:c.mute}}>
        {post.dek}
      </p>
      <div style={{textAlign:'right', fontFamily:bF.mono, fontSize:11, color:c.mute}}>
        <div style={{fontSize:22, fontFamily:bF.serif, color:c.ink, letterSpacing:'-.01em', marginBottom:2}}>
          {post.readMin}<span style={{fontSize:12, color:c.faint, marginLeft:2}}>min</span>
        </div>
        <div>{post.words.toLocaleString()} words</div>
      </div>
    </article>
  );
}

function BFooter({ c }) {
  return (
    <footer style={{padding:'64px 56px 48px', borderTop:`1px solid ${c.line}`, background:c.surface}}>
      <div style={{display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr', gap:48, marginBottom:48}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
            <BustamamMark size={22} color={c.ink} weight={1.8} />
            <span style={{fontFamily:bF.sans, fontSize:14, fontWeight:600, color:c.ink}}>Bustamam Technology</span>
          </div>
          <p style={{fontFamily:bF.serif, fontSize:20, lineHeight:1.4, color:c.mute, maxWidth:320, margin:0, fontStyle:'italic'}}>
            Good software is mostly someone making a series of boring decisions for ten years.
          </p>
        </div>
        <div>
          <div style={{fontFamily:bF.mono, fontSize:10, color:c.faint, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:14}}>Journal</div>
          <div style={{display:'flex', flexDirection:'column', gap:8, fontFamily:bF.sans, fontSize:13, color:c.mute}}>
            <a>All essays</a><a>By author</a><a>By tag</a><a>Archive</a>
          </div>
        </div>
        <div>
          <div style={{fontFamily:bF.mono, fontSize:10, color:c.faint, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:14}}>Studio</div>
          <div style={{display:'flex', flexDirection:'column', gap:8, fontFamily:bF.sans, fontSize:13, color:c.mute}}>
            <a>Case studies</a><a>The team</a><a>Start a project</a><a>Press kit</a>
          </div>
        </div>
        <div>
          <div style={{fontFamily:bF.mono, fontSize:10, color:c.faint, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:14}}>Elsewhere</div>
          <div style={{display:'flex', flexDirection:'column', gap:8, fontFamily:bF.sans, fontSize:13, color:c.mute}}>
            <a>RSS feed</a><a>JSON feed</a><a>GitHub</a><a>Contact</a>
          </div>
        </div>
      </div>
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:24,
        borderTop:`1px solid ${c.line}`, fontFamily:bF.mono, fontSize:11, color:c.faint, letterSpacing:'.05em'
      }}>
        <span>© 2026 Bustamam Technology · Jakarta · New York · Lisbon</span>
        <span>Built with Astro. Typeset in Instrument Serif &amp; Space Grotesk.</span>
      </div>
    </footer>
  );
}

function DirectionBIndex({ theme: initialTheme }) {
  const [theme, setTheme] = React.useState(initialTheme);
  const [activeTag, setActiveTag] = React.useState('All');
  const [query, setQuery] = React.useState('');
  const c = B_PAL[theme];
  const filtered = POSTS.slice(1).filter(p =>
    (activeTag==='All' || p.tag===activeTag || p.kind===activeTag) &&
    (query==='' || p.title.toLowerCase().includes(query.toLowerCase()) || p.tag.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div style={{background:c.bg, color:c.ink, minHeight:'100%', fontFamily:bF.sans}}>
      <BHeader c={c} theme={theme} onToggle={()=>setTheme(theme==='light'?'dark':'light')} />
      <BHero c={c} />
      <BFeaturedRow c={c} post={POSTS[0]} />
      <BFilters c={c} activeTag={activeTag} setActiveTag={setActiveTag} query={query} setQuery={setQuery} />
      <div style={{padding:'28px 56px 16px', display:'grid', gridTemplateColumns:'60px 1.3fr 1fr 200px', gap:32, fontFamily:bF.mono, fontSize:10, color:c.faint, letterSpacing:'.15em', textTransform:'uppercase', borderBottom:`1px solid ${c.line}`}}>
        <span>Nº</span><span>Essay</span><span>Abstract</span><span style={{textAlign:'right'}}>Reading</span>
      </div>
      {filtered.map((p, i) => <BPostRow key={p.slug} c={c} post={p} n={i+2} />)}
      <BFooter c={c} />
    </div>
  );
}

// ── POST PAGE ────────────────────────────────────────────────
function BCodeBlock({ c, lang, code }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <figure style={{margin:'36px 0', background:c.surface, border:`1px solid ${c.line}`, borderRadius:6, overflow:'hidden'}}>
      <div style={{display:'flex', justifyContent:'space-between', padding:'10px 18px', borderBottom:`1px solid ${c.line}`, fontFamily:bF.mono, fontSize:10, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase'}}>
        <span>{lang}</span>
        <button onClick={()=>{setCopied(true);setTimeout(()=>setCopied(false),1200)}}
          style={{background:'transparent', border:'none', color:c.mute, cursor:'pointer', fontFamily:bF.mono, fontSize:10, letterSpacing:'.12em', textTransform:'uppercase'}}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{margin:0, padding:'22px 22px', fontFamily:bF.mono, fontSize:13, lineHeight:1.7, color:c.ink, overflow:'auto'}}>
        {code.split('\n').map((line, i) => {
          // simple highlighter
          const parts = line.split(/(\/\/.*$|"[^"]*"|'[^']*'|\b(?:func|return|if|else|for|package|import|type|struct|var|const|async|await|def|class|from|let|new)\b)/g).filter(Boolean);
          return (
            <div key={i} style={{display:'flex', gap:18}}>
              <span style={{color:c.faint, minWidth:20, textAlign:'right', userSelect:'none'}}>{i+1}</span>
              <span>
                {parts.map((seg, j) => {
                  if (/^\/\//.test(seg)) return <span key={j} style={{color:c.faint, fontStyle:'italic'}}>{seg}</span>;
                  if (/^["']/.test(seg)) return <span key={j} style={{color:c.accent}}>{seg}</span>;
                  if (/^(func|return|if|else|for|package|import|type|struct|var|const|async|await|def|class|from|let|new)$/.test(seg))
                    return <span key={j} style={{color:c.accent, fontWeight:600}}>{seg}</span>;
                  return <span key={j}>{seg}</span>;
                })}
              </span>
            </div>
          );
        })}
      </pre>
    </figure>
  );
}

function DirectionBPost({ theme: initialTheme }) {
  const [theme, setTheme] = React.useState(initialTheme);
  const c = B_PAL[theme];
  const post = POSTS[0];

  const code = `func acquire(ctx context.Context, key string) (Token, error) {
  token := newFencingToken()
  ok, err := redis.SetNX(ctx, key, token, 30*time.Second).Result()
  if err != nil { return 0, err }
  if !ok { return 0, ErrLocked }
  return token, nil
}`;

  return (
    <div style={{background:c.bg, color:c.ink, minHeight:'100%', fontFamily:bF.sans}}>
      <BHeader c={c} theme={theme} onToggle={()=>setTheme(theme==='light'?'dark':'light')} />

      {/* Hero */}
      <div style={{padding:'80px 56px 56px', borderBottom:`1px solid ${c.line}`}}>
        <div style={{maxWidth:1100, margin:'0 auto'}}>
          <div style={{display:'flex', gap:18, alignItems:'center', fontFamily:bF.mono, fontSize:11, color:c.mute, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:36}}>
            <a style={{color:c.mute}}>← Journal</a>
            <span style={{color:c.faint}}>/</span>
            <span style={{color:c.accent}}>Vol. 04 · Essay №09</span>
            <span style={{color:c.faint}}>/</span>
            <span>{post.tag}</span>
          </div>
          <h1 style={{
            fontFamily:bF.serif, fontWeight:400, fontSize:96, lineHeight:.95, margin:0,
            color:c.ink, letterSpacing:'-.03em', maxWidth:1000
          }}>
            {post.title}<span style={{color:c.accent}}>.</span>
          </h1>
          <p style={{
            marginTop:32, fontFamily:bF.serif, fontSize:28, lineHeight:1.35, color:c.mute,
            maxWidth:820, fontStyle:'italic', fontWeight:400
          }}>
            {post.dek}
          </p>

          <div style={{
            display:'flex', alignItems:'center', gap:24, marginTop:48, paddingTop:24,
            borderTop:`1px solid ${c.line}`,
          }}>
            <div style={{width:52, height:52, borderRadius:'50%', background:c.accent, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:bF.serif, fontSize:22, color:c.bg}}>
              A
            </div>
            <div>
              <div style={{fontFamily:bF.sans, fontSize:14, color:c.ink, fontWeight:500}}>{post.author}</div>
              <div style={{fontFamily:bF.mono, fontSize:11, color:c.mute, marginTop:3, letterSpacing:'.05em'}}>
                {fmtDate(post.date, {long:true}) } · {post.readMin} min · {post.words.toLocaleString()} words
              </div>
            </div>
            <div style={{marginLeft:'auto', display:'flex', gap:10, fontFamily:bF.sans, fontSize:13}}>
              <button style={{background:'transparent', border:`1px solid ${c.line}`, color:c.ink, padding:'8px 16px', borderRadius:999, cursor:'pointer'}}>↗ Share</button>
              <button style={{background:c.ink, border:'none', color:c.bg, padding:'8px 16px', borderRadius:999, cursor:'pointer'}}>✦ Save</button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{display:'grid', gridTemplateColumns:'240px 1fr 240px', gap:64, padding:'64px 56px 80px', maxWidth:1280, margin:'0 auto'}}>
        <aside style={{alignSelf:'start', position:'sticky', top:20}}>
          <div style={{fontFamily:bF.mono, fontSize:10, color:c.faint, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:16}}>
            Contents
          </div>
          <nav style={{display:'flex', flexDirection:'column', gap:10, fontFamily:bF.sans, fontSize:14}}>
            {POST_BODY.toc.map((t, i) => (
              <a key={t.id} style={{
                paddingLeft: t.depth === 2 ? 18 : 0,
                color: i === 2 ? c.ink : c.mute,
                fontWeight: i === 2 ? 500 : 400,
                borderLeft: i === 2 ? `2px solid ${c.accent}` : '2px solid transparent',
                padding: `3px 0 3px ${t.depth === 2 ? 18 : 10}px`,
                textDecoration:'none',
                fontSize: t.depth === 2 ? 13 : 14,
              }}>
                {t.label}
              </a>
            ))}
          </nav>
        </aside>

        <article style={{fontFamily:bF.serif, fontSize:21, lineHeight:1.6, color:c.ink, maxWidth:720}}>
          <p style={{margin:'0 0 24px', fontSize:24, lineHeight:1.5}}>
            <span style={{float:'left', fontFamily:bF.serif, fontSize:96, lineHeight:.8, fontWeight:400, padding:'8px 14px 0 0', color:c.accent}}>A</span>
            t 02:41 on a Tuesday, a duplicate webhook fired. Our scheduler held a
            Redis lock it had already lost — network partition, TTL expired, but the
            node still thought it was the leader. The downstream job ran twice. So did
            the charge.
          </p>
          <p style={{margin:'0 0 24px'}}>
            We'd written that lock ourselves, six years earlier, when the whole company
            fit into a single Postgres. It had outlived two CTOs and a rewrite of
            everything around it. Nobody wanted to touch it.
          </p>

          <h2 id="what-we-had" style={{fontFamily:bF.serif, fontSize:44, fontWeight:400, margin:'52px 0 18px', letterSpacing:'-.02em', lineHeight:1.05, color:c.ink}}>
            What we had
          </h2>
          <p style={{margin:'0 0 24px'}}>
            A <code style={{fontFamily:bF.mono, fontSize:'.85em', background:c.chip, padding:'2px 8px', borderRadius:3, color:c.accent}}>SETNX</code> with
            a timeout. That's it. No fencing, no heartbeats, no way to tell whether the
            lock you thought you held was still yours. Martin Kleppmann wrote the
            canonical takedown of this pattern in 2016 and we read it, dutifully, and
            filed it away.
          </p>

          <BCodeBlock c={c} lang="go · scheduler/lock.go" code={code} />

          <p style={{margin:'0 0 24px'}}>
            The failure mode is almost elegant: a GC pause on the leader is long enough
            that Redis evicts the key. Another worker <em style={{color:c.accent}}>legitimately</em> acquires
            the lock. The first worker wakes up, doesn't check, and proceeds as if nothing
            happened.
          </p>

          <blockquote style={{
            margin:'40px -12px', padding:'28px 32px',
            background:c.surface, borderRadius:6, border:`1px solid ${c.line}`,
            fontFamily:bF.serif, fontSize:28, fontStyle:'italic', color:c.ink, lineHeight:1.35,
          }}>
            "The lock is advisory. The fence is mandatory. If you can't enforce the fence
            at the storage layer, you don't have a lock — you have a suggestion."
            <div style={{fontFamily:bF.mono, fontStyle:'normal', fontSize:11, color:c.mute, marginTop:16, letterSpacing:'.1em', textTransform:'uppercase'}}>
              — Internal handbook · §4.2
            </div>
          </blockquote>

          <h2 id="what-broke" style={{fontFamily:bF.serif, fontSize:44, fontWeight:400, margin:'52px 0 18px', letterSpacing:'-.02em', lineHeight:1.05, color:c.ink}}>
            What broke anyway
          </h2>
          <p style={{margin:'0 0 24px'}}>
            Three things. First, an old cron job on a forgotten box still used the old
            lock API and we didn't find it for eleven days. Second, our token counter
            lived in Redis — same Redis — which meant a Redis failover could reset it.
            We moved it to Postgres and accepted the 2ms.
          </p>
          <p style={{margin:'0 0 24px'}}>
            The migration took nine weeks. The real work took three. The rest was
            archaeology.
          </p>
        </article>

        <aside style={{alignSelf:'start', position:'sticky', top:20}}>
          <div style={{padding:'20px 20px', background:c.surface, borderRadius:6, border:`1px solid ${c.line}`, marginBottom:16}}>
            <div style={{fontFamily:bF.mono, fontSize:10, color:c.faint, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:14}}>Metrics · before → after</div>
            {[
              ['Duplicate events / wk', '~14', '0'],
              ['Page-outs / mo', '3.2', '0'],
              ['p99 acquire', '48 ms', '52 ms'],
              ['LOC touched', '—', '1,840'],
            ].map((r, i) => (
              <div key={i} style={{display:'grid', gridTemplateColumns:'1fr auto auto', gap:10, padding:'10px 0', borderBottom: i<3?`1px solid ${c.lineSoft}`:'none', fontFamily:bF.sans, fontSize:12}}>
                <span style={{color:c.mute}}>{r[0]}</span>
                <span style={{color:c.faint, textDecoration:'line-through'}}>{r[1]}</span>
                <span style={{color:c.accent, fontWeight:500}}>{r[2]}</span>
              </div>
            ))}
          </div>
          <div style={{padding:'20px', background:c.accentBg, borderRadius:6}}>
            <div style={{fontFamily:bF.mono, fontSize:10, color:c.accent, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:10}}>✦ Further reading</div>
            <div style={{fontFamily:bF.serif, fontSize:16, color:c.ink, lineHeight:1.4}}>
              Kleppmann — <em>How to do distributed locking</em>, 2016. Still the correct
              reading list for shipping this pattern.
            </div>
          </div>
        </aside>
      </div>

      {/* Related */}
      <div style={{padding:'64px 56px', borderTop:`1px solid ${c.line}`, background:c.surface}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:32}}>
          <h3 style={{fontFamily:bF.serif, fontSize:40, fontWeight:400, margin:0, color:c.ink, letterSpacing:'-.02em'}}>
            Continue reading
          </h3>
          <a style={{fontFamily:bF.sans, fontSize:13, color:c.accent, fontWeight:500}}>All essays →</a>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:32}}>
          {POSTS.slice(1,4).map((p, i) => (
            <a key={p.slug} style={{display:'block', cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between', fontFamily:bF.mono, fontSize:10, color:c.faint, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${c.line}`}}>
                <span style={{color:c.accent}}>{p.tag}</span>
                <span>{p.readMin} min</span>
              </div>
              <h4 style={{margin:0, fontFamily:bF.serif, fontSize:26, fontWeight:400, color:c.ink, letterSpacing:'-.015em', lineHeight:1.15}}>
                {p.title}
              </h4>
              <p style={{margin:'14px 0 0', fontFamily:bF.sans, fontSize:13, color:c.mute, lineHeight:1.55}}>
                {p.dek.slice(0, 120)}…
              </p>
              <div style={{marginTop:18, fontFamily:bF.mono, fontSize:11, color:c.faint}}>
                {p.author} · {fmtDate(p.date)}
              </div>
            </a>
          ))}
        </div>
      </div>

      <BFooter c={c} />
    </div>
  );
}

Object.assign(window, { DirectionBIndex, DirectionBPost });
