// src/App.jsx
import React, { useState, useEffect } from 'react';
import { calculateTimeline } from './utils/logic';
import './App.css'; // Assure-toi que ce fichier existe, même vide

function App() {
  // --- ÉTAT (STATE) ---
  
  // 1. Date de départ (Reprise du travail)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // 2. Liste des Jours Fériés (Gérée manuellement)
  const [holidays, setHolidays] = useState([
    { id: 1, name: "Aïd el-Fitr (Est.)", date: "2026-03-20" }, // Exemple par défaut
    { id: 2, name: "Aïd al-Adha (Est.)", date: "2026-05-27" }
  ]);
  
  // États temporaires pour le formulaire d'ajout de fête
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  // 3. Les Blocs de Rotation (Squelette initial)
  const [blocks, setBlocks] = useState([
    { id: 1, type: 'TRAVAIL', duration: 45, label: 'Rotation 1' },
    { id: 2, type: 'PERMISSION', duration: 15, label: 'Repos 1' },
    { id: 3, type: 'TRAVAIL', duration: 50, label: 'Rotation 2' },
    { id: 4, type: 'PERMISSION', duration: 15, label: 'Repos 2' },
    { id: 5, type: 'TRAVAIL', duration: 45, label: 'Rotation 3' },
    { id: 6, type: 'CONGE_ANNUEL', duration: 50, label: 'Grand Congé' },
  ]);

  const [timeline, setTimeline] = useState([]);

  // --- LOGIQUE ---

  // Recalculer la timeline à chaque changement (date, blocs ou fêtes)
  useEffect(() => {
    const computed = calculateTimeline(startDate, blocks, holidays);
    setTimeline(computed);
  }, [startDate, blocks, holidays]);

  // Gestion des BLOCS
  const updateDuration = (id, newDuration) => {
    setBlocks(blocks.map(b => 
      b.id === id ? { ...b, duration: parseInt(newDuration) || 0 } : b
    ));
  };

  const addNewCycle = () => {
    const lastIndex = blocks.length - 1; 
    const newId = Math.max(...blocks.map(b => b.id), 0) + 1;
    const newCycle = [
      { id: newId, type: 'TRAVAIL', duration: 45, label: 'Extra Work' },
      { id: newId + 1, type: 'PERMISSION', duration: 15, label: 'Extra Repos' }
    ];
    // Insérer avant le Grand Congé (dernier élément)
    const newBlocks = [...blocks.slice(0, lastIndex), ...newCycle, blocks[lastIndex]];
    setBlocks(newBlocks);
  };

  const removeBlock = (id) => {
    // Empêcher la suppression du bloc "Conge Annuel" pour garder la structure
    const block = blocks.find(b => b.id === id);
    if (block && block.type === 'CONGE_ANNUEL') {
      alert("Impossible de supprimer le Grand Congé final.");
      return;
    }
    setBlocks(blocks.filter(b => b.id !== id));
  };

  // Gestion des FÊTES
  const addHoliday = () => {
    if (!newHolidayName || !newHolidayDate) return;
    setHolidays([...holidays, { id: Date.now(), name: newHolidayName, date: newHolidayDate }]);
    setNewHolidayName("");
    setNewHolidayDate("");
  };

  const removeHoliday = (id) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  // --- RENDU (UI) ---
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Planificateur de Rotation</h1>

      {/* SECTION 1: CONFIGURATION (Dates & Fêtes) */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <h3>1. Configuration</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label><strong>Date de Reprise (Start):</strong> </label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </div>

        <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <strong>Jours Fériés & Événements Clés :</strong>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {holidays.map(h => (
              <li key={h.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', background: '#fff', padding: '5px', border: '1px solid #eee' }}>
                <span>📅 {h.date} - <strong>{h.name}</strong></span>
                <button onClick={() => removeHoliday(h.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>✖</button>
              </li>
            ))}
          </ul>
          
          <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
            <input 
              type="text" 
              placeholder="Nom (ex: Anniversaire)" 
              value={newHolidayName}
              onChange={(e) => setNewHolidayName(e.target.value)}
              style={{ flex: 1, padding: '5px' }}
            />
            <input 
              type="date" 
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              style={{ padding: '5px' }}
            />
            <button onClick={addHoliday} style={{ padding: '5px 15px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>Ajouter</button>
          </div>
        </div>
      </div>

      {/* SECTION 2: ACTIONS */}
      <div style={{ marginBottom: '20px' }}>
         <button 
          onClick={addNewCycle}
          style={{ width: '100%', padding: '10px', background: '#e3f2fd', color: '#0d47a1', border: '1px dashed #0d47a1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Insérer une Rotation Imprévue
        </button>
      </div>

      {/* SECTION 3: TIMELINE (Visualisation) */}
      <div className="timeline">
        {timeline.map((item) => (
          <div key={item.id} style={{ 
            borderLeft: `6px solid ${item.type === 'TRAVAIL' ? '#d32f2f' : item.type === 'CONGE_ANNUEL' ? '#fbc02d' : '#388e3c'}`,
            marginBottom: '15px', padding: '15px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <strong style={{ fontSize: '1.1em', color: '#333' }}>{item.type}</strong>
                <span style={{ color: '#666', marginLeft: '10px', fontSize: '0.9em' }}>({item.label})</span>
              </div>
              
              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="number" 
                  value={item.duration} 
                  onChange={(e) => updateDuration(item.id, e.target.value)}
                  style={{ width: '60px', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}
                />
                <span style={{ fontSize: '0.9em' }}>jours</span>
                {item.type !== 'CONGE_ANNUEL' && (
                  <button onClick={() => removeBlock(item.id)} style={{ marginLeft: '5px', color: '#999', background: 'none', border: 'none', cursor: 'pointer' }} title="Supprimer ce bloc">🗑️</button>
                )}
              </div>
            </div>

            <div style={{ background: '#eee', padding: '5px 10px', borderRadius: '4px', display: 'inline-block', fontSize: '0.9em' }}>
              {item.computedStart}  ➜  <strong>{item.computedEnd}</strong>
            </div>

            {/* ALERTES COLLISIONS */}
            {item.conflicts.length > 0 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '10px', 
                backgroundColor: item.type === 'TRAVAIL' ? '#ffebee' : '#e8f5e9',
                border: `1px solid ${item.type === 'TRAVAIL' ? '#ef9a9a' : '#a5d6a7'}`,
                color: item.type === 'TRAVAIL' ? '#c62828' : '#2e7d32',
                borderRadius: '6px',
                fontWeight: 'bold',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '1.5em' }}>{item.type === 'TRAVAIL' ? '⚠️' : '🎉'}</span>
                <div>
                  <div>{item.type === 'TRAVAIL' ? 'ATTENTION : Tu travailles pendant :' : 'SUPER : Tu es libre pour :'}</div>
                  <div style={{ marginTop: '2px' }}>{item.conflicts.map(c => c.name).join(', ')}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
