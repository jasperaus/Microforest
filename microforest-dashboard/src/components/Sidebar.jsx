import React from 'react';
import { InputNumber, Select, Switch, Slider, Divider } from 'antd';

const { Option } = Select;

export default function Sidebar({ inputs, onChange }) {
  return (
    <aside className="sidebar">
      <h2>Parameters</h2>
      <label>
        Area (m²)
        <InputNumber
          min={10}
          max={100000}
          value={inputs.area}
          onChange={onChange('area')}
          step={10}
          style={{ width: '100%' }}
        />
      </label>
      <label>
        Zone
        <Select
          value={inputs.zone}
          onChange={onChange('zone')}
          style={{ width: '100%' }}
        >
          <Option value="temperate">Temperate</Option>
          <Option value="tropical">Tropical</Option>
          <Option value="arid">Arid</Option>
        </Select>
      </label>
      <label>
        Density (trees/m²)
        <Slider
          min={1}
          max={10}
          step={1}
          value={inputs.density}
          onChange={onChange('density')}
        />
      </label>
      <label>
        Number of Species
        <InputNumber
          min={1}
          max={100}
          value={inputs.species}
          onChange={onChange('species')}
          style={{ width: '100%' }}
        />
      </label>
      <label>
        Years Projected
        <Slider
          min={1}
          max={50}
          value={inputs.years}
          onChange={onChange('years')}
        />
      </label>
      <Divider />
      <label>
        Soil Amendment
        <Switch
          checked={inputs.soilAmend}
          onChange={onChange('soilAmend')}
        />
      </label>
      <label>
        Years of Irrigation
        <InputNumber
          min={0}
          max={10}
          value={inputs.irrigationYears}
          onChange={onChange('irrigationYears')}
          style={{ width: '100%' }}
        />
      </label>
    </aside>
  );
}