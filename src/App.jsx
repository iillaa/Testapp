// src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { calculateTimeline } from './utils/logic';
import './App.css';

function App() {
  const loadState = (key, def) => {
    try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; }
  };

  const [startDate, setStartDate] = useState(() => loadState('startDate', new Date().toISOString().split('T')[0]));
  const [refYear, setRefYear] = useState(() => loadState('refYear', new Date().getFullYear() + 1));
  const [targetWaveDate, setTargetWaveDate] = useState(() => loadState('targetWaveDate', ""));
  
  const [holidays, setHolidays] = useState(() => loadState('holidays', [
    { id: 1, name: "Aïd el-Fitr", date: "2026-03-20" },
    { id: 2, name: "Aïd al-Adha", date: "2026-05-27" }
  ]));
  
  const [blocks, setBlocks] = useState(() => loadState('blocks', [
    { id: 1, type: 'TRAVAIL', duration: 45 },
    { id: 2, type: 'PERMISSION', duration: 15 },
    { id: 3, type: 'TRAVAIL', duration: 45 },
  ]));

  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  useEffect(() => {
    localStorage.setItem('startDate', JSON.stringify(startDate));
    localStorage.setItem('refYear', JSON.stringify(refYear));
    localStorage.setItem('targetWaveDate', JSON.stringify(targetWaveDate));
    localStorage.setItem('holidays', JSON.stringify(holidays));
    localStorage.setItem('blocks', JSON.stringify(blocks));
  }, [startDate, refYear, targetWaveDate, holidays, blocks]);

  const waves = useMemo(() => {
    const list = [];
    const startSeason = new Date(`${refYear}-06-01`);
    for (let i = 0; i < 6; i++) { 
      const d = new Date(startSeason); d.setDate(startSeason.getDate() + (i * 50)); 
      list.push({ id: i + 1, label: `Vague ${i + 1}`, date: d.toISOString().split('T')[0] });
    }
    return list;
  }, [refYear]);

  useEffect(() => {
    if (!targetWaveDate && waves.length > 0) setTargetWaveDate(waves[0].date);
  }, [waves, targetWaveDate]);

  const timeline = useMemo(() => calculateTimeline(startDate, blocks, holidays), [startDate, blocks, holidays]);

  const getDynamicLabel = (idx, type) => {
    if (!blocks[idx]) return "...";
    let count = 0;
    for (let i = 0; i <= idx; i++) if (blocks[i].type === 'TRAVAIL') count++;
    return type === 'CONGE_ANNUEL' ? 'Grand Congé' : type === 'TRAVAIL' ? `Rotation ${count}` : `Repos ${count}`;
  };

  const getSeqError = (idx, type) => {
    if (idx === 0 || !blocks[idx-1]) return null;
    const prev = blocks[idx-1].type;
    if (type === 'TRAVAIL' && prev === 'TRAVAIL') return "⚠️ 2 ROTATIONS SUITE";
    if (type === 'PERMISSION' && prev === 'PERMISSION') return "⚠️ 2 REPOS SUITE";
    return null;
  };

  const getPos = (h, s, e) => {
    const r = (new Date(h)-new Date(s))/(new Date(e)-new Date(s));
    return r < 0.33 ? "DÉBUT" : r > 0.66 ? "FIN" : "MILIEU";
  };

  const updateDur = (id, val) => setBlocks(blocks.map(b => b.id === id ? { ...b, duration: +val || 0 } : b));
  const updateEnd = (id, end, start) => {
    const diff = Math.round((new Date(end) - new Date(start)) / 86400000);
    if (diff >= 0) updateDur(id, diff); else alert("Date invalide");
  };
  const addStd = () => setBlocks([...blocks, {id: Date.now(), type:'TRAVAIL', duration:45}, {id: Date.now()+1, type:'PERMISSION', duration:15}]);
  const addConge = () => setBlocks([...blocks, {id: Date.now(), type:'CONGE_ANNUEL', duration:50}]);
  const remove = (id) => setBlocks(blocks.filter(b => b.id !== id));
  
  const addHoli = () => {
    if(!newHolidayName || !newHolidayDate) return;
    setHolidays([...holidays, {id:Date.now(), name:newHolidayName, date:newHolidayDate}]);
    setNewHolidayName(""); setNewHolidayDate("");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({startDate, refYear, targetWaveDate, holidays, blocks},null,2)], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  };
  const importData = (e) => {
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if(d.blocks) setBlocks(d.blocks);
        if(d.startDate) setStartDate(d.startDate);
        if(d.holidays) setHolidays(d.holidays);
        if(d.refYear) setRefYear(d.refYear);
        if(d.targetWaveDate) setTargetWaveDate(d.targetWaveDate);
        alert("Restauré !");
      } catch { alert("Erreur fichier"); }
    };
    if(e.target.files[0]) r.readAsText(e.target.files[0]);
  };

  return (
    <div className="container">
      
      {/* HEADER : NOM DE L'APP */}
      <header className="app-header">
        <h1 className="app-title">PermiPlan <span className="app-version">v1.0</span></h1>
      </header>
      
      {/* 1. CONFIGURATION */}
      <section className="card-params">
        <h2>Paramètres</h2>
        <label>Reprise Travail</label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        
        <div style={{display:'flex', gap:'10px'}}>
          <div style={{flex:1}}>
            <label>Année</label>
            <select value={refYear} onChange={e => setRefYear(+e.target.value)}>
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label>Vague</label>
            <select value={targetWaveDate} onChange={e => setTargetWaveDate(e.target.value)}>
              {waves.map(w => <option key={w.id} value={w.date}>{w.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{borderTop:'3px solid black', paddingTop:'15px'}}>
          <label>Fêtes ({holidays.length})</label>
          <ul style={{padding:0, listStyle:'none', maxHeight:'120px', overflowY:'auto'}}>
            {holidays.map(h => (
              <li key={h.id} style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', marginBottom:'8px', borderBottom:'1px dashed black'}}>
                <span>{h.name} ({h.date})</span>
                <span onClick={() => setHolidays(holidays.filter(x => x.id !== h.id))} style={{color:'red', cursor:'pointer'}}>✖</span>
              </li>
            ))}
          </ul>
          
          <div className="add-holiday-row">
            <input placeholder="Nom Fête" value={newHolidayName} onChange={e=>setNewHolidayName(e.target.value)} style={{flex:2, marginBottom:0}} />
            <input type="date" value={newHolidayDate} onChange={e=>setNewHolidayDate(e.target.value)} style={{flex:1.5, marginBottom:0}} />
            <button className="btn-add-holiday" onClick={addHoli}>+</button>
          </div>
        </div>

        <div className="backup-zone">
          <button className="btn-backup" onClick={exportData}>💾 SAUVEGARDER</button>
          <label className="btn-restore">
            📂 RESTAURER
            <input type="file" accept=".json" onChange={importData} style={{display:'none'}} />
          </label>
        </div>
      </section>

      {/* 2. TIMELINE */}
      <section>
        {timeline.map((item, index) => {
          const label = getDynamicLabel(index, item.type);
          const err = getSeqError(index, item.type);
          
          let gapMsg = null;
          if (item.type === 'CONGE_ANNUEL' && targetWaveDate) {
            const diff = Math.ceil((new Date(item.computedStart) - new Date(targetWaveDate)) / 86400000);
            gapMsg = diff === 0 ? "✅ SYNCHRO PARFAITE" : diff > 0 ? `⚠️ RETARD ${diff} J` : `ℹ️ AVANCE ${Math.abs(diff)} J`;
          }

          let permWarn = null;
          if (item.type === 'PERMISSION' && targetWaveDate) {
             if (Math.abs((new Date(item.computedStart) - new Date(targetWaveDate)) / 86400000) < 30) permWarn = "⛔ ZONE VAGUE !";
          }

          return (
            <div key={item.id} className={`timeline-item ${item.type.toLowerCase()}`}>
              <div className="item-header">
                <span className="item-title">{item.type === 'TRAVAIL' ? '🏭' : item.type === 'CONGE_ANNUEL' ? '🏖️' : '🏠'} {label}</span>
                <button className="btn-delete" onClick={() => remove(item.id)}>X</button>
              </div>

              {err && <div className="alert" style={{background:'#fee2e2'}}>{err}</div>}
              {permWarn && <div className="alert" style={{background:'#fee2e2'}}>{permWarn}</div>}
              {gapMsg && <div className="alert" style={{background:'#dcfce7'}}>{gapMsg}</div>}

              <div className="smart-dates">
                <div>
                  <label>Du</label>
                  <input type="date" value={item.computedStart} disabled />
                </div>
                <div>
                  <label>Au</label>
                  <input type="date" value={item.computedEnd} onChange={e => updateEnd(item.id, e.target.value, item.computedStart)} />
                </div>
                <div>
                  <label>Jours</label>
                  <input type="number" value={item.duration} onChange={e => updateDur(item.id, e.target.value)} className="duration-input" />
                </div>
              </div>

              {item.conflicts.length > 0 && (
                <div className="alert" style={{borderColor: item.type==='TRAVAIL'?'red':'green'}}>
                  {item.conflicts.map(c => `${c.name} (${c.date} - ${getPos(c.date, item.computedStart, item.computedEnd)})`).join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </section>
      
      {/* FOOTER : CRÉDITS */}
      <footer className="app-footer">
        Développé par
        <span className="dev-name">Dr Kibeche Ali Dia Eddine</span>
      </footer>

      <div className="fab-container">
        <button className="btn-fab btn-add-rot" onClick={addStd}>+ ROTATION</button>
        <button className="btn-fab btn-add-conge" onClick={addConge}>+ CONGÉ</button>
      </div>

    </div>
  );
}

export default App;