import React, { useState, useEffect, useMemo } from 'react';
import { calculateTimeline } from './utils/logic';
import { loadAllData, saveData, createNewProfile, exportBackup } from './utils/storage';
import './App.css';

function App() {
  // --- GLOBAL STATE ---
  const [data, setData] = useState(loadAllData);
  
  // --- DERIVED STATE (Active Profile) ---
  const activeProfile = useMemo(() => 
    data.profiles.find(p => p.id === data.activeId) || data.profiles[0], 
  [data]);

  // Save whenever data changes
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
        if (d.profiles && d.activeId) {
          setData(d); // Full restore V2
        } else if (d.blocks) {
          // Import V1 backup into current profile
          updateProfile('blocks', d.blocks);
          updateProfile('startDate', d.startDate || activeProfile.startDate);
        }
        alert("Restauré avec succès !");
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

  // Sync Default Wave
  useEffect(() => {
    if (!activeProfile.targetWaveDate && waves.length > 0) updateProfile('targetWaveDate', waves[0].date);
  }, [waves, activeProfile.targetWaveDate]);

  const timeline = useMemo(() => 
    calculateTimeline(activeProfile.startDate, activeProfile.blocks, activeProfile.holidays), 
  [activeProfile.startDate, activeProfile.blocks, activeProfile.holidays]);

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

  return (
    <div className="container">
      
      {/* HEADER & PROFILES */}
      <header className="app-header">
        <div className="header-top">
          <h1 className="app-title">PermiPlan</h1>
          <select 
            className="profile-selector" 
            value={data.activeId} 
            onChange={(e) => setData({...data, activeId: +e.target.value})}
          >
            {data.profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="profile-actions">
           <button onClick={handleCreateProfile}>+ Nouv.</button>
           <button onClick={() => {
             const n = prompt("Nouveau nom ?", activeProfile.name);
             if(n) updateProfile('name', n);
           }}>Renommer</button>
           <button onClick={handleDeleteProfile} className="btn-danger">Suppr.</button>
        </div>
      </header>
      
      {/* PARAMETRES */}
      <section className="card card-params">
        <div className="row">
          <div className="col">
            <label>Reprise</label>
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
            <label>Vague Cible</label>
            <select value={activeProfile.targetWaveDate} onChange={e => updateProfile('targetWaveDate', e.target.value)}>
              {waves.map(w => <option key={w.id} value={w.date}>{w.label}</option>)}
            </select>
          </div>
        </div>

        <div className="holidays-section">
          <label>Jours Fériés</label>
          <div className="tags-container">
            {activeProfile.holidays.map(h => (
              <span key={h.id} className="tag">
                {h.name} <small>{h.date.slice(5)}</small>
                <button onClick={() => updateProfile('holidays', activeProfile.holidays.filter(x => x.id !== h.id))}>×</button>
              </span>
            ))}
          </div>
          <div className="add-row">
            <input placeholder="Fête..." value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} />
            <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} />
            <button className="btn-icon" onClick={addHoli}>+</button>
          </div>
        </div>

        <div className="backup-row">
          <button className="btn-secondary" onClick={() => exportBackup(data)}>📤 Sauvegarder</button>
          <label className="btn-secondary">
            📥 Restaurer
            <input type="file" accept=".json" onChange={handleImport} hidden />
          </label>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="timeline-container">
        {timeline.map((item, index) => {
          // Dynamic Label Logic
          let count = 0;
          for(let i=0; i<=index; i++) if(activeProfile.blocks[i].type === 'TRAVAIL') count++;
          const label = item.type === 'CONGE_ANNUEL' ? 'Grand Congé' : item.type === 'TRAVAIL' ? `Rotation ${count}` : `Repos ${count}`;
          
          // Gap/Warn Logic
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
               msg = "⛔ Risque Vague"; colorClass="danger";
             }
          }

          return (
            <div key={item.id} className={`card timeline-item ${item.type.toLowerCase()}`}>
              <div className="item-top">
                <span className="badge">{item.type.charAt(0)}</span>
                <span className="item-title">{label}</span>
                <button className="btn-xs" onClick={() => updateProfile('blocks', activeProfile.blocks.filter(b => b.id !== item.id))}>×</button>
              </div>

              {msg && <div className={`status-pill ${colorClass}`}>{msg}</div>}

              <div className="date-grid">
                <div className="field">
                  <span>Début</span>
                  <input type="date" value={item.computedStart} disabled />
                </div>
                <div className="field">
                  <span>Fin</span>
                  <input type="date" value={item.computedEnd} onChange={e => updateEnd(item.id, e.target.value, item.computedStart)} />
                </div>
                <div className="field small">
                  <span>Jours</span>
                  <input type="number" value={item.duration} onChange={e => updateBlock(item.id, 'duration', +e.target.value)} />
                </div>
              </div>
              
              {item.conflicts.length > 0 && (
                <div className="conflict-box">
                  {item.conflicts.map(c => <div key={c.id}>🧨 {c.name} ({c.date})</div>)}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* FOOTER */}
      <footer className="footer-credits">
        PermiPlan v2.0 • Dr Kibeche
      </footer>

      {/* FABs */}
      <div className="fab-zone">
        <button className="fab main" onClick={() => updateProfile('blocks', [...activeProfile.blocks, {id: Date.now(), type:'TRAVAIL', duration:45}, {id: Date.now()+1, type:'PERMISSION', duration:15}])}>+ Cycle</button>
        <button className="fab sub" onClick={() => updateProfile('blocks', [...activeProfile.blocks, {id: Date.now(), type:'CONGE_ANNUEL', duration:30}])}>+ Congé</button>
      </div>
    </div>
  );
}

export default App;