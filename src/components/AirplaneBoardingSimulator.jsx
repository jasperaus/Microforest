import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Select, Slider, Button, Card, Row, Col, Statistic, Tag, Progress,
  Divider, Tooltip, Switch,
} from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined,
  ThunderboltOutlined, BarChartOutlined,
} from '@ant-design/icons';
import {
  createSimulation, stepSimMutable, runToCompletion,
  ROWS, SEAT_LABELS, SEAT_TYPES, STRATEGY_META, formatTime,
} from '../simulation/boardingEngine';

const { Option } = Select;

// ── SVG plane layout constants ────────────────────────────────────────────────
const SEAT_W = 17;
const SEAT_H = 11;
const COL_STEP = 21;   // seat width + gap
const AISLE_W = 20;
const ROW_STEP = 15;
const HEADER_H = 22;
const PAD_LEFT = 32;   // space for row numbers
const PAD_RIGHT = 12;
const PAD_BOTTOM = 16;

// x positions for each seat column (0=A … 5=F)
const COL_X = [
  PAD_LEFT,                              // A (window-left)
  PAD_LEFT + COL_STEP,                   // B (middle-left)
  PAD_LEFT + COL_STEP * 2,              // C (aisle-left)
  PAD_LEFT + COL_STEP * 3 + AISLE_W,   // D (aisle-right)
  PAD_LEFT + COL_STEP * 4 + AISLE_W,   // E (middle-right)
  PAD_LEFT + COL_STEP * 5 + AISLE_W,   // F (window-right)
];
const AISLE_CX = PAD_LEFT + COL_STEP * 3 + AISLE_W / 2;
const SVG_W = PAD_LEFT + COL_STEP * 5 + AISLE_W + SEAT_W + PAD_RIGHT; // ≈ 200
const SVG_H = HEADER_H + ROWS * ROW_STEP + PAD_BOTTOM;

const SEAT_COLORS = {
  empty: '#e8e8e8',
  window: '#52c41a',
  middle: '#73d13d',
  aisle: '#95de64',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function seatColor(seated, seatType) {
  if (!seated) return SEAT_COLORS.empty;
  return SEAT_COLORS[seatType] ?? SEAT_COLORS.window;
}

// ── Plane SVG component ───────────────────────────────────────────────────────
function PlaneSVG({ sim, showCarryOn }) {
  if (!sim) return null;
  const { seats, passengers, aisleOccupancy, seatedCount, totalPassengers, queueIdx, queue } = sim;

  // Build aisle passenger map: aislePos -> {id, state, hasCarryOn}
  const inAisle = new Map();
  for (const p of passengers) {
    if (p.state === 'walking' || p.state === 'loading') {
      inAisle.set(p.aislePos, p);
    }
  }

  // Queue preview (next few waiting)
  const queuePreview = [];
  for (let i = queueIdx; i < Math.min(queueIdx + 8, queue.length); i++) {
    queuePreview.push(i - queueIdx);
  }

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      style={{ display: 'block', margin: '0 auto', userSelect: 'none' }}
      aria-label="Airplane boarding visualization"
    >
      {/* Plane body background */}
      <rect x={PAD_LEFT - 4} y={0} width={SVG_W - PAD_LEFT + 4 - PAD_RIGHT + 8} height={SVG_H}
        fill="#f0f4ff" rx={8} />

      {/* Aisle */}
      <rect x={AISLE_CX - AISLE_W / 2} y={HEADER_H - 2}
        width={AISLE_W} height={ROWS * ROW_STEP + 4}
        fill="#e4e8f0" rx={2} />

      {/* Seat column labels */}
      {SEAT_LABELS.map((lbl, i) => (
        <text key={i} x={COL_X[i] + SEAT_W / 2} y={14}
          textAnchor="middle" fontSize={9} fill="#888" fontWeight="bold">
          {lbl}
        </text>
      ))}

      {/* Seats */}
      {seats.map((rowArr, rowIdx) => {
        const y = HEADER_H + rowIdx * ROW_STEP;
        const showRowNum = (rowIdx + 1) % 5 === 0 || rowIdx === 0;
        return (
          <g key={rowIdx}>
            {showRowNum && (
              <text x={PAD_LEFT - 6} y={y + SEAT_H / 2 + 3}
                textAnchor="end" fontSize={8} fill="#aaa">
                {rowIdx + 1}
              </text>
            )}
            {SEAT_LABELS.map((_, si) => (
              <rect key={si}
                x={COL_X[si]} y={y}
                width={SEAT_W} height={SEAT_H}
                fill={seatColor(rowArr[si], SEAT_TYPES[si])}
                rx={2} stroke="#d8d8d8" strokeWidth={0.5}
              />
            ))}
            {/* Row divider (subtle) */}
            <line x1={PAD_LEFT - 4} y1={y + SEAT_H + 1}
              x2={SVG_W - PAD_RIGHT} y2={y + SEAT_H + 1}
              stroke="#e8e8e8" strokeWidth={0.3} />
          </g>
        );
      })}

      {/* Passengers in aisle */}
      {Array.from(inAisle.entries()).map(([pos, p]) => {
        const cx = AISLE_CX;
        const cy = HEADER_H + pos * ROW_STEP + SEAT_H / 2;
        const fill = p.state === 'loading' ? '#ffc53d' : '#1677ff';
        const ring = p.hasCarryOn && showCarryOn ? '#ff7a45' : 'white';
        return (
          <g key={p.id}>
            <circle cx={cx} cy={cy} r={6} fill={fill} stroke={ring} strokeWidth={1.5} />
            {p.state === 'loading' && (
              <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={6} fill="#333">✈</text>
            )}
          </g>
        );
      })}

      {/* Entry arrow + queue dots */}
      <text x={AISLE_CX} y={HEADER_H - 6} textAnchor="middle" fontSize={9} fill="#1677ff" fontWeight="bold">
        ▼
      </text>
      {queuePreview.map((i) => (
        <circle key={i}
          cx={AISLE_CX - 14 + i * 4}
          cy={6}
          r={2}
          fill={i === 0 ? '#1677ff' : '#bfbfbf'}
        />
      ))}
      {queue.length - queueIdx > 8 && (
        <text x={AISLE_CX + 20} y={9} fontSize={7} fill="#aaa">
          +{queue.length - queueIdx - 8}
        </text>
      )}

      {/* Seated count overlay */}
      <text x={SVG_W - PAD_RIGHT - 2} y={SVG_H - 3}
        textAnchor="end" fontSize={8} fill="#888">
        {seatedCount}/{totalPassengers}
      </text>
    </svg>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend({ showCarryOn }) {
  const items = [
    { color: SEAT_COLORS.empty, label: 'Empty seat' },
    { color: SEAT_COLORS.window, label: 'Seated (window)' },
    { color: SEAT_COLORS.middle, label: 'Seated (middle)' },
    { color: SEAT_COLORS.aisle, label: 'Seated (aisle)' },
    { color: '#1677ff', label: 'Walking', circle: true },
    { color: '#ffc53d', label: 'Loading baggage', circle: true },
  ];
  if (showCarryOn) {
    items.push({ color: '#ff7a45', label: 'Has carry-on', circle: true, ring: true });
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 8 }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {item.circle
            ? <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: item.color,
                border: item.ring ? `2px solid ${item.color}` : '1.5px solid white',
                boxShadow: '0 0 0 1px #ccc',
              }} />
            : <div style={{ width: 14, height: 10, borderRadius: 2, background: item.color, border: '1px solid #d8d8d8' }} />
          }
          <span style={{ fontSize: 11, color: '#666' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Simulator Component ──────────────────────────────────────────────────
export default function AirplaneBoardingSimulator() {
  const [, forceRender] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [strategy, setStrategy] = useState('back-to-front');
  const [carryOnProb, setCarryOnProb] = useState(0.65);
  const [entryInterval, setEntryInterval] = useState(2);
  const [showCarryOn, setShowCarryOn] = useState(true);
  const [compResults, setCompResults] = useState(null);
  const [runningComp, setRunningComp] = useState(false);
  const [activeTab, setActiveTab] = useState('simulation'); // 'simulation' | 'comparison'

  const simRef = useRef(null);
  const intervalRef = useRef(null);

  const opts = useMemo(() => ({ carryOnProb, entryInterval }), [carryOnProb, entryInterval]);

  const initSim = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    simRef.current = createSimulation(strategy, opts);
    forceRender(c => c + 1);
  }, [strategy, opts]);

  // Init on mount
  useEffect(() => { initSim(); }, []); // eslint-disable-line

  // Animation loop
  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      const sim = simRef.current;
      if (!sim || sim.done) {
        setRunning(false);
        return;
      }
      for (let i = 0; i < speed; i++) {
        if (sim.done) break;
        stepSimMutable(sim);
      }
      forceRender(c => c + 1);
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [running, speed]);

  const handleStart = () => {
    if (simRef.current?.done) initSim();
    setRunning(true);
  };
  const handlePause = () => setRunning(false);
  const handleReset = () => initSim();

  const handleRunComparison = useCallback(() => {
    setRunningComp(true);
    setTimeout(() => {
      const results = {};
      for (const s of STRATEGY_META) {
        results[s.key] = runToCompletion(s.key, opts);
      }
      setCompResults(results);
      setRunningComp(false);
      setActiveTab('comparison');
    }, 10);
  }, [opts]);

  const sim = simRef.current;

  // ── Chart data: boarding curve for current simulation ────────────────────
  const lineChartData = useMemo(() => {
    if (!sim || sim.statsHistory.length < 2) return null;
    const meta = STRATEGY_META.find(s => s.key === strategy);
    return {
      labels: sim.statsHistory.map(s => s.tick),
      datasets: [{
        label: meta?.label ?? strategy,
        data: sim.statsHistory.map(s => s.seated),
        borderColor: meta?.color ?? '#1677ff',
        backgroundColor: (meta?.color ?? '#1677ff') + '20',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      }],
    };
  }, [sim?.statsHistory?.length, strategy]); // eslint-disable-line

  // ── Comparison bar chart ─────────────────────────────────────────────────
  const barChartData = useMemo(() => {
    if (!compResults) return null;
    const labels = STRATEGY_META.map(s => s.label);
    const times = STRATEGY_META.map(s => compResults[s.key]?.completionTick ?? 0);
    return {
      labels,
      datasets: [{
        label: 'Boarding Time (seconds)',
        data: times,
        backgroundColor: STRATEGY_META.map(s => s.color + 'cc'),
        borderColor: STRATEGY_META.map(s => s.color),
        borderWidth: 2,
        borderRadius: 4,
      }],
    };
  }, [compResults]);

  // Comparison line chart (all strategies on same axis)
  const compLineData = useMemo(() => {
    if (!compResults) return null;
    return {
      datasets: STRATEGY_META.map(s => {
        const r = compResults[s.key];
        if (!r) return null;
        return {
          label: s.label,
          data: r.statsHistory.map(h => ({ x: h.tick, y: h.seated })),
          borderColor: s.color,
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        };
      }).filter(Boolean),
    };
  }, [compResults]);

  const pct = sim ? Math.round((sim.seatedCount / sim.totalPassengers) * 100) : 0;
  const currentMeta = STRATEGY_META.find(s => s.key === strategy);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => `Time: ${formatTime(items[0]?.label)}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Time (seconds)', font: { size: 11 } },
        ticks: {
          maxTicksLimit: 8,
          callback: (v) => formatTime(v),
          font: { size: 10 },
        },
      },
      y: {
        title: { display: true, text: 'Passengers Seated', font: { size: 11 } },
        max: 180,
        ticks: { font: { size: 10 } },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item) => ` ${formatTime(item.raw)} (${item.raw}s)`,
        },
      },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, maxRotation: 25 } },
      y: {
        title: { display: true, text: 'Boarding Time (seconds)', font: { size: 11 } },
        ticks: {
          callback: (v) => formatTime(v),
          font: { size: 10 },
        },
      },
    },
  };

  const compLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { font: { size: 10 }, boxWidth: 12, padding: 8 },
      },
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Time (seconds)', font: { size: 11 } },
        ticks: { callback: (v) => formatTime(v), font: { size: 10 }, maxTicksLimit: 8 },
      },
      y: {
        title: { display: true, text: 'Passengers Seated', font: { size: 11 } },
        max: 180,
        ticks: { font: { size: 10 } },
      },
    },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="abs-root">
      {/* Header */}
      <div className="abs-header">
        <div>
          <h1 className="abs-title">✈ Airplane Boarding Simulator</h1>
          <p className="abs-subtitle">
            Visual modelling tool for boarding strategies with human dynamics
          </p>
        </div>
        <div className="abs-tabs">
          {['simulation', 'comparison'].map(tab => (
            <button
              key={tab}
              className={`abs-tab${activeTab === tab ? ' abs-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'simulation' ? '▶ Simulation' : '📊 Compare All'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'simulation' && (
        <div className="abs-body">
          {/* Left: Plane + Legend */}
          <div className="abs-plane-col">
            <div className="abs-plane-wrap">
              <PlaneSVG sim={sim} showCarryOn={showCarryOn} />
            </div>
            <Legend showCarryOn={showCarryOn} />
          </div>

          {/* Right: Controls + Stats */}
          <div className="abs-controls-col">
            {/* Strategy */}
            <Card size="small" title="Boarding Strategy" className="abs-card">
              <Select
                value={strategy}
                onChange={setStrategy}
                style={{ width: '100%', marginBottom: 8 }}
                disabled={running}
              >
                {STRATEGY_META.map(s => (
                  <Option key={s.key} value={s.key}>
                    <Tag color={s.color} style={{ marginRight: 4 }}>•</Tag>{s.label}
                  </Option>
                ))}
              </Select>
              {currentMeta && (
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{currentMeta.desc}</p>
              )}
            </Card>

            {/* Parameters */}
            <Card size="small" title="Parameters" className="abs-card">
              <div className="abs-param">
                <label>Carry-on bag probability: <strong>{Math.round(carryOnProb * 100)}%</strong></label>
                <Slider min={0} max={1} step={0.05} value={carryOnProb}
                  onChange={v => { setCarryOnProb(v); }}
                  disabled={running}
                  tooltip={{ formatter: v => `${Math.round(v * 100)}%` }} />
              </div>
              <div className="abs-param">
                <label>Passenger entry gap: <strong>{entryInterval}s</strong></label>
                <Slider min={1} max={5} step={1} value={entryInterval}
                  onChange={v => { setEntryInterval(v); }}
                  disabled={running}
                  marks={{ 1: '1s', 2: '2s', 3: '3s', 5: '5s' }} />
              </div>
              <div className="abs-param abs-param--row">
                <label>Show carry-on indicator</label>
                <Switch size="small" checked={showCarryOn} onChange={setShowCarryOn} />
              </div>
            </Card>

            {/* Simulation controls */}
            <Card size="small" title="Controls" className="abs-card">
              <div className="abs-param">
                <label>Speed: <strong>{speed}× ({speed * 20} ticks/s)</strong></label>
                <Slider min={1} max={20} value={speed} onChange={setSpeed}
                  marks={{ 1: '1×', 5: '5×', 10: '10×', 20: '20×' }} />
              </div>
              <div className="abs-btns">
                {!running
                  ? <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}
                      disabled={sim?.done}>
                      {sim?.done ? 'Done' : 'Start'}
                    </Button>
                  : <Button icon={<PauseCircleOutlined />} onClick={handlePause}>Pause</Button>
                }
                <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
                <Tooltip title="Run all 6 strategies and compare results">
                  <Button icon={<BarChartOutlined />} onClick={handleRunComparison}
                    loading={runningComp} type="dashed">
                    Compare All
                  </Button>
                </Tooltip>
              </div>
            </Card>

            {/* Live stats */}
            <Card size="small" title="Live Statistics" className="abs-card">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Elapsed" value={sim ? formatTime(sim.tick) : '0:00'}
                    valueStyle={{ fontSize: 20 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Seated" value={`${sim?.seatedCount ?? 0} / ${sim?.totalPassengers ?? 180}`}
                    valueStyle={{ fontSize: 20 }} />
                </Col>
              </Row>
              <Progress
                percent={pct}
                strokeColor={currentMeta?.color}
                style={{ margin: '10px 0 4px' }}
                size="small"
              />
              {sim?.done && (
                <div className="abs-done">
                  ✅ Boarding complete in <strong>{formatTime(sim.completionTick)}</strong>
                  {' '}({sim.completionTick} seconds)
                </div>
              )}
            </Card>

            {/* Boarding curve */}
            {lineChartData && (
              <Card size="small" title="Boarding Curve" className="abs-card abs-chart-card">
                <div style={{ height: 180 }}>
                  <Line data={lineChartData} options={chartOptions} />
                </div>
              </Card>
            )}

            {/* Human dynamics breakdown */}
            {sim && (
              <Card size="small" title="Human Dynamics" className="abs-card">
                <div className="abs-dynamics">
                  <div className="abs-dyn-row">
                    <span>Passengers with carry-on:</span>
                    <strong>{sim.passengers.filter(p => p.hasCarryOn).length}</strong>
                  </div>
                  <div className="abs-dyn-row">
                    <span>Currently loading baggage:</span>
                    <strong>{sim.passengers.filter(p => p.state === 'loading').length}</strong>
                  </div>
                  <div className="abs-dyn-row">
                    <span>Walking in aisle:</span>
                    <strong>{sim.passengers.filter(p => p.state === 'walking').length}</strong>
                  </div>
                  <div className="abs-dyn-row">
                    <span>Waiting in queue:</span>
                    <strong>{Math.max(0, sim.queue.length - sim.queueIdx)}</strong>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="abs-comparison">
          <div className="abs-comp-actions">
            <Button type="primary" icon={<ThunderboltOutlined />}
              onClick={handleRunComparison} loading={runningComp}>
              {compResults ? 'Re-run Comparison' : 'Run All Strategies'}
            </Button>
            <span className="abs-comp-hint">
              Runs all 6 strategies with current parameters and compares boarding times.
            </span>
          </div>

          {compResults && (
            <>
              {/* Strategy result cards */}
              <div className="abs-comp-cards">
                {STRATEGY_META.map(s => {
                  const r = compResults[s.key];
                  const t = r?.completionTick;
                  const best = Math.min(...STRATEGY_META.map(m => compResults[m.key]?.completionTick ?? Infinity));
                  const worst = Math.max(...STRATEGY_META.map(m => compResults[m.key]?.completionTick ?? 0));
                  const isBest = t === best;
                  const isWorst = t === worst;
                  return (
                    <div key={s.key} className={`abs-result-card${isBest ? ' abs-result-card--best' : ''}${isWorst ? ' abs-result-card--worst' : ''}`}
                      style={{ borderTopColor: s.color }}>
                      <div className="abs-rc-header">
                        <span className="abs-rc-label" style={{ color: s.color }}>{s.label}</span>
                        {isBest && <Tag color="green" style={{ marginLeft: 4 }}>Fastest</Tag>}
                        {isWorst && <Tag color="red" style={{ marginLeft: 4 }}>Slowest</Tag>}
                      </div>
                      <div className="abs-rc-time">{formatTime(t)}</div>
                      <div className="abs-rc-secs">{t} seconds</div>
                      <div className="abs-rc-desc">{s.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* Bar chart */}
              <Row gutter={16} style={{ marginTop: 24 }}>
                <Col xs={24} lg={10}>
                  <Card title="Boarding Time Comparison" size="small">
                    <div style={{ height: 260 }}>
                      <Bar data={barChartData} options={barOptions} />
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={14}>
                  <Card title="Boarding Curve — All Strategies" size="small">
                    <div style={{ height: 260 }}>
                      <Line data={compLineData} options={compLineOptions} />
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Analysis */}
              <Card title="Analysis & Insights" size="small" style={{ marginTop: 16 }}>
                {(() => {
                  const sorted = [...STRATEGY_META].sort(
                    (a, b) => (compResults[a.key]?.completionTick ?? 0) - (compResults[b.key]?.completionTick ?? 0)
                  );
                  const best = sorted[0];
                  const worst = sorted[sorted.length - 1];
                  const bestT = compResults[best.key]?.completionTick ?? 0;
                  const worstT = compResults[worst.key]?.completionTick ?? 0;
                  const saving = worstT - bestT;
                  return (
                    <div className="abs-analysis">
                      <p>
                        <strong style={{ color: '#52c41a' }}>{best.label}</strong> is the fastest strategy,
                        completing in <strong>{formatTime(bestT)}</strong> ({bestT}s).
                      </p>
                      <p>
                        <strong style={{ color: '#ff4d4f' }}>{worst.label}</strong> is the slowest,
                        taking <strong>{formatTime(worstT)}</strong> ({worstT}s) —
                        {' '}<strong>{saving}s ({Math.round(saving / worstT * 100)}%) slower</strong> than the best.
                      </p>
                      <p style={{ color: '#666', fontSize: 13 }}>
                        Human dynamics modelled: overhead baggage loading (6–15s per passenger,
                        {' '}{Math.round(carryOnProb * 100)}% carry-on rate), seat interference delays
                        (aisle seat: +3s, middle seat: +4s, both: +6s per affected passenger),
                        and aisle blocking by other passengers.
                      </p>
                      <p style={{ color: '#666', fontSize: 13 }}>
                        Ranking (fastest → slowest): {sorted.map(s => s.label).join(' → ')}
                      </p>
                    </div>
                  );
                })()}
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
