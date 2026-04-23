// Direction A — "Terminal Sharp"
// Deep slate / off-white, monospace accents (JetBrains Mono), serif long-form (Newsreader),
// evergreen/lime accent. Terminal-inspired chrome.

const A_PAL = {
  light: {
    bg:'#f4f3ee', surface:'#ffffff', ink:'#0e1116', mute:'#5a5f68', faint:'#8a8f98',
    line:'#d9d7cf', lineSoft:'#e6e4dd', accent:'#2f6b2f', accentBg:'#e0ecd9', accentInk:'#1a3d1a',
    code:'#f0eee4', danger:'#b4432b', kbd:'#eeece4', hl:'#fff4c8',
  },
  dark: {
    bg:'#0b0d10', surface:'#12161b', ink:'#e8e6df', mute:'#8a8f98', faint:'#5a5f68',
    line:'#1e242c', lineSoft:'#161a20', accent:'#9eff5a', accentBg:'#1a2410', accentInk:'#c8ff90',
    code:'#0e1116', danger:'#ff6b4a', kbd:'#1a1f26', hl:'#3a3310',
  }
};
const aF = {
  sans:"'Geist',-apple-system,system-ui,sans-serif",
  mono:"'JetBrains Mono',ui-monospace,Menlo,monospace",
  serif:"'Newsreader','Iowan Old Style',Georgia,serif",
};

function AChrome({ c, theme, onToggle, path='/' }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', height:36, borderBottom:`1px solid ${c.line}`, background:c.surface,
      fontFamily:aF.mono, fontSize:11, color:c.mute, letterSpacing:'.02em',
    }}>
      <div style={{display:'flex', alignItems:'center', gap:6, padding:'0 14px', borderRight:`1px solid ${c.line}`, height:'100%'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:c.danger}} />
        <span style={{width:8,height:8,borderRadius:'50%',background:c.faint}} />
        <span style={{width:8,height:8,borderRadius:'50%',background:c.accent}} />
      </div>
      <div style={{padding:'0 14px', borderRight:`1px solid ${c.line}`, height:'100%', display:'flex', alignItems:'center', color:c.ink}}>
        ~/bustamam/blog{path}
      </div>
      <div style={{flex:1}} />
      <div style={{padding:'0 14px', borderLeft:`1px solid ${c.line}`, height:'100%', display:'flex', alignItems:'center', gap:10}}>
        <span>UTC 14:32</span><span style={{color:c.faint}}>·</span>
        <button onClick={onToggle} style={{
          background:'transparent', border:`1px solid ${c.line}`, color:c.ink, cursor:'pointer',
          fontFamily:aF.mono, fontSize:10, padding:'3px 8px', borderRadius:2, letterSpacing:'.05em', textTransform:'uppercase'
        }}>{theme==='dark'?'☀ light':'☾ dark'}</button>
      </div>
    </div>
  );
}

function AHeader({ c }) {
  return (
    <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 48px', borderBottom:`1px solid ${c.line}`, background:c.bg}}>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <BustamamMark size={22} color={c.ink} weight={1.6} />
        <div style={{fontFamily:aF.mono, fontSize:13, color:c.ink, fontWeight:500}}>
          bustamam<span style={{color:c.accent}}>.</span>technology
        </div>
        <div style={{height:14, width:1, background:c.line, margin:'0 6px'}} />
        <div style={{fontFamily:aF.mono, fontSize:11, color:c.mute, letterSpacing:'.02em'}}>/engineering-journal</div>
      </div>
      <nav style={{display:'flex', alignItems:'center', gap:28, fontFamily:aF.mono, fontSize:12, color:c.mute}}>
        <a style={{color:c.ink, textDecoration:'none'}}>writing</a>
        <a style={{color:c.mute, textDecoration:'none'}}>work</a>
        <a style={{color:c.mute, textDecoration:'none'}}>people</a>
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

function AHero({ c }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const i = setInterval(() => setTick(t => t+1), 1800);
    return () => clearInterval(i);
  }, []);
  const lines = [
    { t:'BOOT', m:'bustamam.technology · independent consultant · california' },
    { t:'IDX',  m:'engineering journal · since 2019' },
    { t:'NEW',  m:POSTS[0].title.toLowerCase() },
    { t:'TAIL', m:'streaming new writing as i publish...' },
  ];
  return (
    <section style={{padding:'56px 48px 44px', borderBottom:`1px solid ${c.line}`, display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:64, alignItems:'end'}}>
      <div>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8, padding:'4px 10px',
          background:c.accentBg, color:c.accentInk, borderRadius:2,
          fontFamily:aF.mono, fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:28,
        }}>
          <span style={{width:6, height:6, borderRadius:'50%', background:c.accent}} />
          engineering journal · vol 04
        </div>
        <h1 style={{fontFamily:aF.serif, fontWeight:500, fontSize:62, lineHeight:.98, margin:0, color:c.ink, letterSpacing:'-.025em'}}>
          We build software<br/>
          that doesn't <em style={{fontStyle:'italic', color:c.accent, fontWeight:500}}>page you</em><br/>
          on a Sunday.
        </h1>
        <p style={{marginTop:24, maxWidth:480, fontFamily:aF.serif, fontSize:17, lineHeight:1.55, color:c.mute}}>
          Long-form writing from the engineers at Bustamam Technology — distributed systems
          teardowns, honest retrospectives from client engagements, and essays on the craft
          of shipping software that lasts.
        </p>
      </div>

      <div style={{background:c.code, border:`1px solid ${c.line}`, borderRadius:4, fontFamily:aF.mono, fontSize:12, overflow:'hidden'}}>
        <div style={{padding:'8px 14px', borderBottom:`1px solid ${c.line}`, display:'flex', justifyContent:'space-between', color:c.faint, fontSize:10, letterSpacing:'.08em', textTransform:'uppercase'}}>
          <span>tail -f ~/blog/feed.log</span><span>● live</span>
        </div>
        <div style={{padding:'18px 16px 20px'}}>
          {lines.map((l, i) => (
            <div key={i} style={{display:'flex', gap:10, marginBottom:10, color:c.mute}}>
              <span style={{color:c.faint}}>
                {new Date(Date.now() - (lines.length-i)*2000 - tick*200).toISOString().slice(11,19)}
              </span>
              <span style={{color: l.t==='NEW' ? c.accent : c.ink, fontWeight: l.t==='NEW' ? 600 : 400}}>[{l.t}]</span>
              <span style={{color: l.t==='NEW' ? c.ink : c.mute}}>{l.m}</span>
            </div>
          ))}
          <div style={{display:'flex', gap:10, marginTop:12, color:c.ink}}>
            <span style={{color:c.accent}}>$</span>
            <span>read latest<span style={{display:'inline-block', width:7, height:14, background:c.accent, marginLeft:4, verticalAlign:'middle', animation:'ablink 1s step-end infinite'}}/></span>
          </div>
          <style>{`@keyframes ablink{50%{opacity:0}}`}</style>
        </div>
        <div style={{padding:'10px 14px', borderTop:`1px solid ${c.line}`, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, fontSize:10, color:c.faint, letterSpacing:'.06em', textTransform:'uppercase'}}>
          <div><div style={{color:c.ink, fontSize:14, fontFamily:aF.mono, letterSpacing:0, marginBottom:2}}>{POSTS.length}</div>essays</div>
          <div><div style={{color:c.ink, fontSize:14, fontFamily:aF.mono, letterSpacing:0, marginBottom:2}}>{POSTS.reduce((s,p)=>s+p.readMin,0)}m</div>reading</div>
          <div><div style={{color:c.ink, fontSize:14, fontFamily:aF.mono, letterSpacing:0, marginBottom:2}}>2019</div>since</div>
        </div>
      </div>
    </section>
  );
}

function AFilters({ c, activeTag, setActiveTag, query, setQuery }) {
  return (
    <div style={{padding:'20px 48px', borderBottom:`1px solid ${c.line}`, background:c.bg, display:'flex', alignItems:'center', gap:20, flexWrap:'wrap'}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:'6px 10px', border:`1px solid ${c.line}`, borderRadius:2, background:c.surface, minWidth:260}}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{color:c.mute}}>
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="grep titles, authors, tags..."
          style={{border:'none', outline:'none', background:'transparent', flex:1, fontFamily:aF.mono, fontSize:12, color:c.ink}} />
        <span style={{fontFamily:aF.mono, fontSize:10, padding:'2px 6px', background:c.kbd, color:c.mute, borderRadius:2}}>/</span>
      </div>
      <div style={{height:18, width:1, background:c.line}} />
      <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
        {TAGS.map(t => {
          const on = t.name === activeTag;
          return (
            <button key={t.name} onClick={()=>setActiveTag(t.name)} style={{
              fontFamily:aF.mono, fontSize:11, letterSpacing:'.02em', padding:'5px 10px', borderRadius:2, cursor:'pointer',
              border:`1px solid ${on ? c.ink : c.line}`, background: on ? c.ink : 'transparent', color: on ? c.bg : c.mute,
            }}>
              {t.name.toLowerCase()}<span style={{opacity:.55, marginLeft:4}}>{t.count}</span>
            </button>
          );
        })}
      </div>
      <div style={{marginLeft:'auto', fontFamily:aF.mono, fontSize:11, color:c.faint}}>
        sort: <span style={{color:c.ink}}>recent ↓</span>
      </div>
    </div>
  );
}

function APostRow({ c, post, n, active }) {
  return (
    <article style={{
      display:'grid', gridTemplateColumns:'56px 120px 1fr 160px 100px', gap:20, alignItems:'baseline',
      padding:'22px 48px', borderBottom:`1px solid ${c.lineSoft}`,
      background: active ? c.surface : 'transparent', cursor:'pointer',
    }}>
      <div style={{fontFamily:aF.mono, fontSize:11, color:c.faint, letterSpacing:'.05em'}}>{String(n).padStart(3,'0')}</div>
      <div style={{fontFamily:aF.mono, fontSize:11, color:c.mute}}>{fmtDate(post.date)}</div>
      <div>
        <h3 style={{margin:0, fontFamily:aF.serif, fontSize:22, lineHeight:1.15, fontWeight:500, color:c.ink, letterSpacing:'-.01em'}}>
          {post.title}
        </h3>
        <p style={{margin:'6px 0 0', fontFamily:aF.serif, fontSize:14, lineHeight:1.5, color:c.mute, maxWidth:620}}>
          {post.dek}
        </p>
      </div>
      <div style={{fontFamily:aF.mono, fontSize:11, color:c.mute, display:'flex', flexDirection:'column', gap:4}}>
        <span style={{alignSelf:'flex-start', padding:'2px 7px', border:`1px solid ${c.line}`, color:c.ink, borderRadius:2, letterSpacing:'.04em', fontSize:10, textTransform:'uppercase'}}>
          {post.tag}
        </span>
        <span style={{color:c.faint}}>rasheed@bt</span>
      </div>
      <div style={{fontFamily:aF.mono, fontSize:11, color:c.mute, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, textAlign:'right'}}>
        <span style={{color:c.ink}}>{post.readMin} min</span>
        <span style={{color:c.faint}}>{post.words.toLocaleString()} w</span>
      </div>
    </article>
  );
}

function AFooter({ c }) {
  return (
    <footer style={{padding:'28px 48px', borderTop:`1px solid ${c.line}`, background:c.surface, display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:aF.mono, fontSize:11, color:c.mute}}>
      <div style={{display:'flex', gap:20}}>
        <span>© 2026 bustamam.technology</span>
        <a style={{color:c.mute}}>rss</a>
        <a style={{color:c.mute}}>json feed</a>
        <a style={{color:c.mute}}>sitemap</a>
      </div>
      <div style={{display:'flex', gap:20, alignItems:'center'}}>
        <span style={{color:c.faint}}>built with astro · one-person consultancy</span>
        <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:c.accent}} />
          all systems nominal
        </span>
      </div>
    </footer>
  );
}

function DirectionAIndex({ theme: initialTheme }) {
  const [theme, setTheme] = React.useState(initialTheme);
  const [activeTag, setActiveTag] = React.useState('All');
  const [query, setQuery] = React.useState('');
  const c = A_PAL[theme];
  const filtered = POSTS.filter(p =>
    (activeTag==='All' || p.tag===activeTag || p.kind===activeTag) &&
    (query==='' || p.title.toLowerCase().includes(query.toLowerCase()) || p.tag.toLowerCase().includes(query.toLowerCase()))
  );
  return (
    <div style={{background:c.bg, color:c.ink, minHeight:'100%', fontFamily:aF.sans}}>
      <AChrome c={c} theme={theme} onToggle={()=>setTheme(theme==='light'?'dark':'light')} path="/writing" />
      <AHeader c={c} />
      <AHero c={c} />
      <AFilters c={c} activeTag={activeTag} setActiveTag={setActiveTag} query={query} setQuery={setQuery} />
      <div style={{display:'grid', gridTemplateColumns:'56px 120px 1fr 160px 100px', gap:20, padding:'14px 48px', borderBottom:`1px solid ${c.line}`, fontFamily:aF.mono, fontSize:10, color:c.faint, letterSpacing:'.1em', textTransform:'uppercase'}}>
        <div>№</div><div>date</div><div>title · dek</div><div>tag · author</div><div style={{textAlign:'right'}}>length</div>
      </div>
      {filtered.map((p, i) => <APostRow key={p.slug} c={c} post={p} n={i+1} active={i===0} />)}
      <AFooter c={c} />
    </div>
  );
}

// ── POST PAGE ────────────────────────────────────────────────
function ACodeBlock({ c, lang, code }) {
  const [copied, setCopied] = React.useState(false);
  const tokenize = (line) => {
    // very lightweight highlighter just for demo
    const parts = [];
    const kw = /\b(func|return|if|else|for|package|import|type|struct|var|const|async|await|def|class|from)\b/g;
    const str = /"[^"]*"|'[^']*'|`[^`]*`/g;
    const com = /\/\/.*$/g;
    let rest = line;
    // simple: split on regex matches one at a time
    return line.split(/(\/\/.*$|"[^"]*"|'[^']*'|`[^`]*`|\b(?:func|return|if|else|for|package|import|type|struct|var|const|async|await|def|class|from)\b)/g)
      .filter(Boolean)
      .map((seg, i) => {
        if (!seg) return null;
        if (/^\/\//.test(seg)) return <span key={i} style={{color:c.faint, fontStyle:'italic'}}>{seg}</span>;
        if (/^["'`]/.test(seg)) return <span key={i} style={{color:c.accent}}>{seg}</span>;
        if (/^(func|return|if|else|for|package|import|type|struct|var|const|async|await|def|class|from)$/.test(seg))
          return <span key={i} style={{color:c.accent, fontWeight:600}}>{seg}</span>;
        return <span key={i}>{seg}</span>;
      });
  };
  return (
    <div style={{margin:'28px 0', background:c.code, border:`1px solid ${c.line}`, borderRadius:4, overflow:'hidden', fontFamily:aF.mono, fontSize:13}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:`1px solid ${c.line}`, fontSize:10, color:c.faint, letterSpacing:'.08em', textTransform:'uppercase'}}>
        <span>{lang}</span>
        <button onClick={()=>{setCopied(true);setTimeout(()=>setCopied(false),1200)}}
          style={{background:'transparent', border:`1px solid ${c.line}`, color:c.mute, cursor:'pointer', fontFamily:aF.mono, fontSize:10, padding:'2px 8px', borderRadius:2, letterSpacing:'.05em', textTransform:'uppercase'}}>
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre style={{margin:0, padding:'16px 18px', color:c.ink, lineHeight:1.65, overflow:'auto'}}>
        {code.split('\n').map((line, i) => (
          <div key={i} style={{display:'flex', gap:16}}>
            <span style={{color:c.faint, userSelect:'none', minWidth:18, textAlign:'right'}}>{i+1}</span>
            <span>{tokenize(line)}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function DirectionAPost({ theme: initialTheme }) {
  const [theme, setTheme] = React.useState(initialTheme);
  const c = A_PAL[theme];
  const post = POSTS[0]; // "Distributed locks without tears"

  const goCode = `func acquire(ctx context.Context, key string) (Token, error) {
  token := newFencingToken()
  ok, err := redis.SetNX(ctx, key, token, 30*time.Second).Result()
  if err != nil { return 0, err }
  if !ok { return 0, ErrLocked }
  return token, nil
}`;

  return (
    <div style={{background:c.bg, color:c.ink, minHeight:'100%', fontFamily:aF.sans}}>
      <AChrome c={c} theme={theme} onToggle={()=>setTheme(theme==='light'?'dark':'light')} path={`/writing/${post.slug}`} />
      <AHeader c={c} />

      {/* Title block */}
      <div style={{padding:'72px 48px 48px', borderBottom:`1px solid ${c.line}`, maxWidth:1280, margin:'0 auto'}}>
        <div style={{display:'flex', gap:14, fontFamily:aF.mono, fontSize:11, color:c.mute, letterSpacing:'.04em', marginBottom:28}}>
          <a style={{color:c.mute}}>← /writing</a>
          <span style={{color:c.faint}}>/</span>
          <span style={{color:c.accentInk, background:c.accentBg, padding:'2px 8px', borderRadius:2}}>{post.tag.toLowerCase()}</span>
          <span style={{color:c.faint}}>/</span>
          <span>{fmtDate(post.date)}</span>
          <span style={{color:c.faint}}>/</span>
          <span>{post.readMin} min read · {post.words.toLocaleString()} words</span>
        </div>
        <h1 style={{fontFamily:aF.serif, fontWeight:500, fontSize:68, lineHeight:1.0, margin:0, letterSpacing:'-.025em', color:c.ink, maxWidth:900}}>
          {post.title}.
        </h1>
        <p style={{fontFamily:aF.serif, fontSize:22, lineHeight:1.4, color:c.mute, margin:'24px 0 0', maxWidth:760}}>
          {post.dek}
        </p>

        {/* Author strip */}
        <div style={{marginTop:40, display:'flex', alignItems:'center', gap:14, paddingTop:24, borderTop:`1px solid ${c.lineSoft}`}}>
          <div style={{width:40, height:40, borderRadius:'50%', background:`linear-gradient(135deg, ${c.accent}, ${c.ink})`, display:'flex', alignItems:'center', justifyContent:'center', color:c.bg, fontFamily:aF.mono, fontWeight:600, fontSize:14}}>
            AB
          </div>
          <div>
            <div style={{fontFamily:aF.mono, fontSize:12, color:c.ink, fontWeight:500}}>{post.author}</div>
            <div style={{fontFamily:aF.mono, fontSize:11, color:c.faint, marginTop:2}}>independent consultant · writing since 2019</div>
          </div>
          <div style={{marginLeft:'auto', display:'flex', gap:10, fontFamily:aF.mono, fontSize:11, color:c.mute}}>
            <button style={{background:'transparent', border:`1px solid ${c.line}`, color:c.ink, padding:'6px 12px', borderRadius:2, cursor:'pointer', fontFamily:aF.mono, fontSize:11}}>↗ share</button>
            <button style={{background:c.ink, border:`1px solid ${c.ink}`, color:c.bg, padding:'6px 12px', borderRadius:2, cursor:'pointer', fontFamily:aF.mono, fontSize:11}}>✶ save</button>
          </div>
        </div>
      </div>

      {/* Body with sticky TOC */}
      <div style={{display:'grid', gridTemplateColumns:'220px 1fr 220px', gap:56, padding:'56px 48px 64px', maxWidth:1280, margin:'0 auto'}}>
        {/* TOC */}
        <aside style={{alignSelf:'start', position:'sticky', top:20}}>
          <div style={{fontFamily:aF.mono, fontSize:10, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:14}}>
            § contents
          </div>
          <nav style={{display:'flex', flexDirection:'column', gap:8, fontFamily:aF.mono, fontSize:12}}>
            {POST_BODY.toc.map((t, i) => (
              <a key={t.id} style={{
                paddingLeft: t.depth === 2 ? 14 : 0,
                color: i === 2 ? c.ink : c.mute,
                borderLeft: i === 2 ? `2px solid ${c.accent}` : `2px solid transparent`,
                paddingLeftInner: t.depth === 2 ? 14 : 8,
                padding: `2px 0 2px ${t.depth === 2 ? 14 : 10}px`,
                textDecoration:'none',
              }}>
                {t.label}
              </a>
            ))}
          </nav>
          <div style={{marginTop:32, padding:'14px 14px', border:`1px solid ${c.line}`, borderRadius:3, background:c.surface}}>
            <div style={{fontFamily:aF.mono, fontSize:10, color:c.faint, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8}}>progress</div>
            <div style={{height:3, background:c.lineSoft, borderRadius:2, overflow:'hidden'}}>
              <div style={{width:'38%', height:'100%', background:c.accent}} />
            </div>
            <div style={{fontFamily:aF.mono, fontSize:10, color:c.mute, marginTop:8}}>5 min remaining</div>
          </div>
        </aside>

        {/* Prose */}
        <article style={{fontFamily:aF.serif, fontSize:18, lineHeight:1.65, color:c.ink, maxWidth:680}}>
          <p style={{margin:'0 0 20px', fontSize:22, lineHeight:1.45, color:c.ink}}>
            <span style={{
              float:'left', fontFamily:aF.serif, fontSize:72, lineHeight:.85, fontWeight:500,
              padding:'6px 10px 0 0', color:c.accent
            }}>A</span>
            t 02:41 on a Tuesday, a duplicate webhook fired. Our scheduler held a
            Redis lock it had already lost — network partition, TTL expired, but the
            node still thought it was the leader. The downstream job ran twice. So did
            the charge.
          </p>
          <p style={{margin:'0 0 20px'}}>
            We'd written that lock ourselves, six years earlier, when the whole company
            fit into a single Postgres. It had outlived two CTOs and a rewrite of
            everything around it. Nobody wanted to touch it. This is the story of how we
            finally did.
          </p>

          <h2 id="what-we-had" style={{fontFamily:aF.serif, fontSize:30, fontWeight:500, margin:'44px 0 14px', letterSpacing:'-.015em', lineHeight:1.15, color:c.ink}}>
            What we had
          </h2>
          <p style={{margin:'0 0 20px'}}>
            A <code style={{fontFamily:aF.mono, fontSize:'.85em', background:c.code, padding:'1px 6px', borderRadius:2, color:c.accentInk}}>SETNX</code> with
            a timeout. That's it. No fencing, no heartbeats, no way to tell whether the
            lock you thought you held was still yours. Martin Kleppmann wrote the
            canonical takedown of this pattern in 2016 and we read it, dutifully, and
            filed it away.
          </p>

          <ACodeBlock c={c} lang="go · scheduler/lock.go" code={goCode} />

          <p style={{margin:'0 0 20px'}}>
            The failure mode is almost elegant: a GC pause on the leader is long enough
            that Redis evicts the key. Another worker <em>legitimately</em> acquires the
            lock. The first worker wakes up, doesn't check, and proceeds as if nothing
            happened. Two workers, one critical section, zero errors in the logs.
          </p>

          <h2 id="fencing-tokens" style={{fontFamily:aF.serif, fontSize:26, fontWeight:500, margin:'36px 0 12px', letterSpacing:'-.015em', lineHeight:1.2, color:c.ink}}>
            Fencing tokens, briefly
          </h2>
          <p style={{margin:'0 0 20px'}}>
            A fencing token is a monotonically increasing number the lock service hands
            you on acquire. You pass it to every downstream operation. The downstream
            rejects any write whose token is lower than the last one it saw. If your
            lock was stolen, your writes fail loud instead of silent.
          </p>

          <blockquote style={{margin:'28px 0', padding:'16px 22px', borderLeft:`2px solid ${c.accent}`, fontFamily:aF.serif, fontSize:19, fontStyle:'italic', color:c.ink, background:c.surface}}>
            "The lock is advisory. The fence is mandatory. If you can't enforce the fence
            at the storage layer, you don't have a lock — you have a suggestion."
            <div style={{fontFamily:aF.mono, fontStyle:'normal', fontSize:11, color:c.faint, marginTop:10, letterSpacing:'.04em'}}>
              — from our internal distributed-systems handbook, §4.2
            </div>
          </blockquote>

          <h2 id="what-broke" style={{fontFamily:aF.serif, fontSize:30, fontWeight:500, margin:'44px 0 14px', letterSpacing:'-.015em', lineHeight:1.15, color:c.ink}}>
            What broke anyway
          </h2>
          <p style={{margin:'0 0 20px'}}>
            Three things. First, an old cron job on a forgotten box still used the old
            lock API and we didn't find it for eleven days. Second, our token counter
            lived in Redis — same Redis — which meant a Redis failover could reset it.
            We moved it to Postgres and accepted the 2ms. Third, one of our downstreams
            stored the last-seen token in memory. You can guess the rest.
          </p>
          <p style={{margin:'0 0 20px'}}>
            The migration took nine weeks. The real work took three. The rest was
            archaeology.
          </p>
        </article>

        {/* Margin notes */}
        <aside style={{alignSelf:'start', position:'sticky', top:20, fontFamily:aF.mono, fontSize:11, color:c.mute}}>
          <div style={{padding:'14px', background:c.surface, border:`1px solid ${c.line}`, borderRadius:3, marginBottom:14}}>
            <div style={{fontSize:10, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:10}}>§ footnote 01</div>
            <div style={{lineHeight:1.55, color:c.mute}}>
              Kleppmann's original post is "How to do distributed locking" — still the
              correct reading list for anyone shipping this pattern.
            </div>
          </div>
          <div style={{padding:'14px', background:c.surface, border:`1px solid ${c.line}`, borderRadius:3, marginBottom:14}}>
            <div style={{fontSize:10, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:10}}>§ metrics · before</div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}><span>dup events/wk</span><span style={{color:c.danger}}>~14</span></div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}><span>page-outs/mo</span><span style={{color:c.danger}}>3.2</span></div>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>p99 acquire</span><span>48ms</span></div>
          </div>
          <div style={{padding:'14px', background:c.surface, border:`1px solid ${c.line}`, borderRadius:3}}>
            <div style={{fontSize:10, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:10}}>§ metrics · after</div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}><span>dup events/wk</span><span style={{color:c.accent}}>0</span></div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}><span>page-outs/mo</span><span style={{color:c.accent}}>0</span></div>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>p99 acquire</span><span>52ms</span></div>
          </div>
        </aside>
      </div>

      {/* Related posts */}
      <div style={{padding:'48px 48px', borderTop:`1px solid ${c.line}`, background:c.surface}}>
        <div style={{fontFamily:aF.mono, fontSize:10, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:20}}>
          ↳ related writing
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24}}>
          {POSTS.slice(1,4).map((p, i) => (
            <a key={p.slug} style={{display:'block', padding:'20px 20px 22px', border:`1px solid ${c.line}`, borderRadius:3, background:c.bg, cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between', fontFamily:aF.mono, fontSize:10, color:c.faint, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:14}}>
                <span>{p.tag.toLowerCase()}</span>
                <span>{p.readMin} min</span>
              </div>
              <h4 style={{margin:0, fontFamily:aF.serif, fontSize:20, fontWeight:500, color:c.ink, letterSpacing:'-.01em', lineHeight:1.2}}>
                {p.title}
              </h4>
              <p style={{margin:'10px 0 0', fontFamily:aF.serif, fontSize:14, color:c.mute, lineHeight:1.5}}>
                {p.dek.slice(0, 110)}…
              </p>
            </a>
          ))}
        </div>
      </div>

      <AFooter c={c} />
    </div>
  );
}

Object.assign(window, { DirectionAIndex, DirectionAPost });
