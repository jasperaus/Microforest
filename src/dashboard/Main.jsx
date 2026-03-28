import React from 'react';
import CarbonChart from './charts/CarbonChart';
import BiodiversityChart from './charts/BiodiversityChart';
import CoolingMap from './charts/CoolingMap';

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