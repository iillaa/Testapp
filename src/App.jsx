import React, { useState, useEffect, useMemo, useRef } from 'react';
import { calculateTimeline } from './utils/logic';
import { loadAllData, saveData, createNewProfile, exportBackup } from './utils/storage';
import './App.css';

// Helpers moved outside to prevent re-declaration
const getAvatar = (name) => name ? name.charAt(0).toUpperCase() : "?";

const getPos = (h, s, e) => {
  // CORRECTION: 'e' is inclusive. Total duration is (e - s) + 1 day (86400000ms)
  const totalDuration = (new Date(e) - new Date(s)) + 86400000;
  // Protect against zero duration just in case
  if (totalDuration <= 0) return "DÉBUT";
  
  const r = (new Date(h) - new Date(s)) / totalDuration;
  return r < 0.33 ? "DÉBUT" : r > 0.66 ? "FIN" : "MILIEU";
};

function App() {
  // --- GLOBAL STATE ---
  const [data, setData] = useState(loadAllData);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "" });
  const fileInputRef = useRef(null);
  
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
        alert("Restauré avec succès !");
      } catch { alert("Fichier invalide"); }
    };
    if (e.target.files[0]) r.readAsText(e.target.files[0]);
  };

  const waves = useMemo(() => {
    const list = [];
    const startSeason = new Date(`${activeProfile.refYear}-06-01`);
    const endSeason = new Date(`${activeProfile.refYear + 1}-05-31`);
    let currentWaveDate = new Date(startSeason);
    let index = 1;

    while (currentWaveDate <= endSeason) {
        list.push({ 
            id: index, 
            label: `Vague ${index}`, 
            date: currentWaveDate.toISOString().split('T')[0] 
        });
        currentWaveDate.setDate(currentWaveDate.getDate() + 50);
        index++;
    }
    return list;
  }, [activeProfile.refYear]);

  useEffect(() => {
    if (!activeProfile.targetWaveDate && waves.length > 0) updateProfile('targetWaveDate', waves[0].date);
  }, [waves, activeProfile.targetWaveDate]);

  const timeline = useMemo(() => 
    calculateTimeline(activeProfile.startDate, activeProfile.blocks, activeProfile.holidays), 
  [activeProfile.startDate, activeProfile.blocks, activeProfile.holidays]);

  const dashboardState = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentBlockIndex = timeline.findIndex(item => {
      const s = new Date(item.computedStart);
      const e = new Date(item.computedEnd);
      // CORRECTION: <= because 'e' is now inclusive (last day of block)
      return today >= s && today <= e;
    });

    if (currentBlockIndex === -1) {
      const firstStart = new Date(activeProfile.startDate);
      if (today < firstStart) return { label: "En attente", percent: 0, color: "var(--text-muted)" };
      return { label: "Planning terminé", percent: 100, color: "var(--success)" };
    }

    const currentBlock = timeline[currentBlockIndex];
    const nextBlock = timeline[currentBlockIndex + 1];
    const start = new Date(currentBlock.computedStart).getTime();
    
    // CORRECTION: Add 1 day to 'end' for the math (to represent full duration)
    const end = new Date(currentBlock.computedEnd).getTime() + 86400000;
    
    const percent = Math.min(Math.max(Math.round(((today.getTime() - start) / (end - start)) * 100), 0), 100);

    let label = "";
    let color = "var(--primary)";

    if (currentBlock.type === 'TRAVAIL') {
      label = nextBlock?.type === 'CONGE_ANNUEL' ? `Dernière ligne droite` : `Au Travail`;
    } 
    else if (currentBlock.type === 'PERMISSION') {
      color = "#10b981";
      label = `En Repos`;
    }
    else if (currentBlock.type === 'CONGE_ANNUEL') {
      color = "#FF6700";
      label = `Vacances`;
    }
    return { label, percent, color };
  }, [timeline, activeProfile.startDate]);

  const getSeqError = (idx, type) => {
    if (idx === 0) return null;
    const prev = activeProfile.blocks[idx-1];
    if (!prev) return null;
    if (type === 'TRAVAIL' && prev.type === 'TRAVAIL') return "⚠️ 2 ROTATIONS SUITE";
    if (type === 'PERMISSION' && prev.type === 'PERMISSION') return "⚠️ 2 PERMISSIONS SUITE";
    return null;
  };

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
    // CORRECTION: Add +1 because the range is inclusive (Start to End = Duration)
    // If Start=16, End=16, Diff=0 -> Duration must be 1.
    if (diff >= 0) updateBlock(id, 'duration', diff + 1);
  };

  return (
    <div className="container">
      <header className="main-header">
        <h1 className="app-title-main">Permi-Plan <span className="version-tag">v2.0</span></h1>
        
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
            <button className="btn-mini btn-danger-text" onClick={handleDeleteProfile}>Del</button>
        </div>

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
      
      <section className="card">
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
              <div key={h.id} className="tag-row">
                <span className="tag-name">{h.name}</span>
                <span className="tag-date">{h.date}</span>
                <button className="btn-delete" onClick={() => updateProfile('holidays', activeProfile.holidays.filter(x => x.id !== h.id))}>×</button>
              </div>
            ))}
          </div>
          <div className="add-row">
            <input type="text" placeholder="Nom..." value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} className="input-name" />
            <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="input-date" />
            <button className="btn-icon-plus" onClick={addHoli}>+</button>
          </div>
        </div>
      
        <div className="backup-row">
          <button className="btn-secondary" onClick={() => exportBackup(data)}>📤 Export</button>
          <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>📥 Import</button>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} />
        </div>
      </section>

      <section className="timeline-container">
        {timeline.map((item, index) => {
          let count = 0;
          for(let i=0; i<=index; i++) if(activeProfile.blocks[i]?.type === 'TRAVAIL') count++;
          
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
                <button className="btn-delete-x" onClick={() => updateProfile('blocks', activeProfile.blocks.filter(b => b.id !== item.id))}>✕</button>
              </div>

              {seqErr && <div className="status-pill danger">{seqErr}</div>}
              {msg && <div className={`status-pill ${colorClass}`}>{msg}</div>}

              <div className="date-grid">
                <div className="field">
                  <label>Du (Fixe)</label>
                  <input type="date" value={item.computedStart} disabled />
                </div>
                <div className="field">
                  <label>Au (Fin)</label>
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

      <div className="fab-zone">
        <button className="fab main" onClick={() => {
          const now = Date.now();
          updateProfile('blocks', [...activeProfile.blocks, {id: `T-${now}`, type:'TRAVAIL', duration:45}, {id: `P-${now+1}`, type:'PERMISSION', duration:15}]);
        }}>
          + Cycle
        </button>
        <button className="fab sub" onClick={() => updateProfile('blocks', [...activeProfile.blocks, {id: `C-${Date.now()}`, type:'CONGE_ANNUEL', duration:50}])}>
          + Congé
        </button>
      </div>
      <footer className="app-footer">
        <div className="footer-divider"></div>
        <p className="dev-credit">Developed by</p>
        <p className="dev-name">Dr. Kibeche Ali Dia Eddine</p>
      </footer>
    </div> // End of container
  );
}

export default App;