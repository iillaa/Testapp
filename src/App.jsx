// src/App.jsx
import React, { useState, useEffect } from 'react';
import { calculateTimeline, addDays } from './utils/logic';
import './App.css'; // Assure-toi d'avoir un fichier CSS basique

function App() {
  // CONFIGURATION INITIALE
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Ici on définit tes "Blocs" flexibles. 
  // Tu peux en ajouter autant que tu veux pour simuler l'année.
  const [blocks, setBlocks] = useState([
    { id: 1, type: 'TRAVAIL', duration: 50, label: 'Rotation 1' },
    { id: 2, type: 'PERMISSION', duration: 15, label: 'Repos 1' },
    { id: 3, type: 'TRAVAIL', duration: 50, label: 'Rotation 2' },
    { id: 4, type: 'PERMISSION', duration: 15, label: 'Repos 2' },
    { id: 5, type: 'TRAVAIL', duration: 45, label: 'Rotation 3' },
    { id: 6, type: 'CONGE_ANNUEL', duration: 50, label: 'Grand Congé' },
  ]);

  const [timeline, setTimeline] = useState([]);

  // Recalculer la timeline à chaque changement
  useEffect(() => {
    const computed = calculateTimeline(startDate, blocks);
    setTimeline(computed);
  }, [startDate, blocks]);

  // Fonction pour changer la durée d'un bloc spécifique
  const updateDuration = (id, newDuration) => {
    setBlocks(blocks.map(b => 
      b.id === id ? { ...b, duration: parseInt(newDuration) } : b
    ));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Planificateur de Rotation</h1>
      
      {/* Date de départ globale */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
        <label><strong>Date de Reprise (Start):</strong> </label>
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
        />
      </div>

      {/* La Timeline */}
      <div className="timeline">
        {timeline.map((item, index) => (
          <div key={item.id} style={{ 
            borderLeft: `5px solid ${item.type === 'TRAVAIL' ? '#ff4444' : '#4caf50'}`,
            marginBottom: '15px', padding: '10px', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{item.type} ({item.label})</strong>
              
              {/* Le Slider Magique */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="number" 
                  value={item.duration} 
                  onChange={(e) => updateDuration(item.id, e.target.value)}
                  style={{ width: '50px', padding: '5px' }}
                />
                <span>jours</span>
              </div>
            </div>

            <div style={{ marginTop: '10px', color: '#555' }}>
              {item.computedStart} ➝ <strong>{item.computedEnd}</strong>
            </div>

            {/* Avertissement Collisions Aïd */}
            {item.conflicts.length > 0 && (
              <div style={{ 
                marginTop: '10px', 
                padding: '8px', 
                backgroundColor: item.type === 'TRAVAIL' ? '#ffebee' : '#e8f5e9',
                color: item.type === 'TRAVAIL' ? '#c62828' : '#2e7d32',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {item.type === 'TRAVAIL' ? '⚠️ DANGER: ' : '✅ SUCCÈS: '}
                Tu seras ici pour : {item.conflicts.map(c => c.name).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <button onClick={() => alert("Sauvegardé (Simulation)")} style={{ width: '100%', padding: '15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px' }}>
        Sauvegarder ce Scénario
      </button>
    </div>
  );
}

export default App;
