import React, { useState, useEffect, useMemo } from 'react';
import { calculateTimeline } from './utils/logic';
import { loadAllData, saveData, createNewProfile, exportBackup } from './utils/storage';
import './App.css';

function App() {
  // --- GLOBAL STATE ---
  const [data, setData] = useState(loadAllData);
  
  const activeProfile = useMemo(() => 
    data.profiles.find(p => p.id === data.activeId) || data.profiles[0], 
  [data]);

  useEffect(() => { saveData(data); }, [data]);

  // --- ACTIONS ---
  const updateProfile = (field, value) => {
    setData(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => p.id === activeProfile.id ? { ...p, [field]: value } : p)
    }));
  };

  const handleCreateProfile = () => {
    const name = prompt("Nom du profil ?");
    if (!name) return;
    const newP = createNewProfile(name);
    setData(prev => ({ ...prev, profiles: [...prev.profiles, newP], activeId: newP.id }));
  };

  const handleDeleteProfile = () => {
    if (data.profiles.length <= 1) return alert("Impossible de supprimer le dernier profil.");
    if (!confirm(`Supprimer ${activeProfile.name} ?`)) return;
    const newProfiles = data.profiles.filter(p => p.id !== activeProfile.id);
    setData({ profiles: newProfiles, activeId: newProfiles[0].id });
  };

  const handleImport = (e) => {
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.profiles) setData(d);
        else if (d.blocks && confirm("Importer dans le profil actuel ?")) {
          updateProfile('blocks', d.blocks);
          if(d.startDate) updateProfile('startDate', d.startDate);
        }
        alert("Restauré !");
      } catch { alert("Fichier invalide"); }
    };
    if (e.target.files[0]) r.readAsText(e.target.files[0]);
  };

  // --- CALCS ---
  const waves = useMemo(() => {
    const list = [];
    const startSeason = new Date(`${activeProfile.refYear}-06-01`);
    for (let i = 0; i < 6; i++) { 
      const d = new Date(startSeason); d.setDate(startSeason.getDate() + (i * 50)); 
      list.push({ id: i + 1, label: `Vague ${i + 1}`, date: d.toISOString().split('T')[0] });
    }
    return list;
  }, [activeProfile.refYear]);

  useEffect(() => {
    if (!activeProfile.targetWaveDate && waves.length > 0) updateProfile('targetWaveDate', waves[0].date);
  }, [waves, activeProfile.targetWaveDate]);

  const timeline = useMemo(() => 
    calculateTimeline(activeProfile.startDate, activeProfile.blocks, activeProfile.holidays), 
  [activeProfile.startDate, activeProfile.blocks, activeProfile.holidays]);

  // --- DASHBOARD STATE ---
  const dashboardState = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentBlockIndex = timeline.findIndex(item => {
      const s = new Date(item.computedStart);
      const e = new Date(item.computedEnd);
      return today >= s && today < e;
    });

    if (currentBlockIndex === -1) {
      const firstStart = new Date(activeProfile.startDate);
      if (today < firstStart) return { label: "En attente de reprise", percent: 0, color: "var(--text-muted)" };
      return { label: "Planning terminé", percent: 100, color: "var(--success)" };
    }

    const currentBlock = timeline[currentBlockIndex];
    const nextBlock = timeline[currentBlockIndex + 1];
    const start = new Date(currentBlock.computedStart).getTime();
    const end = new Date(currentBlock.computedEnd).getTime();
    const percent = Math.min(Math.max(Math.round(((today.getTime() - start) / (end - start)) * 100), 0), 100);

    let label = "";
    let color = "";

    if (currentBlock.type === 'TRAVAIL') {
      color = "var(--primary)";
      label = nextBlock?.type === 'CONGE_ANNUEL' ? `Dernière ligne droite !` : `Au Travail (${percent}%)`;
    } 
    else if (currentBlock.type === 'PERMISSION') {
      color = "var(--success)";
      label = `En Repos (${percent}%)`;
    }
    else if (currentBlock.type === 'CONGE_ANNUEL') {
      color = "var(--secondary)";
      label = `🏖️ Vacances (${percent}%)`;
    }
    return { label, percent, color };
  }, [timeline, activeProfile.startDate]);

  // --- LOGIC ---
  const getSeqError = (idx, type) => {
    if (idx === 0) return null;
    const prev = activeProfile.blocks[idx-1];
    if (!prev) return null;
    if (type === 'TRAVAIL' && prev.type === 'TRAVAIL') return "⚠️ 2 ROTATIONS SUITE";
    if (type === 'PERMISSION' && prev.type === 'PERMISSION') return "⚠️ 2 PERMISSIONS SUITE";
    return null;
  };

  const getPos = (h, s, e) => {
    const r = (new Date(h)-new Date(s))/(new Date(e)-new Date(s));
    return r < 0.33 ? "DÉBUT" : r > 0.66 ? "FIN" : "MILIEU";
  };

  // --- HELPER UI ---
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "" });
  const addHoli = () => {
    if (!newHoliday.name || !newHoliday.date) return;
    updateProfile('holidays', [...activeProfile.holidays, { id: Date.now(), ...newHoliday }]);
    setNewHoliday({ name: "", date: "" });
  };

  const updateBlock = (id, field, val) => {
    const n = activeProfile.blocks.map(b => b.id === id ? { ...b, [field]: val } : b);
    updateProfile('blocks', n);
  };
  
  const updateEnd = (id, end, start) => {
    const diff = Math.round((new Date(end) - new Date(start)) / 86400000);
    if (diff >= 0) updateBlock(id, 'duration', diff);
  };

  // Avatar helper (First letter of name)
  const getAvatar = (name) => name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className="container">
      
      {/* HEADER AMÉLIORÉ */}
      <header className="main-header">
        <h1 className="app-title-main">PermiPlan <span className="version-tag">v2.3</span></h1>
        
        <div className="profile-bar">
           <div className="avatar-circle">{getAvatar(activeProfile.name)}</div>
           <select 
              className="profile-selector-clean" 
              value={data.activeId} 
              onChange={(e) => setData({...data, activeId: +e.target.value})}
            >
              {data.profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="btn-mini" onClick={handleCreateProfile}>+</button>
            <button className="btn-mini btn-danger-text" onClick={handleDeleteProfile}>Suppr.</button>
        </div>

        {/* PROGRESS BAR */}
        <div className="progress-card">
          <div className="progress-header">
            <span>{dashboardState.label}</span>
            <strong>{dashboardState.percent}%</strong>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ width: `${dashboardState.percent}%`, backgroundColor: dashboardState.color }}
            ></div>
          </div>
        </div>
      </header>
      
      {/* CONFIG */}
      <section className="card card-config">
        <div className="row">
          <div className="col">
            <label>Reprise Travail</label>
            <input type="date" value={activeProfile.startDate} onChange={e => updateProfile('startDate', e.target.value)} />
          </div>
          <div className="col">
            <label>Saison</label>
            <select value={activeProfile.refYear} onChange={e => updateProfile('refYear', +e.target.value)}>
              {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="row">
          <div className="col">
            <label>Objectif Vague</label>
            <select value={activeProfile.targetWaveDate} onChange={e => updateProfile('targetWaveDate', e.target.value)}>
              {waves.map(w => <option key={w.id} value={w.date}>{w.label} ({w.date})</option>)}
            </select>
          </div>
        </div>

        <div className="holidays-section">
          <label>Jours Fériés</label>
          <div className="tags-container">
            {activeProfile.holidays.map(h => (
              <span key={h.id} className="tag">
                {h.name}
                <button onClick={() => updateProfile('holidays', activeProfile.holidays.filter(x => x.id !== h.id))}>×</button>
              </span>
            ))}
          </div>
          <div className="add-row">
            <input placeholder="Ex: Aïd..." value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} style={{flex:2}} />
            <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} style={{flex:1}} />
            {/* FIXED: Centrage du bouton + */}
            <button className="btn-icon-plus" onClick={addHoli}>+</button>
          </div>
        </div>

        {/* EXPORT / IMPORT (Tailles égales) */}
        <div className="backup-row">
          <button className="btn-secondary" onClick={() => exportBackup(data)}>📤 Export</button>
          <label className="btn-secondary">
            📥 Import
            <input type="file" accept=".json" onChange={handleImport} hidden />
          </label>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="timeline-container">
        {timeline.map((item, index) => {
          let count = 0;
          for(let i=0; i<=index; i++) if(activeProfile.blocks[i].type === 'TRAVAIL') count++;
          
          const label = item.type === 'CONGE_ANNUEL' ? 'Grand Congé' : item.type === 'TRAVAIL' ? `Rotation ${count}` : `Permission ${count}`;
          const seqErr = getSeqError(index, item.type);

          let msg = null;
          let colorClass = "";
          if (item.type === 'CONGE_ANNUEL' && activeProfile.targetWaveDate) {
            const diff = Math.ceil((new Date(item.computedStart) - new Date(activeProfile.targetWaveDate)) / 86400000);
            if (diff === 0) { msg = "✅ Parfait"; colorClass="good"; }
            else if (diff > 0) { msg = `⚠️ Retard +${diff}j`; colorClass="warn"; }
            else { msg = `ℹ️ Avance ${Math.abs(diff)}j`; colorClass="info"; }
          }
          if (item.type === 'PERMISSION' && activeProfile.targetWaveDate) {
             if (Math.abs((new Date(item.computedStart) - new Date(activeProfile.targetWaveDate)) / 86400000) < 30) {
               msg = "⛔ Attention Vague"; colorClass="danger";
             }
          }

          return (
            <div key={item.id} className={`timeline-item ${item.type.toLowerCase()}`}>
              <div className="item-header">
                <span className="item-title">
                  {item.type === 'TRAVAIL' ? '🏭' : item.type === 'CONGE_ANNUEL' ? '🏖️' : '🏠'} {label}
                </span>
                
                {/* NEW X BUTTON */}
                <button className="btn-delete-x" onClick={() => updateProfile('blocks', activeProfile.blocks.filter(b => b.id !== item.id))}>
                  ✕
                </button>
              </div>

              {seqErr && <div className="status-pill danger">{seqErr}</div>}
              {msg && <div className={`status-pill ${colorClass}`}>{msg}</div>}

              <div className="date-grid">
                <div className="field">
                  <label>Du</label>
                  <input type="date" value={item.computedStart} disabled />
                </div>
                <div className="field">
                  <label>Au</label>
                  <input type="date" value={item.computedEnd} onChange={e => updateEnd(item.id, e.target.value, item.computedStart)} />
                </div>
                <div className="field small">
                  <label>Jours</label>
                  <input type="number" value={item.duration} onChange={e => updateBlock(item.id, 'duration', +e.target.value)} />
                </div>
              </div>
              
              {item.conflicts.length > 0 && (
                <div className="conflict-box">
                  {item.conflicts.map(c => (
                    <div key={c.id}>
                       🧨 {c.name} ({c.date}) — <strong>{getPos(c.date, item.computedStart, item.computedEnd)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
      
      <div style={{height: '100px'}}></div>

      {/* FAB */}
      <div className="fab-zone">
        <button className="fab main" onClick={() => updateProfile('blocks', [...activeProfile.blocks, {id: Date.now(), type:'TRAVAIL', duration:45}, {id: Date.now()+1, type:'PERMISSION', duration:15}])}>
          + Cycle
        </button>
        <button className="fab sub" onClick={() => updateProfile('blocks', [...activeProfile.blocks, {id: Date.now(), type:'CONGE_ANNUEL', duration:30}])}>
          + Congé
        </button>
      </div>
    </div>
  );
}

export default App;