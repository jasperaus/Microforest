import React, { useState } from 'react';
import AirplaneBoardingSimulator from './components/AirplaneBoardingSimulator';
import IronCadetsGame from './game/index.jsx';
import './App.css';

const APPS = {
  home: 'home',
  boarding: 'boarding',
  game: 'game',
};

function HomeCard({ title, subtitle, icon, color, description, badge, onClick, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: 200,
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 0.15s, box-shadow 0.15s',
        border: '1px solid #e0e0f0',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.18)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.1)';
      }}
    >
      {/* Colored top banner */}
      <div style={{
        background: color,
        padding: '20px 0',
        textAlign: 'center',
        fontSize: 44,
        position: 'relative',
      }}>
        {icon}
        {badge && (
          <span style={{
            position: 'absolute', top: 8, right: 10,
            background: '#ff4444', color: '#fff',
            fontSize: 9, fontWeight: 'bold',
            padding: '2px 6px', borderRadius: 10,
            letterSpacing: 0.5,
          }}>{badge}</span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 8, fontStyle: 'italic' }}>{subtitle}</div>
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{description}</div>
      </div>
    </div>
  );
}

function HomeScreen({ onLaunch }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🌿</div>
        <h1 style={{ color: '#ffffff', fontSize: 28, fontWeight: 700, margin: 0 }}>Microforest Lab</h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 6 }}>
          Simulations, dashboards & games
        </p>
      </div>

      {/* App cards */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <HomeCard
          title="Iron Cadets"
          subtitle="BattleTech Tactical RPG"
          icon="🤖"
          color="linear-gradient(135deg, #1a1040, #0a2040)"
          description="Command a squad of mechs in turn-based tactical combat. 5 missions, pixel art, special abilities!"
          badge="NEW"
          onClick={() => onLaunch(APPS.game)}
        />
        <HomeCard
          title="Boarding Simulator"
          subtitle="Airplane Boarding Research"
          icon="✈️"
          color="linear-gradient(135deg, #1a3a6a, #0a2040)"
          description="Simulate and compare 6 different airplane boarding strategies with live visualisation."
          onClick={() => onLaunch(APPS.boarding)}
        />
      </div>

      <div style={{ marginTop: 48, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
        Microforest Lab · Built with React + Phaser 3
      </div>
    </div>
  );
}

export default function App() {
  const [activeApp, setActiveApp] = useState(APPS.home);

  if (activeApp === APPS.game) {
    return <IronCadetsGame onBack={() => setActiveApp(APPS.home)} />;
  }

  if (activeApp === APPS.boarding) {
    return (
      <div>
        <div style={{
          background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <button
            onClick={() => setActiveApp(APPS.home)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            ← Home
          </button>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Airplane Boarding Simulator</span>
        </div>
        <AirplaneBoardingSimulator />
      </div>
    );
  }

  return <HomeScreen onLaunch={setActiveApp} />;
}
