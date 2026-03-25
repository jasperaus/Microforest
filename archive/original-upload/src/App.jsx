import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Main from './components/Main';
import calcEngine from './utils/calcEngine';
import coefs from './data/coefs.json';

export default function App() {
  const [inputs, setInputs] = useState({
    area: 100, zone: 'temperate', density: 3,
    species: 20, years: 10, soilAmend: true, irrigationYears: 2,
  });

  const handleChange = field => value =>
    setInputs(prev => ({ ...prev, [field]: value }));

  const results = useMemo(() => calcEngine(inputs, coefs), [inputs]);

  return (
    <div className="app">
      <Sidebar inputs={inputs} onChange={handleChange}/>
      <Main results={results}/>
    </div>
  );
}