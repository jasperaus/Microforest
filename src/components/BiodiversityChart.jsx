import React from 'react';
import { Bar } from 'react-chartjs-2';

export default function BiodiversityChart({ data }) {
  const labels = data.map(d => d.year);
  const values = data.map(d => d.index);

  return (
    <div className="chart-card">
      <h3>Biodiversity index</h3>
      <Bar
        data={{
          labels,
          datasets: [
            { label: 'Index', data: values, backgroundColor: '#ff9800' }
          ]
        }}
      />
    </div>
  );
}