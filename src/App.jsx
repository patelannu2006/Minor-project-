import { useEffect, useMemo, useState } from 'react'

const scenarios = {
  bpl: { name:'Bhopal → Mumbai', train:'12138', desc:'Same-train split via Nashik Road · switch window 42 minutes', badge:'SPLIT AVAILABLE', stops:[['BPL','Bhopal'],['ET','Itarsi'],['BSL','Bhusaval'],['NK','Nashik'],['CSMT','Mumbai']], switch:'Nashik · 42 min', leg1:'BPL → NK · B2 / 34', leg2:'NK → CSMT · B4 / 12', fare:'₹1,284', pnrs:['3172 419 038','3418 772 604'] },
  pune: { name:'Pune → Mumbai CSMT', train:'11077', desc:'No eligible same-train quota split found for this sample route', badge:'NO SPLIT', stops:[['PUNE','Pune'],['DD','Daund'],['BSL','Bhusaval'],['KYN','Kalyan'],['CSMT','Mumbai']], switch:'No split available', leg1:'PUNE → —', leg2:'— → CSMT', fare:'—', pnrs:['—','—'] },
  ngp: { name:'Nagpur → Thane', train:'12140', desc:'Same-train split via Bhusaval · sample switch window 36 minutes', badge:'SPLIT AVAILABLE', stops:[['NGP','Nagpur'],['WR','Wardha'],['BD','Badnera'],['BSL','Bhusaval'],['THN','Thane']], switch:'Bhusaval · 36 min', leg1:'NGP → BSL · S3 / 18', leg2:'BSL → THN · S5 / 26', fare:'₹1,106', pnrs:['2901 631 804','4115 207 399'] },
}

const stationNames = {
  BPL:'Bhopal Junction (BPL)', CSMT:'Mumbai CSMT (CSMT)', PUNE:'Pune Junction (PUNE)',
  THN:'Thane (THN)', NK:'Nashik Road (NK)', NGP:'Nagpur (NGP)', ET:'Itarsi Junction (ET)',
}

const schedule = {
  'BPL-CSMT': [{number:'12138',departure:'17:05',arrival:'18:45 (+1 day)',distance:'827 km'}],
  'PUNE-CSMT': [{number:'11077',departure:'20:10',arrival:'04:35 (+1 day)',distance:'192 km'}],
  'NGP-THN': [{number:'12140',departure:'20:10',arrival:'11:20 (+1 day)',distance:'837 km'}],
  'ET-CSMT': [{number:'12138',departure:'18:42',arrival:'18:45 (+1 day)',distance:'708 km'}],
}

const steps = ['Intent','Hold leg 1','Hold leg 2','Payment','IRCTC OTP','Dual PNR','Confirm']

function App() {
  const [scenario, setScenario] = useState('bpl')
  const [stepIndex, setStepIndex] = useState(0)
  const [failed, setFailed] = useState(false)
  const [logs, setLogs] = useState([{now:'READY',text:'Simulation ready. No network calls will be made.',kind:''}])
  const [toastMessage, setToastMessage] = useState('')
  const [from, setFrom] = useState('BPL')
  const [to, setTo] = useState('CSMT')
  const [date, setDate] = useState('2026-11-24')
  const [passengers, setPassengers] = useState('1 adult')
  const [results, setResults] = useState(null)
  const [view, setView] = useState('combined')
  const [crumb, setCrumb] = useState('Overview')

  const d = scenarios[scenario]

  useEffect(() => {
    const names = {home:'Overview',search:'Find a route',console:'Split console',pass:'Journey pass',system:'System & safety'}
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setCrumb(names[entry.target.id] || 'Overview') })
    }, {rootMargin:'-25% 0px -65% 0px'})
    Object.keys(names).forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(''), 2400)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const showToast = message => setToastMessage(message)

  const resetSaga = () => {
    setStepIndex(0); setFailed(false)
    setLogs([{now:'READY',text:'Simulation ready. No network calls will be made.',kind:''}])
  }

  const loadScenario = key => {
    setScenario(key); resetSaga(); showToast(`Loaded ${scenarios[key].name} sample.`)
  }

  const addLog = (text, kind) => {
    const now = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})
    setLogs(current => [{now,text,kind}, ...current])
  }

  const advanceSaga = () => {
    if (failed || stepIndex >= 7) return
    const next = stepIndex + 1
    const items = ['Intent created · idempotency key attached.','Leg 1 hold placed · sample TTL 120 seconds.','Leg 2 hold placed · sample TTL 120 seconds.','Sandbox payment simulated · ₹1,284.','One-time authorization simulated · no credentials collected.','Two illustrative PNRs minted under the same saga ID.','Journey confirmed in local demo state.']
    setStepIndex(next); addLog(items[next-1], 'log-good')
    if (next === 7) {
      document.getElementById('pass')?.scrollIntoView({behavior:'smooth',block:'start'})
      showToast('Demo journey confirmed. View the sample pass below.')
    }
  }

  const failSaga = () => {
    if (failed || stepIndex >= 7) { showToast('Reset the saga before trying the failure path.'); return }
    if (stepIndex < 2) {
      setStepIndex(2); addLog('Leg 1 hold placed · sample TTL 120 seconds.','log-good')
    }
    setFailed(true); addLog('Leg 2 sold out · release Leg 1 hold.','log-warn'); addLog('Compensation complete · ₹0 captured · no PNR issued.','log-warn')
  }

  const routeResult = useMemo(() => {
    if (from === 'PUNE' && to === 'CSMT') return {direct:'WL 18',split:false,train:'11077',from:'Pune',to:'Mumbai CSMT'}
    if (from === 'NGP' && to === 'THN') return {direct:'WL 12',split:true,train:'12140',via:'Bhusaval',leg1:'NGP → BSL · S3 / 18',leg2:'BSL → THN · S5 / 26',times:['20:10–04:35','05:11–11:20'],fare:'₹1,106',window:'36 min',from:'Nagpur',to:'Thane'}
    if (from === 'ET' && to === 'CSMT') return {direct:'WL 9',split:true,train:'12138',via:'Nashik Road',leg1:'ET → NK · B2 / 41',leg2:'NK → CSMT · B4 / 12',times:['18:42–14:20','14:45–18:45'],fare:'₹1,012',window:'42 min',from:'Itarsi',to:'Mumbai CSMT'}
    return {direct:'WL 34',split:true,train:'12138',via:'Nashik Road',leg1:'BPL → NK · B2 / 34',leg2:'NK → CSMT · B4 / 12',times:['17:05–14:20','14:45–18:45'],fare:'₹1,284',window:'42 min',from:stationNames[from].split(' (')[0],to:stationNames[to].split(' (')[0]}
  }, [from,to])

  const submitSearch = event => {
    event.preventDefault()
    if (from === to) { showToast('Choose two different stations to search.'); return }
    setResults({route:routeResult,date,passengers,trains:schedule[`${from}-${to}`] || []})
  }

  const sagaMessage = failed
    ? <><b>Rolled back.</b> Leg 1 released; no payment captured and no PNR issued.</>
    : stepIndex === 7
      ? <><b>Confirmed in simulation.</b> Two sample PNRs are shown on the journey pass.</>
      : stepIndex === 0
        ? <><b>Ready.</b> Both seats must be held before payment is simulated.</>
        : <><b>{steps[Math.min(stepIndex,6)]}.</b> {stepIndex < 2?'The booking intent is tracked with one replay-safe saga ID.':stepIndex === 2?'Leg 1 has a temporary sample hold. Next, secure the second segment.':stepIndex === 3?'Both holds are ready. The demo payment remains synthetic.':stepIndex === 4?'Sample payment approved. OTP authorization is simulated.':stepIndex === 5?'The two illustrative PNRs are ready to be confirmed.':'The final state is recorded.'}</>

  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="#home"><span className="brand-mark">↗</span><span><span className="brand-name">between</span><br/><span className="brand-sub">ONE JOURNEY, TWO LEGS</span></span></a>
        <div className="nav-label">Workspace</div>
        <nav className="nav" aria-label="Main navigation">
          {[['home','⌂','Overview'],['search','⌕','Find a route'],['console','◉','Split console'],['pass','▤','Journey pass'],['system','⚙','System & safety']].map(([id,icon,label]) =>
            <a key={id} className={crumb === label ? 'active' : ''} href={`#${id}`}><span className="nav-icon">{icon}</span>{label}</a>
          )}
        </nav>
        <div className="sidebar-bottom"><div className="status-card"><div className="status-head"><span className="pulse"></span>Sandbox demo is ready</div><div className="status-copy">Sample routes and bookings<br/>All data is simulated</div></div><div className="sidebar-foot">INDEPENDENT DEMO · NO LIVE TICKETS</div></div>
      </aside>
      <main className="main">
        <header className="topbar"><div className="breadcrumb">Workspace&nbsp; / &nbsp;<strong>{crumb}</strong></div><div className="top-actions"><span className="sandbox-pill"><span className="pulse"></span> SANDBOX MODE</span><span className="avatar">BT</span></div></header>
        <div className="content">
          <section className="section" id="home">
            <div className="hero">
              <div className="hero-copy"><div className="eyebrow">Smarter journeys, connected</div><h1 className="h1">When one ticket says <em>wait</em>, find another way.</h1><p className="lede">Search for a confirmed seat by splitting your journey across quota stations. One train. Two seat segments. A single, easy-to-follow trip.</p></div>
              <div className="hero-art"><div className="art-top"><span>THE ROUTE, AT A GLANCE</span><span className="train-chip">12138 · SAME TRAIN</span></div><div className="midpoint">BERTH SWITCH · 42 MIN</div><div className="rail"><div className="station"><div className="station-code">BPL</div><div className="station-name">Bhopal</div></div><div className="rail-line"></div><div className="station"><div className="station-code">NK</div><div className="station-name">Nashik Road</div></div><div className="rail-line"></div><div className="station"><div className="station-code">CSMT</div><div className="station-name">Mumbai</div></div></div><div className="hero-note"><span>17:05 &nbsp;·&nbsp; DEPART</span><b>2 confirmed segments</b><span>18:45 &nbsp;·&nbsp; ARRIVE</span></div></div>
            </div>
            <div className="search-card" id="search">
              <div className="card-heading"><div><h2>Where would you like to go?</h2><div className="subtle">We’ll look for a direct seat and a same-train split option.</div></div><span className="mini-tag">DEMO SEARCH · NO NETWORK</span></div>
              <form onSubmit={submitSearch}><div className="search-grid">
                <div className="field"><label htmlFor="from">From</label><select id="from" value={from} onChange={e => setFrom(e.target.value)}>{Object.entries(stationNames).filter(([,n]) => n.includes('Bhopal') || n.includes('Pune') || n.includes('Nagpur') || n.includes('Itarsi')).map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select></div>
                <div className="field"><label htmlFor="to">To</label><select id="to" value={to} onChange={e => setTo(e.target.value)}>{Object.entries(stationNames).filter(([,n]) => n.includes('Mumbai') || n.includes('Thane') || n.includes('Nashik') || n.includes('Pune')).map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select></div>
                <div className="field"><label htmlFor="date">Journey date</label><input id="date" type="date" value={date} onChange={e => setDate(e.target.value)}/></div>
                <div className="field"><label htmlFor="passengers">Travellers</label><select id="passengers" value={passengers} onChange={e => setPassengers(e.target.value)}>{['1 adult','2 adults','3 adults','4 adults'].map(x => <option key={x}>{x}</option>)}</select></div>
              </div><div className="search-actions"><span className="hint">Sample timetable · results are illustrative</span><button className="primary" type="submit">Find my route&nbsp; ↗</button></div></form>
              {results && <SearchResults results={results} onLoad={key => {loadScenario(key); document.getElementById('console')?.scrollIntoView({behavior:'smooth'})}} />}
            </div>
            <Stats />
          </section>
          <ConsoleSection scenario={scenario} d={d} stepIndex={stepIndex} failed={failed} logs={logs} sagaMessage={sagaMessage} onLoad={loadScenario} onAdvance={advanceSaga} onFail={failSaga} onReset={() => {resetSaga(); showToast('Booking simulation reset.')}} />
          <PassSection d={d} view={view} setView={setView} />
          <SystemSection />
          <footer className="footer"><span>BETWEEN · A ROUTE-SPLITTING CONCEPT</span><span>All routes, seats, fares, payments and PNRs shown here are illustrative.</span></footer>
        </div>
      </main>
      <div className={`toast ${toastMessage ? 'show' : ''}`} role="status">{toastMessage}</div>
    </div>
  )
}

function Stats() {
  return <div className="stats-row">
    {[['2 legs','One journey','Same train, one change'],['120 sec','Seat hold window','Server-enforced in concept'],['3–4','Junction probes','Quota-aware route search'],['₹1,284','Example fare','Illustrative sandbox amount']].map(([n,l,f]) =>
      <div className="stat" key={l}><div className="stat-n">{n}</div><div className="stat-label">{l}</div><div className="stat-foot">{f}</div></div>)}
  </div>
}

function SearchResults({results,onLoad}) {
  const r = results.route
  return <div className="results show" aria-live="polite">
    <div className="results-head"><h3>Sample route options</h3><span className="mini-tag">ILLUSTRATIVE RESULTS</span></div>
    <div className="result-grid">
      <article className="result-card"><span className="result-type">DIRECT · {r.train}</span><h4>{r.from} → {r.to}</h4><div className="route-summary">One train · no change required</div><div className="result-price-row"><span className="price">₹1,284</span><span className="badge">{r.direct}</span></div><div className="result-note">The direct seat is waitlisted in this sample scenario.</div><button className="secondary" type="button">View direct option</button></article>
      {r.split ? <article className="result-card featured"><span className="result-type">SAME TRAIN · SPLIT OPTION</span><h4>{r.from} → {r.to}</h4><div className="route-summary">Train {r.train} · change berth at {r.via}</div><div className="result-price-row"><span className="price">{r.fare}</span><span className="badge ok">2 SEATS FOUND</span></div><div className="split-legs"><div className="leg-row"><span className="leg-label">LEG 1</span><span className="leg-route">{r.leg1}<br/><span className="leg-time">{r.times[0]}</span></span><span className="leg-berth">CNF</span></div><div className="leg-row"><span className="leg-label">LEG 2</span><span className="leg-route">{r.leg2}<br/><span className="leg-time">{r.times[1]}</span></span><span className="leg-berth">CNF</span></div></div><div className="result-note">Switch at {r.via} · {r.window} · example date {results.date}</div><button className="primary" type="button" onClick={() => onLoad(r.train === '12140' ? 'ngp' : 'bpl')}>Review sandbox booking&nbsp; →</button></article>
      : <article className="result-card"><span className="result-type">SPLIT SEARCH</span><h4>No eligible split found</h4><div className="route-summary">Train {r.train} · no matching quota pair in the sample data</div><div className="result-price-row"><span className="price">—</span><span className="badge">NO SPLIT</span></div><div className="result-note">The engine fails gracefully. It will not create a half-booked journey.</div><button className="secondary" type="button" onClick={() => onLoad('pune')}>Inspect this scenario</button></article>}
    </div>
  </div>
}

function ConsoleSection({scenario,d,stepIndex,failed,logs,sagaMessage,onLoad,onAdvance,onFail,onReset}) {
  return <section className="section" id="console">
    <div className="section-title"><div><div className="eyebrow">Try the booking logic</div><h2>Split journey console</h2><p>Run a local simulation to see which junctions are checked, how two seats are held, and how the booking safely handles failure.</p></div><span className="mini-tag">LOCAL SIMULATION</span></div>
    <div className="console-shell">
      <aside className="console-side"><h3>Load a route scenario</h3><p>Choose a preset to configure the simulated search.</p><div className="scenario-list">
        {[['bpl','Bhopal → Mumbai','Split found · Train 12138'],['pune','Pune → CSMT','No split · Train 11077'],['ngp','Nagpur → Thane','Split found · via Bhusaval']].map(([key,name,desc]) => <button key={key} className={`scenario ${scenario===key?'active':''}`} onClick={() => onLoad(key)}><strong>{name}</strong><span>{desc}</span></button>)}
      </div><div className="console-meta"><div className="meta-line"><span>Route graph</span><strong>118 stops</strong></div><div className="meta-line"><span>Quota stations</span><strong>4 candidates</strong></div><div className="meta-line"><span>Availability</span><strong>30–60s cache</strong></div></div></aside>
      <div className="console-main"><div className="console-top"><div><h3>{d.name} · {d.train}</h3><p>{d.desc}</p></div><span className="mini-tag" style={{background:d.badge==='NO SPLIT'?'#fff0e8':'#eff4e7'}}>{d.badge}</span></div>
        <div className="route-track">{d.stops.map((stop,i) => <div className={`route-stop ${((scenario==='bpl'&&i===3)||(scenario==='ngp'&&i===3))?'highlight':''}`} key={stop[0]}><div className="route-dot"></div><strong>{stop[0]}</strong><span>{stop[1]}</span></div>)}</div>
        <div className="locks"><div className="lock-card"><div className="lock-top"><span>LEG 1 · PNR #1</span><span className={`lock-state ${failed?'':stepIndex>=2?'held':''}`}>{failed?'RELEASED':stepIndex>=2?'HELD · 120S':'NOT HELD'}</span></div><div className="lock-seat">{d.leg1}</div><div className="lock-desc">Sleeper · lower berth · 17:05–14:20</div></div><div className="lock-card"><div className="lock-top"><span>LEG 2 · PNR #2</span><span className={`lock-state ${failed?'':stepIndex>=3?'held':''}`}>{failed?'UNAVAILABLE':stepIndex>=3?'HELD · 120S':'NOT HELD'}</span></div><div className="lock-seat">{d.leg2}</div><div className="lock-desc">Sleeper · side lower · 14:45–18:45</div></div></div>
        <div className="saga"><div className="saga-label"><span>Atomic booking saga</span><span>{failed?'ROLLED BACK':`${stepIndex} / 7 complete`}</span></div><div className="steps">{steps.map((step,i) => <div className={`step ${failed&&i===2?'fail':!failed&&i<stepIndex?'done':!failed&&i===stepIndex?'active':''}`} key={step}><div className="num">{i+1}</div><span>{step}</span></div>)}</div><div className="saga-controls"><div className="saga-message">{sagaMessage}</div><div className="saga-buttons"><button className="secondary" onClick={onAdvance} disabled={failed||stepIndex>=7} style={{opacity:failed||stepIndex>=7?'.55':'1'}}>Advance step&nbsp; →</button><button className="danger-btn" onClick={onFail}>Simulate Leg 2 failure</button><button className="text-btn" onClick={onReset}>Reset</button></div></div><div className={`failure-box ${failed?'show':''}`}>Leg 2 was unavailable. The simulation released the Leg 1 hold, captured no payment, and issued no PNR.</div><div className="log">{logs.map((log,i)=><div className="log-line" key={`${log.now}-${i}`}><span className="log-time">{log.now}</span><span className={log.kind}>{log.text}</span></div>)}</div></div>
      </div>
    </div>
  </section>
}

function PassSection({d,view,setView}) {
  const footnote = view === 'switch' ? 'Connection highlighted: allow 42 minutes at Nashik to switch from Coach B2 / berth 34 to Coach B4 / berth 12. Sample only; no travel value.' : 'Issued by Between · sandbox simulation. This is not a railway ticket and has no travel value.'
  return <section className="section" id="pass"><div className="section-title"><div><div className="eyebrow">One clear trip to carry</div><h2>Your unified journey pass</h2><p>The two segments stay visible, with a plain-language berth change instruction between them.</p></div><span className="mini-tag">SAMPLE PASS</span></div><div className="pass-layout">
    <article className="ticket"><div className="ticket-head"><span className="ticket-kicker">JOURNEY PASS&nbsp; · &nbsp;TUE 24 NOV 2026</span><span className="ticket-tag">SANDBOX DEMO</span></div><div className="ticket-title">{d.name}</div><div className="ticket-sub">Punjab Mail · {d.train} · Sleeper · 2 confirmed segments</div><div className="ticket-route"><span className="code">{d.stops[0][0]}</span><span className="arrow">────→</span><span className="route-mid" style={{color:view==='switch'?'#b7dc75':'',fontWeight:view==='switch'?700:''}}>CHANGE AT {d.switch.toUpperCase()}</span><span className="arrow">────→</span><span className="code">{d.stops[4][0]}</span></div><div className="ticket-divider"></div><div className="ticket-legs"><div className="ticket-leg"><span>Leg 1 · PNR #1</span><strong>{d.leg1}</strong><small>17:05 depart · 14:20 arrive</small></div><div className="ticket-leg"><span>Leg 2 · PNR #2</span><strong>{d.leg2}</strong><small>14:45 depart · 18:45 arrive</small></div></div><div className="ticket-footer"><span>Illustrative PNRs · <b>same demo saga · bta_9f2c</b><br/>Carry valid photo ID for travel</span><span className="qr" aria-label="Decorative sample pass code"></span></div></article>
    <aside className="pass-controls"><h3>Pass details</h3><p>Choose how the combined ticket explains the connection.</p><div className="view-options"><button className={`view-option ${view==='combined'?'active':''}`} onClick={()=>setView('combined')}><span className="view-radio"></span><span><strong>Combined journey</strong><span>Both PNRs and both segments on one pass</span></span></button><button className={`view-option ${view==='switch'?'active':''}`} onClick={()=>setView('switch')}><span className="view-radio"></span><span><strong>Highlight the berth change</strong><span>Emphasize the Nashik connection and 42-minute window</span></span></button></div><div className="pnr-pair"><div className="pnr"><small>PNR #1 · DEMO</small><b>{d.pnrs[0]}</b></div><div className="pnr"><small>PNR #2 · DEMO</small><b>{d.pnrs[1]}</b></div></div><div className="pass-footnote">{footnote}</div><button className="secondary full" style={{marginTop:'13px'}} onClick={() => window.print()}>Print sample pass</button></aside>
  </div></section>
}

function SystemSection() {
  return <section className="section" id="system"><div className="section-title"><div><div className="eyebrow">Designed with boundaries</div><h2>Data, keys & guardrails</h2><p>The blueprint separates read-only discovery from sandbox booking and makes the demo status clear.</p></div></div><div className="infra-grid">
    <article className="infra-card"><h3>Two data planes</h3><p>Different systems for route discovery and payment/booking simulation.</p>{[['Route discovery','Static schedules + read-only availability providers','READ ONLY'],['Quota filter','Itarsi · Bhusaval · Nashik · Kalyan','4 STATIONS'],['Sandbox gateway','Mock payment, holds, and illustrative PNRs','SIMULATED'],['Credential handling','No real keys requested or stored by this demo','NO KEYS']].map(([title,desc,status]) => <div className="infra-item" key={title}><div><strong>{title}</strong><span>{desc}</span></div><span className="small-status">{status}</span></div>)}</article>
    <article className="infra-card"><h3>Demo safety checklist</h3><p>The project blueprint’s stated guardrails, shown as product commitments.</p><div className="guard-grid">{['No scraping or automated IRCTC access','No CAPTCHA bypass or Tatkal automation','No pooled personal booking accounts','No stored IRCTC passwords or card data','Sandbox booking clearly disclosed','No live ticket or IRCTC affiliation claimed'].map(x => <div className="guard" key={x}><span className="check">✓</span>{x}</div>)}</div></article>
  </div><div className="notice"><strong>Demo only.</strong> This website uses a fixed sample route dataset. It does not connect to railway inventory, reserve seats, collect payment, issue real PNRs, or provide a valid travel ticket. Any real booking service would require a separately implemented and authorized backend and provider integrations.</div></section>
}

export default App
