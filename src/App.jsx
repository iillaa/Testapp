// src/App.jsx
import React, { useState, useMemo } from 'react'; // Retrait de useEffect, Ajout de useMemo
import { calculateTimeline } from './utils/logic';
import './App.css';

function App() {
  // --- 1. CONFIGURATION ---
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Vagues & Cible Congé
  const [refYear, setRefYear] = useState(new Date().getFullYear() + 1); 
  const [targetWaveDate, setTargetWaveDate] = useState(""); 
  
  const [holidays, setHolidays] = useState([
    { id: 1, name: "Aïd el-Fitr", date: "2026-03-20" },
    { id: 2, name: "Aïd al-Adha", date: "2026-05-27" }
  ]);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  // BLOCS DE BASE
  const [blocks, setBlocks] = useState([
    { id: 1, type: 'TRAVAIL', duration: 45 },
    { id: 2, type: 'PERMISSION', duration: 15 },
    { id: 3, type: 'TRAVAIL', duration: 45 },
    { id: 4, type: 'PERMISSION', duration: 15 },
  ]);

  // --- 2. LOGIQUE DES VAGUES ---
  const waves = useMemo(() => {
    const list = [];
    const startSeason = new Date(`${refYear}-06-01`);
    for (let i = 0; i < 6; i++) { 
      const waveDate = new Date(startSeason);
      waveDate.setDate(startSeason.getDate() + (i * 50)); 
      list.push({
        id: i + 1,
        label: `Vague ${i + 1}`,
        date: waveDate.toISOString().split('T')[0]
      });
    }
    return list;
  }, [refYear]);

  // Initialisation intelligente de la vague cible
  useMemo(() => {
    if (!targetWaveDate && waves.length > 0) {
      setTargetWaveDate(waves[0].date);
    }
  }, [waves, targetWaveDate]);

  // --- 3. MOTEUR (CORRECTION DU CRASH ICI) ---
  // On utilise useMemo au lieu de useState+useEffect pour la timeline.
  // Cela garantit que timeline est TOUJOURS synchro avec blocks.
  const timeline = useMemo(() => {
    return calculateTimeline(startDate, blocks, holidays);
  }, [startDate, blocks, holidays]);

  // --- 4. FONCTIONS INTELLIGENTES ---

  // A. Nom Dynamique (Sécurisé)
  const getDynamicLabel = (index, type) => {
    // Sécurité anti-crash si l'index est hors limite (juste au cas où)
    if (!blocks[index]) return "...";

    let workCount = 0;
    for (let i = 0; i <= index; i++) {
      if (blocks[i] && blocks[i].type === 'TRAVAIL') workCount++;
    }
    if (type === 'CONGE_ANNUEL') return 'Grand Congé';
    if (type === 'TRAVAIL') return `Rotation ${workCount}`;
    return `Repos ${workCount}`;
  };

  // B. Détecteur d'Erreur
  const getSequenceError = (index, currentType) => {
    if (index === 0) return null; 
    // Sécurité : on vérifie que le bloc précédent existe
    const prevBlock = blocks[index - 1];
    if (!prevBlock) return null;

    const prevType = prevBlock.type;
    if (currentType === 'TRAVAIL' && prevType === 'TRAVAIL') return "⛔ ERREUR : 2 Rotations de suite !";
    if (currentType === 'PERMISSION' && prevType === 'PERMISSION') return "⛔ ERREUR : 2 Repos de suite !";
    return null;
  };

  // C. Position Aïd
  const getHolidayPosition = (holidayDateStr, startStr, endStr) => {
    const hDate = new Date(holidayDateStr);
    const start = new Date(startStr);
    const end = new Date(endStr);
    const totalDuration = end - start;
    const elapsed = hDate - start;
    const ratio = elapsed / totalDuration;
    if (ratio < 0.33) return "au DÉBUT";
    if (ratio > 0.66) return "à la FIN";
    return "au MILIEU";
  };

  // --- 5. ACTIONS ---
  const updateDuration = (id, val) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, duration: parseInt(val) || 0 } : b));
  };

  const updateEndDate = (id, newEndDate, computedStart) => {
    const start = new Date(computedStart);
    const end = new Date(newEndDate);
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) updateDuration(id, diffDays);
    else alert("Fin avant début impossible !");
  };

  const addStandardCycle = () => {
    const newId = Date.now();
    const newCycle = [
      { id: newId, type: 'TRAVAIL', duration: 45 },
      { id: newId + 1, type: 'PERMISSION', duration: 15 }
    ];
    setBlocks([...blocks, ...newCycle]);
  };

  const addCongeBlock = () => {
    const newId = Date.now();
    setBlocks([...blocks, { id: newId, type: 'CONGE_ANNUEL', duration: 50 }]);
  };

  const removeBlock = (id) => setBlocks(blocks.filter(b => b.id !== id));

  const addHoliday = () => {
    if (!newHolidayName || !newHolidayDate) return;
    setHolidays([...holidays, { id: Date.now(), name: newHolidayName, date: newHolidayDate }]);
    setNewHolidayName(""); setNewHolidayDate("");
  };

  const getGapMessage = (computedStart) => {
    if (!targetWaveDate) return null;
    const arrival = new Date(computedStart);
    const target = new Date(targetWaveDate);
    const diff = Math.ceil((arrival - target) / (1000 * 60 * 60 * 24));

    if (diff === 0) return { text: "✅ SYNCHRO : Tu sors pile avec ta vague.", color: "#166534", bg: "#dcfce7" };
    if (diff > 0) return { text: `⚠️ RETARD : Tu as ${diff} jours de trop.`, color: "#9a3412", bg: "#ffedd5" };
    return { text: `ℹ️ AVANCE : Tu finis ${Math.abs(diff)} jours AVANT la vague.`, color: "#1e40af", bg: "#eff6ff" };
  };

  const checkPermissionRule = (item) => {
    if (item.type !== 'PERMISSION') return null;
    if (!targetWaveDate) return null;
    const permStart = new Date(item.computedStart);
    const waveStart = new Date(targetWaveDate);
    const diff = Math.abs((permStart - waveStart) / (1000 * 60 * 60 * 24));
    if (diff < 30) return "⛔ RÈGLE : Tu es dans la zone de ta Vague !";
    return null;
  };

  return (
    <div className="container">
      <h2>📅 Planning Permissions</h2>

      <div className="card">
        <div className="date-row">
          <div className="date-group">
            <label>Date de Reprise</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="date-group">
            <label>Année de Congé</label>
            <select value={refYear} onChange={e => setRefYear(parseInt(e.target.value))} style={{width:'100%', padding:'8px'}}>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        <div style={{background:'#f8fafc', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0', marginBottom:'10px'}}>
          <label style={{fontWeight:'bold', fontSize:'0.9rem', color:'#475569'}}>🎯 VAGUE DE CONGÉ VISÉE :</label>
          <select value={targetWaveDate} onChange={e => setTargetWaveDate(e.target.value)} style={{width:'100%', padding:'10px', marginTop:'5px', fontWeight:'bold'}}>
            {waves.map(w => <option key={w.id} value={w.date}>{w.label} - Début le {w.date}</option>)}
          </select>
        </div>

        <details>
          <summary style={{fontWeight:'bold', color:'gray', cursor:'pointer'}}>Gérer les Fêtes</summary>
          <ul style={{paddingLeft:'20px', margin:'10px 0'}}>
            {holidays.map(h => (
              <li key={h.id}>{h.date} : {h.name} <span onClick={() => setHolidays(holidays.filter(x => x.id !== h.id))} style={{color:'red', cursor:'pointer'}}>✖</span></li>
            ))}
          </ul>
          <div style={{display:'flex', gap:'5px'}}>
            <input placeholder="Nom" value={newHolidayName} onChange={e=>setNewHolidayName(e.target.value)} />
            <input type="date" value={newHolidayDate} onChange={e=>setNewHolidayDate(e.target.value)} />
            <button onClick={addHoliday} style={{background:'#22c55e', color:'white', padding:'0 15px'}}>OK</button>
          </div>
        </details>
      </div>

      <div>
        {timeline.map((item, index) => {
          const dynamicLabel = getDynamicLabel(index, item.type);
          const sequenceError = getSequenceError(index, item.type);
          const isConge = item.type === 'CONGE_ANNUEL';
          const gapInfo = isConge ? getGapMessage(item.computedStart) : null;
          const permRuleWarning = checkPermissionRule(item);

          return (
            <div key={item.id} className={`timeline-item ${item.type.toLowerCase()}`}>
              <div className="item-header">
                <span className="item-title">{isConge ? '🏖️' : item.type === 'TRAVAIL' ? '🏭' : '🏠'} {dynamicLabel}</span>
                <button className="btn-delete" onClick={() => removeBlock(item.id)}>🗑️</button>
              </div>

              {sequenceError && (
                <div style={{padding: '10px', borderRadius: '6px', fontWeight: 'bold', textAlign: 'center', marginBottom:'10px', background: '#7f1d1d', color: '#ffffff', border: '2px solid red'}}>
                  {sequenceError}
                </div>
              )}

              {isConge && gapInfo && (
                <div style={{padding: '10px', borderRadius: '6px', fontWeight: 'bold', textAlign: 'center', marginBottom:'10px', background: gapInfo.bg, color: gapInfo.color}}>
                  {gapInfo.text}
                </div>
              )}

              {permRuleWarning && (
                <div style={{padding: '10px', borderRadius: '6px', fontWeight: 'bold', textAlign: 'center', marginBottom:'10px', background: '#fef2f2', color: '#dc2626', border: '2px solid #dc2626'}}>
                  {permRuleWarning}
                </div>
              )}

              <div className="smart-dates">
                <div className="date-group" style={{flex:1}}>
                  <label>Du</label>
                  <input type="date" value={item.computedStart} disabled style={{background:'#eee'}} />
                </div>
                <div className="date-group" style={{flex:1}}>
                  <label>Au</label>
                  <input type="date" value={item.computedEnd} onChange={(e) => updateEndDate(item.id, e.target.value, item.computedStart)} style={{fontWeight:'bold', borderColor:'var(--primary)'}} />
                </div>
                <div className="date-group duration-wrapper">
                  <label>Jours</label>
                  <input type="number" value={item.duration} onChange={(e) => updateDuration(item.id, e.target.value)} />
                  <span>j</span>
                </div>
              </div>

              {item.conflicts.length > 0 && (
                <div className={`alert ${item.type === 'TRAVAIL' ? 'danger' : 'success'}`}>
                  {item.type === 'TRAVAIL' ? '⚠️ Au Travail : ' : '✅ En Repos : '}
                  {item.conflicts.map(c => {
                    const position = getHolidayPosition(c.date, item.computedStart, item.computedEnd);
                    return `${c.name} (${c.date} - ${position})`;
                  }).join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{display:'flex', gap:'10px', marginBottom:'40px'}}>
        <button className="btn-add" onClick={addStandardCycle} style={{flex:2}}>+ Ajouter Rotation</button>
        <button className="btn-add" onClick={addCongeBlock} style={{flex:1, background:'#f59e0b'}}>+ Congé</button>
      </div>
    </div>
  );
}

export default App;