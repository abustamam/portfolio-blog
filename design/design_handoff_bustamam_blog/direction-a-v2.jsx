// Direction A v2 — Terminal Sharp, polished for a solo consultancy.
// Refinements over v1:
//  - Hero owns the fact that this is a one-person practice (availability chip, signature)
//  - Sharper column hierarchy on the post list (less visual noise, more reading rhythm)
//  - Author "now" footer card ("what I'm working on this week")
//  - Typographic polish: tighter tracking, better vertical rhythm, optical aligned numerals
//  - Electric accent used more sparingly \u2014 as a punctuation color, not a wash

const A2_PAL = {
  light: {
    bg:'#f5f4ef', surface:'#ffffff', ink:'#0c0f14', mute:'#565c66', faint:'#8a8f98',
    line:'#dcdad2', lineSoft:'#e8e6dd', accent:'#1f6f43', accentBg:'#dbeadf', accentInk:'#0f3f23',
    code:'#f1efe6', danger:'#b4432b', kbd:'#edebe3',
  },
  dark: {
    bg:'#0a0c10', surface:'#10141a', ink:'#eceae3', mute:'#8a8f98', faint:'#5a5f68',
    line:'#1c2129', lineSoft:'#141820', accent:'#8cff5c', accentBg:'#172010', accentInk:'#b8ff8a',
    code:'#0d1016', danger:'#ff6b4a', kbd:'#181c24',
  }
};

const a2F = {
  sans:"'Geist',-apple-system,system-ui,sans-serif",
  mono:"'JetBrains Mono',ui-monospace,Menlo,monospace",
  serif:"'Newsreader','Iowan Old Style',Georgia,serif",
};

// ── chrome ────────────────────────────────────────────────────
function A2Chrome({ c, theme, onToggle, path='/' }) {
  return (
    <div style={{display:'flex', alignItems:'center', height:34, borderBottom:`1px solid ${c.line}`, background:c.surface, fontFamily:a2F.mono, fontSize:11, color:c.mute}}>
      <div style={{display:'flex', alignItems:'center', gap:6, padding:'0 14px', borderRight:`1px solid ${c.line}`, height:'100%'}}>
        <span style={{width:7,height:7,borderRadius:'50%',background:c.danger}} />
        <span style={{width:7,height:7,borderRadius:'50%',background:c.faint}} />
        <span style={{width:7,height:7,borderRadius:'50%',background:c.accent}} />
      </div>
      <div style={{padding:'0 14px', borderRight:`1px solid ${c.line}`, height:'100%', display:'flex', alignItems:'center', color:c.ink, letterSpacing:'-.01em'}}>
        rasheed@bustamam <span style={{color:c.faint, margin:'0 6px'}}>·</span> ~/journal{path}
      </div>
      <div style={{flex:1}} />
      <div style={{padding:'0 14px', borderLeft:`1px solid ${c.line}`, height:'100%', display:'flex', alignItems:'center', gap:12}}>
        <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:c.accent}} />
          <span style={{color:c.ink}}>available · Q3</span>
        </span>
        <span style={{color:c.faint}}>·</span>
        <button onClick={onToggle} style={{background:'transparent', border:`1px solid ${c.line}`, color:c.ink, cursor:'pointer', fontFamily:a2F.mono, fontSize:10, padding:'3px 8px', borderRadius:2, letterSpacing:'.05em', textTransform:'uppercase'}}>
          {theme==='dark'?'☀ light':'☾ dark'}
        </button>
      </div>
    </div>
  );
}

function A2Header({ c }) {
  return (
    <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 56px', borderBottom:`1px solid ${c.line}`, background:c.bg}}>
      <div style={{display:'flex', alignItems:'center', gap:14}}>
        <BustamamMark size={22} color={c.ink} weight={1.6} />
        <div style={{fontFamily:a2F.mono, fontSize:13, color:c.ink, fontWeight:500, letterSpacing:'-.01em'}}>
          bustamam<span style={{color:c.accent}}>.</span>technology
        </div>
        <div style={{height:14, width:1, background:c.line, margin:'0 4px'}} />
        <div style={{fontFamily:a2F.mono, fontSize:11, color:c.mute}}>/journal</div>
      </div>
      <nav style={{display:'flex', alignItems:'center', gap:28, fontFamily:a2F.mono, fontSize:12, color:c.mute}}>
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

// Animated terminal hero — now focused on single-practitioner signal
function A2Hero({ c }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { const i = setInterval(() => setTick(t => t+1), 1800); return () => clearInterval(i); }, []);

  const lines = [
    { t:'WHO ', m:'rasheed bustamam · independent consultant · california' },
    { t:'IDX ', m:'engineering journal · since 2019' },
    { t:'NEW ', m:POSTS[0].title.toLowerCase() },
    { t:'OPEN', m:'taking on new engagements for q3 2026' },
  ];

  return (
    <section style={{padding:'64px 56px 52px', borderBottom:`1px solid ${c.line}`, display:'grid', gridTemplateColumns:'1.15fr 1fr', gap:72, alignItems:'end'}}>
      <div>
        <div style={{display:'inline-flex', alignItems:'center', gap:10, padding:'5px 12px', background:c.accentBg, color:c.accentInk, borderRadius:2, fontFamily:a2F.mono, fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:32}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:c.accent}} />
          journal · vol 04 · spring 2026
        </div>
        <h1 style={{fontFamily:a2F.serif, fontWeight:500, fontSize:68, lineHeight:.96, margin:0, color:c.ink, letterSpacing:'-.028em'}}>
          I build software<br/>
          that doesn't <em style={{fontStyle:'italic', color:c.accent, fontWeight:500}}>page you</em><br/>
          on a Sunday.
        </h1>
        <p style={{marginTop:26, maxWidth:500, fontFamily:a2F.serif, fontSize:18, lineHeight:1.55, color:c.mute}}>
          I'm <span style={{color:c.ink}}>Rasheed Bustamam</span> — an independent software
          consultant based in California. This is my notebook.
          Writing on the craft and the decisions behind the code.
        </p>
        <div style={{display:'flex', gap:14, marginTop:32, fontFamily:a2F.mono, fontSize:12}}>
          <button style={{background:c.ink, color:c.bg, border:`1px solid ${c.ink}`, padding:'9px 16px', borderRadius:2, cursor:'pointer', fontFamily:a2F.mono, fontSize:12, letterSpacing:'.02em'}}>
            $ read latest <span style={{color:c.accent, marginLeft:4}}>→</span>
          </button>
          <button style={{background:'transparent', color:c.ink, border:`1px solid ${c.line}`, padding:'9px 16px', borderRadius:2, cursor:'pointer', fontFamily:a2F.mono, fontSize:12, letterSpacing:'.02em'}}>
            $ hire me
          </button>
        </div>
      </div>

      <div style={{background:c.code, border:`1px solid ${c.line}`, borderRadius:4, fontFamily:a2F.mono, fontSize:12, overflow:'hidden'}}>
        <div style={{padding:'8px 14px', borderBottom:`1px solid ${c.line}`, display:'flex', justifyContent:'space-between', color:c.faint, fontSize:10, letterSpacing:'.08em', textTransform:'uppercase'}}>
          <span>whoami.sh</span>
          <span>● online</span>
        </div>
        <div style={{padding:'18px 16px 20px'}}>
          {lines.map((l, i) => (
            <div key={i} style={{display:'flex', gap:10, marginBottom:10, color:c.mute}}>
              <span style={{color:c.faint}}>
                {new Date(Date.now() - (lines.length-i)*2000 - tick*200).toISOString().slice(11,19)}
              </span>
              <span style={{color: l.t==='OPEN' ? c.accent : c.ink, fontWeight: l.t==='OPEN' ? 600 : 400}}>[{l.t.trim()}]</span>
              <span style={{color: l.t==='OPEN' ? c.ink : c.mute}}>{l.m}</span>
            </div>
          ))}
          <div style={{display:'flex', gap:10, marginTop:14, color:c.ink, alignItems:'center'}}>
            <span style={{color:c.accent}}>$</span>
            <span>cat journal/latest.md<span style={{display:'inline-block', width:7, height:13, background:c.accent, marginLeft:4, verticalAlign:'middle', animation:'a2blink 1s step-end infinite'}}/></span>
          </div>
          <style>{`@keyframes a2blink{50%{opacity:0}}`}</style>
        </div>
        <div style={{padding:'12px 14px', borderTop:`1px solid ${c.line}`, display:'flex', alignItems:'center', gap:10, fontSize:10, color:c.faint, letterSpacing:'.08em', textTransform:'uppercase'}}>
          <span style={{color:c.ink, fontFamily:a2F.mono, letterSpacing:0, fontSize:13, fontWeight:500}}>since 2019</span>
          <span>·</span>
          <span>an engineering journal</span>
        </div>
      </div>
    </section>
  );
}

function A2Filters({ c, activeTag, setActiveTag, query, setQuery }) {
  return (
    <div style={{padding:'22px 56px', borderBottom:`1px solid ${c.line}`, background:c.bg, display:'flex', alignItems:'center', gap:20, flexWrap:'wrap'}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:'6px 10px', border:`1px solid ${c.line}`, borderRadius:2, background:c.surface, minWidth:280}}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{color:c.mute}}>
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="grep titles, tags, years..."
          style={{border:'none', outline:'none', background:'transparent', flex:1, fontFamily:a2F.mono, fontSize:12, color:c.ink}} />
        <span style={{fontFamily:a2F.mono, fontSize:10, padding:'2px 6px', background:c.kbd, color:c.mute, borderRadius:2}}>/</span>
      </div>
      <div style={{height:18, width:1, background:c.line}} />
      <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
        {TAGS.map(t => {
          const on = t.name === activeTag;
          return (
            <button key={t.name} onClick={()=>setActiveTag(t.name)} style={{
              fontFamily:a2F.mono, fontSize:11, letterSpacing:'.02em', padding:'5px 10px', borderRadius:2, cursor:'pointer',
              border:`1px solid ${on ? c.ink : c.line}`, background: on ? c.ink : 'transparent', color: on ? c.bg : c.mute,
            }}>
              {t.name.toLowerCase()}<span style={{opacity:.55, marginLeft:4}}>{t.count}</span>
            </button>
          );
        })}
      </div>
      <div style={{marginLeft:'auto', fontFamily:a2F.mono, fontSize:11, color:c.faint}}>
        sort: <span style={{color:c.ink}}>recent ↓</span>
      </div>
    </div>
  );
}

function A2Row({ c, post, n, active }) {
  return (
    <article style={{
      display:'grid', gridTemplateColumns:'48px 110px 1fr 150px 90px 24px', gap:24, alignItems:'baseline',
      padding:'24px 56px', borderBottom:`1px solid ${c.lineSoft}`,
      background: active ? c.surface : 'transparent', cursor:'pointer', position:'relative',
    }}>
      <div style={{fontFamily:a2F.mono, fontSize:11, color:c.faint, letterSpacing:'.05em', fontVariantNumeric:'tabular-nums'}}>
        {String(n).padStart(3,'0')}
      </div>
      <div style={{fontFamily:a2F.mono, fontSize:11, color:c.mute, fontVariantNumeric:'tabular-nums'}}>
        {fmtDate(post.date)}
      </div>
      <div>
        <h3 style={{margin:0, fontFamily:a2F.serif, fontSize:23, lineHeight:1.15, fontWeight:500, color:c.ink, letterSpacing:'-.012em'}}>
          {post.title}
        </h3>
        <p style={{margin:'6px 0 0', fontFamily:a2F.serif, fontSize:14, lineHeight:1.5, color:c.mute, maxWidth:640}}>
          {post.dek}
        </p>
      </div>
      <div style={{fontFamily:a2F.mono, fontSize:11, color:c.mute}}>
        <span style={{padding:'2px 7px', border:`1px solid ${c.line}`, color:c.ink, borderRadius:2, letterSpacing:'.04em', fontSize:10, textTransform:'uppercase'}}>
          {post.tag}
        </span>
      </div>
      <div style={{fontFamily:a2F.mono, fontSize:11, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, textAlign:'right', fontVariantNumeric:'tabular-nums'}}>
        <span style={{color:c.ink}}>{post.readMin} min</span>
        <span style={{color:c.faint}}>{post.words.toLocaleString()} w</span>
      </div>
      <div style={{color:c.faint, fontFamily:a2F.mono, fontSize:14, alignSelf:'center', textAlign:'right'}}>→</div>
    </article>
  );
}

function A2Bio({ c }) {
  return (
    <section style={{padding:'56px 56px', borderTop:`1px solid ${c.line}`, background:c.surface, display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:56, alignItems:'start'}}>
      <div>
        <div style={{fontFamily:a2F.mono, fontSize:10, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:18}}>
          § about the author
        </div>
        <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:16}}>
          <div style={{width:56, height:56, borderRadius:'50%', background:`linear-gradient(135deg, ${c.accent}, ${c.ink})`, display:'flex', alignItems:'center', justifyContent:'center', color:c.bg, fontFamily:a2F.mono, fontWeight:600, fontSize:18, letterSpacing:'-.02em'}}>AB</div>
          <div>
            <div style={{fontFamily:a2F.serif, fontSize:24, color:c.ink, fontWeight:500, letterSpacing:'-.015em'}}>{AUTHOR.name}</div>
            <div style={{fontFamily:a2F.mono, fontSize:11, color:c.faint, marginTop:4, letterSpacing:'.02em'}}>
              independent consultant · {AUTHOR.location}
            </div>
          </div>
        </div>
        <p style={{fontFamily:a2F.serif, fontSize:16, lineHeight:1.6, color:c.mute, margin:0, maxWidth:380}}>
          {AUTHOR.longBio}
        </p>
        <div style={{marginTop:20, display:'flex', gap:14, fontFamily:a2F.mono, fontSize:11, color:c.mute}}>
          <a style={{color:c.ink}}>rss</a>
          <a style={{color:c.mute}}>github</a>
          <a style={{color:c.mute}}>email</a>
        </div>
      </div>
      <div style={{border:`1px solid ${c.line}`, borderRadius:3, padding:'24px 28px', background:c.bg}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:18}}>
          <span style={{width:7, height:7, borderRadius:'50%', background:c.accent, boxShadow:`0 0 0 3px ${c.accentBg}`}} />
          <span style={{fontFamily:a2F.mono, fontSize:11, color:c.accentInk, letterSpacing:'.1em', textTransform:'uppercase', background:c.accentBg, padding:'3px 8px', borderRadius:2}}>
            accepting new work
          </span>
        </div>
        <div style={{fontFamily:a2F.serif, fontSize:22, color:c.ink, lineHeight:1.35, letterSpacing:'-.01em', marginBottom:22}}>
          Taking on new engagements for <em style={{fontStyle:'italic', color:c.accent}}>Q3 2026</em>.
          Let's talk about what you're building.
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, fontFamily:a2F.mono, fontSize:11, color:c.mute}}>
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
        <button style={{marginTop:24, background:c.ink, color:c.bg, border:'none', padding:'10px 18px', borderRadius:2, cursor:'pointer', fontFamily:a2F.mono, fontSize:12, letterSpacing:'.02em'}}>
          $ start a conversation →
        </button>
      </div>
    </section>
  );
}

function A2Footer({ c }) {
  return (
    <footer style={{padding:'28px 56px', borderTop:`1px solid ${c.line}`, background:c.surface, display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:a2F.mono, fontSize:11, color:c.mute}}>
      <div style={{display:'flex', gap:20}}>
        <span>© 2026 bustamam.technology</span>
        <a style={{color:c.mute}}>rss</a>
        <a style={{color:c.mute}}>json feed</a>
        <a style={{color:c.mute}}>colophon</a>
      </div>
      <div style={{display:'flex', gap:20, alignItems:'center'}}>
        <span style={{color:c.faint}}>built with astro · one-person practice</span>
        <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:c.accent}} />
          all systems nominal
        </span>
      </div>
    </footer>
  );
}

function DirectionA2Index({ theme: initialTheme }) {
  const [theme, setTheme] = React.useState(initialTheme);
  const [activeTag, setActiveTag] = React.useState('All');
  const [query, setQuery] = React.useState('');
  const c = A2_PAL[theme];
  const filtered = POSTS.filter(p =>
    (activeTag==='All' || p.tag===activeTag || p.kind===activeTag) &&
    (query==='' || p.title.toLowerCase().includes(query.toLowerCase()) || p.tag.toLowerCase().includes(query.toLowerCase()))
  );
  return (
    <div style={{background:c.bg, color:c.ink, minHeight:'100%', fontFamily:a2F.sans}}>
      <A2Chrome c={c} theme={theme} onToggle={()=>setTheme(theme==='light'?'dark':'light')} path="/writing" />
      <A2Header c={c} />
      <A2Hero c={c} />
      <A2Filters c={c} activeTag={activeTag} setActiveTag={setActiveTag} query={query} setQuery={setQuery} />
      <div style={{display:'grid', gridTemplateColumns:'48px 110px 1fr 150px 90px 24px', gap:24, padding:'14px 56px', borderBottom:`1px solid ${c.line}`, fontFamily:a2F.mono, fontSize:10, color:c.faint, letterSpacing:'.12em', textTransform:'uppercase'}}>
        <div>№</div><div>date</div><div>title · dek</div><div>tag</div><div style={{textAlign:'right'}}>length</div><div />
      </div>
      {filtered.map((p, i) => <A2Row key={p.slug} c={c} post={p} n={i+1} active={i===0} />)}
      <A2Bio c={c} />
      <A2Footer c={c} />
    </div>
  );
}

Object.assign(window, { DirectionA2Index });
