import React from 'react';
import { Line } from 'react-chartjs-2';

export default function CarbonChart({ data }) {
  const labels = data.map(d => d.year);
  const annual = data.map(d => d.annual);
  const cumulative = data.map(d => d.cumulative);

  return (
    <div className="chart-card">
      <h3>Carbon sequestration</h3>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'Annual C (tC)',
              data: annual,
              borderColor: '#4caf50',
              fill: false
            },
            {
              label: 'Cumulative C (tC)',
              data: cumulative,
              borderColor: '#388e3c',
              fill: false
            }
          ]
        }}
      />
    </div>
  );
}