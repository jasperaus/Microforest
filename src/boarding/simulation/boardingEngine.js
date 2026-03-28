// Airplane Boarding Simulation Engine
// Pure simulation logic (mutable state for performance)

export const ROWS = 30;
export const SEATS_PER_ROW = 6;
export const SEAT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
// seat index: 0=A(window), 1=B(middle), 2=C(aisle), 3=D(aisle), 4=E(middle), 5=F(window)
export const SEAT_TYPES = ['window', 'middle', 'aisle', 'aisle', 'middle', 'window'];

const DEFAULT_ENTRY_INTERVAL = 2;  // ticks between passengers entering plane

// Simple seeded PRNG (xorshift32)
function seededRng(seed) {
  let s = (seed || 1) >>> 0;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// Interference time (ticks) when reaching a seat, based on who is already seated
function getInterference(seatIndex, rowSeats) {
  const [, bSeated, cSeated, dSeated, eSeated] = rowSeats;
  switch (seatIndex) {
    case 0: // A window-left: needs C (aisle) and/or B (middle) to move
      if (cSeated && bSeated) return 6;
      if (bSeated) return 4;
      if (cSeated) return 3;
      return 0;
    case 1: // B middle-left: needs C (aisle) to move
      return cSeated ? 3 : 0;
    case 2: // C aisle-left: direct
      return 0;
    case 3: // D aisle-right: direct
      return 0;
    case 4: // E middle-right: needs D (aisle) to move
      return dSeated ? 3 : 0;
    case 5: // F window-right: needs D (aisle) and/or E (middle) to move
      if (dSeated && eSeated) return 6;
      if (eSeated) return 4;
      if (dSeated) return 3;
      return 0;
    default:
      return 0;
  }
}

function buildBoardingQueue(passengers, strategy, rand) {
  const arr = [...passengers];
  const seatOrder = { window: 0, middle: 1, aisle: 2 };

  switch (strategy) {
    case 'back-to-front':
      arr.sort((a, b) => b.row - a.row || (rand() - 0.5));
      break;
    case 'front-to-back':
      arr.sort((a, b) => a.row - b.row || (rand() - 0.5));
      break;
    case 'window-middle-aisle':
      arr.sort((a, b) => {
        const g = seatOrder[SEAT_TYPES[a.seatIndex]] - seatOrder[SEAT_TYPES[b.seatIndex]];
        return g !== 0 ? g : rand() - 0.5;
      });
      break;
    case 'block': {
      // 3 blocks: rows 21-30 (zone 0), 11-20 (zone 1), 1-10 (zone 2)
      const zone = r => r >= 21 ? 0 : r >= 11 ? 1 : 2;
      arr.sort((a, b) => {
        const z = zone(a.row) - zone(b.row);
        return z !== 0 ? z : rand() - 0.5;
      });
      break;
    }
    case 'steffen': {
      // Steffen modified: alternating rows back-to-front, window then middle then aisle
      // Group: (seat group * 2) + (even row=0, odd row=1), then sort by row desc within group
      arr.sort((a, b) => {
        const aGroup = seatOrder[SEAT_TYPES[a.seatIndex]] * 2 + (a.row % 2 === 0 ? 0 : 1);
        const bGroup = seatOrder[SEAT_TYPES[b.seatIndex]] * 2 + (b.row % 2 === 0 ? 0 : 1);
        if (aGroup !== bGroup) return aGroup - bGroup;
        return b.row - a.row; // back to front within group
      });
      break;
    }
    case 'random':
    default:
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      break;
  }
  return arr;
}

export function createSimulation(strategy = 'random', opts = {}) {
  const {
    carryOnProb = 0.65,
    seed = 42,
    entryInterval = DEFAULT_ENTRY_INTERVAL,
  } = opts;

  const rand = seededRng(seed);

  // Generate passengers
  const passengers = [];
  for (let row = 1; row <= ROWS; row++) {
    for (let si = 0; si < SEATS_PER_ROW; si++) {
      const hasCarryOn = rand() < carryOnProb;
      passengers.push({
        id: passengers.length,
        row,
        seatIndex: si,
        hasCarryOn,
        carryOnTime: hasCarryOn ? 6 + Math.floor(rand() * 10) : 0, // 6–15 ticks
        state: 'queue',   // queue | walking | loading | seated
        aislePos: -1,
        timer: 0,
      });
    }
  }

  const queue = buildBoardingQueue(passengers, strategy, rand);

  return {
    strategy,
    passengers,        // array, mutated in-place during steps
    passengerMap: new Map(passengers.map(p => [p.id, p])),
    queue: queue.map(p => p.id),  // ordered list of IDs
    queueIdx: 0,
    aisleOccupancy: new Array(ROWS).fill(-1),  // row slot -> passenger id, or -1
    seats: Array.from({ length: ROWS }, () => new Array(SEATS_PER_ROW).fill(false)),
    tick: 0,
    lastEntryTick: -(entryInterval),
    entryInterval,
    seatedCount: 0,
    totalPassengers: passengers.length,
    done: false,
    statsHistory: [{ tick: 0, seated: 0 }],
    completionTick: null,
  };
}

// Advance simulation by one tick (mutates sim in-place for performance)
export function stepSimMutable(sim) {
  if (sim.done) return;
  sim.tick++;
  const { tick, passengers, passengerMap, aisleOccupancy, seats, queue, entryInterval } = sim;

  // Collect active passengers and process back-to-front (highest aislePos first)
  // so those at the back can move without cascade issues
  const active = [];
  for (const p of passengers) {
    if (p.state === 'walking' || p.state === 'loading') active.push(p);
  }
  active.sort((a, b) => b.aislePos - a.aislePos);

  for (const p of active) {
    if (p.state === 'loading') {
      p.timer--;
      if (p.timer <= 0) {
        aisleOccupancy[p.aislePos] = -1;
        seats[p.row - 1][p.seatIndex] = true;
        p.state = 'seated';
        sim.seatedCount++;
      }
    } else {
      // walking: try to reach target row
      const target = p.row - 1; // 0-indexed aisle position
      if (p.aislePos === target) {
        // At destination row — start loading/sitting
        const interference = getInterference(p.seatIndex, seats[target]);
        const totalTime = p.carryOnTime + interference;
        if (totalTime > 0) {
          p.state = 'loading';
          p.timer = totalTime;
        } else {
          aisleOccupancy[p.aislePos] = -1;
          seats[p.row - 1][p.seatIndex] = true;
          p.state = 'seated';
          sim.seatedCount++;
        }
      } else {
        // Try to advance one row toward the back
        const nextPos = p.aislePos + 1;
        if (aisleOccupancy[nextPos] === -1) {
          aisleOccupancy[p.aislePos] = -1;
          p.aislePos = nextPos;
          aisleOccupancy[nextPos] = p.id;
        }
        // else: blocked, wait in place
      }
    }
  }

  // Admit next passenger from queue (if aisle slot 0 is free and interval elapsed)
  if (sim.queueIdx < queue.length && tick - sim.lastEntryTick >= entryInterval) {
    if (aisleOccupancy[0] === -1) {
      const pId = queue[sim.queueIdx];
      const p = passengerMap.get(pId);
      p.state = 'walking';
      p.aislePos = 0;
      aisleOccupancy[0] = pId;
      sim.queueIdx++;
      sim.lastEntryTick = tick;
    }
  }

  // Check completion
  if (sim.seatedCount === sim.totalPassengers) {
    sim.done = true;
    sim.completionTick = tick;
  }

  // Record stats snapshot every 5 ticks or on completion
  if (tick % 5 === 0 || sim.done) {
    sim.statsHistory.push({ tick, seated: sim.seatedCount });
  }
}

// Run simulation to completion synchronously (for batch comparisons)
export function runToCompletion(strategy, opts = {}) {
  const sim = createSimulation(strategy, opts);
  let safety = 0;
  while (!sim.done && safety < 20000) {
    stepSimMutable(sim);
    safety++;
  }
  return sim;
}

export const STRATEGY_META = [
  {
    key: 'back-to-front',
    label: 'Back to Front',
    color: '#1890ff',
    desc: 'Board rear seats first, then progressively forward. Common airline default.',
  },
  {
    key: 'front-to-back',
    label: 'Front to Back',
    color: '#ff4d4f',
    desc: 'Board front seats first. Creates maximum aisle congestion.',
  },
  {
    key: 'random',
    label: 'Random',
    color: '#722ed1',
    desc: 'Passengers board in random order, simulating no assigned boarding groups.',
  },
  {
    key: 'window-middle-aisle',
    label: 'Window → Middle → Aisle',
    color: '#52c41a',
    desc: 'All window seats board first, then middle, then aisle. Minimises seat interference.',
  },
  {
    key: 'block',
    label: 'Block Boarding (3 Zones)',
    color: '#fa8c16',
    desc: 'Plane split into 3 zones. Rear zone boards first, reducing forward blocking.',
  },
  {
    key: 'steffen',
    label: 'Steffen Modified',
    color: '#13c2c2',
    desc: 'Alternating rows back-to-front with window seats first. Near-optimal theoretical approach.',
  },
];

export function formatTime(ticks) {
  if (ticks == null) return '—';
  const mins = Math.floor(ticks / 60);
  const secs = ticks % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
