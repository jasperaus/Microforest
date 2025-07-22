import React from 'react';
import CarbonChart from './CarbonChart';
import BiodiversityChart from './BiodiversityChart';
import CoolingMap from './CoolingMap';

export default function Main({ results }) {
  return (
    <div className="main">
      <div className="charts-row">
        <CarbonChart data={results.carbon} />
        <BiodiversityChart data={results.biodiversity} />
      </div>
      <div className="charts-row">
        <CoolingMap data={results.cooling} />
      </div>
    </div>
  );
}