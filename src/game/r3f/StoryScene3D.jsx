import React, { useState, useEffect } from 'react';
import campaignsData from '../data/campaigns.json';

const S = {
  root: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#07070f',
    fontFamily: 'monospace', color: '#aaccff',
    userSelect: 'none',
  },
  panel: {
    width: 620, padding: '40px 48px',
    border: '2px solid #00eedd44',
    background: 'rgba(0,10,20,0.85)',
    boxShadow: '0 0 40px #00eedd22',
  },
  missionLabel: { fontSize: 11, letterSpacing: 4, color: '#00eedd', marginBottom: 8 },
  title:    { fontSize: 28, fontWeight: 'bold', color: '#00eedd', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#88aacc', marginBottom: 20 },
  objective:{ fontSize: 13, color: '#ffcc44', marginBottom: 20 },
  story:    { fontSize: 13, lineHeight: '1.7', color: '#99b8cc', marginBottom: 32, minHeight: 80 },
  btn: {
    padding: '12px 36px', background: 'transparent',
    border: '2px solid #00eedd', color: '#00eedd',
    fontSize: 14, fontFamily: 'monospace', letterSpacing: 2, cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

/** Fade-in wrapper with a staggered delay. */
function FadeIn({ delay = 0, children, style }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function StoryScene3D({ missionIndex, onContinue }) {
  const mission = campaignsData[missionIndex] ?? campaignsData[0];
  const [hover, setHover] = useState(false);

  // Typewriter effect for story text
  const [displayedStory, setDisplayedStory] = useState('');
  useEffect(() => {
    setDisplayedStory('');
    const fullText = mission.story;
    let i = 0;
    // Start typing after header elements have faded in (~600ms)
    const startDelay = setTimeout(() => {
      const iv = setInterval(() => {
        i += 1;
        setDisplayedStory(fullText.slice(0, i));
        if (i >= fullText.length) clearInterval(iv);
      }, 16); // ~16ms per char → ~2 s for 120 chars
      return () => clearInterval(iv);
    }, 600);
    return () => clearTimeout(startDelay);
  }, [mission.story]);

  // Button appears only after story is fully typed (or after 3 s, whichever first)
  const [btnVisible, setBtnVisible] = useState(false);
  useEffect(() => {
    setBtnVisible(false);
    const t = setTimeout(() => setBtnVisible(true), Math.max(600 + mission.story.length * 16 + 200, 2000));
    return () => clearTimeout(t);
  }, [mission.story]);

  return (
    <div style={S.root}>
      <div style={S.panel}>

        <FadeIn delay={80}>
          <div style={S.missionLabel}>MISSION {missionIndex + 1}</div>
        </FadeIn>

        <FadeIn delay={200}>
          <div style={S.title}>{mission.name.toUpperCase()}</div>
        </FadeIn>

        <FadeIn delay={320}>
          <div style={S.subtitle}>{mission.subtitle}</div>
        </FadeIn>

        <FadeIn delay={440}>
          <div style={S.objective}>▸ Objective: {mission.objective}</div>
        </FadeIn>

        {/* Typewriter story text */}
        <div style={S.story}>
          {displayedStory}
          {/* Blinking cursor while typing */}
          {displayedStory.length < mission.story.length && (
            <span style={{ borderRight: '2px solid #99b8cc', animation: 'blink 0.7s step-end infinite', marginLeft: 1 }} />
          )}
        </div>

        {/* Deploy button fades in after story finishes */}
        <div style={{
          transition: 'opacity 0.6s ease',
          opacity: btnVisible ? 1 : 0,
          pointerEvents: btnVisible ? 'auto' : 'none',
        }}>
          <button
            style={{ ...S.btn, ...(hover ? { background: '#00eedd22' } : {}) }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={onContinue}
          >
            DEPLOY ▶
          </button>
        </div>

      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
