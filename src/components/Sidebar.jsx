import React from 'react';
import { Slider, InputNumber, Select, Switch } from 'antd';
const { Option } = Select;

export default function Sidebar({ inputs, onChange }) {
  return (
    <div className="sidebar">
      <label>Area (m²)
        <Slider min={10} max={1000} value={inputs.area} onChange={onChange('area')} />
      </label>
      <label>Climate zone
        <Select value={inputs.zone} onChange={onChange('zone')} style={{ width: '100%' }}>
          <Option value="temperate">Temperate</Option>
          <Option value="tropical">Tropical</Option>
        </Select>
      </label>
      <label>Density (saplings/m²)
        <InputNumber min={1} max={10} value={inputs.density} onChange={onChange('density')} />
      </label>
      <label>Species count
        <InputNumber min={1} max={100} value={inputs.species} onChange={onChange('species')} />
      </label>
      <label>Timeframe (years)
        <Slider min={1} max={30} value={inputs.years} onChange={onChange('years')} />
      </label>
      <label>Irrigation (years)
        <InputNumber min={0} max={5} value={inputs.irrigationYears} onChange={onChange('irrigationYears')} />
      </label>
      <label>Soil amendment
        <Switch checked={inputs.soilAmend} onChange={onChange('soilAmend')} />
      </label>
    </div>
  );
}