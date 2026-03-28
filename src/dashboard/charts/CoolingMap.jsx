import React, { useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';

function ClickHandler({ setCenter }) {
  useMapEvents({ click(e) { setCenter(e.latlng); } });
  return null;
}

export default function CoolingMap({ data }) {
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const latest = data[data.length - 1];
  const radius = latest.reduction * 100;

  return (
    <div className="chart-card">
      <h3>Urban cooling footprint</h3>
      <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: 300 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler setCenter={setCenter} />
        <Circle center={[center.lat, center.lng]} radius={radius} pathOptions={{ color: 'blue', fillOpacity: 0.3 }} />
        {(center.lat !== 0 || center.lng !== 0) && <Marker position={[center.lat, center.lng]} />}
      </MapContainer>
      <p>
        Peak cooling: <strong>{latest.reduction.toFixed(2)} °C</strong><br/>
        Radius: <strong>{radius.toFixed(0)} m</strong>
      </p>
    </div>
  );
}