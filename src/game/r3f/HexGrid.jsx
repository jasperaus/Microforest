import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { TILE_GRASS, TILE_WALL, TILE_WATER, TILE_OBJECTIVE } from '../config.js';

// ── Tile visual parameters ──────────────────────────────────────────────────
const TILE_CONFIG = {
  [TILE_GRASS]:     { height: 0.22, topColor: '#4a7a32', sideColor: '#2e5020', roughness: 0.88, metalness: 0.00, emissive: '#000000', emissiveIntensity: 0 },
  [TILE_WALL]:      { height: 0.80, topColor: '#666677', sideColor: '#3a3a4a', roughness: 0.88, metalness: 0.35, emissive: '#000000', emissiveIntensity: 0 },
  [TILE_WATER]:     { height: 0.08, topColor: '#2277bb', sideColor: '#1a4466', roughness: 0.04, metalness: 0.10, emissive: '#112244', emissiveIntensity: 0.15 },
  [TILE_OBJECTIVE]: { height: 0.30, topColor: '#aa8820', sideColor: '#7a6010', roughness: 0.55, metalness: 0.50, emissive: '#aa8820', emissiveIntensity: 0.2 },
};

const R = 1.0;
const X_SPACING = R * Math.sqrt(3);
const Z_SPACING = R * 1.5;

function hexWorldPos(col, row, cols, rows) {
  const ox = -((cols - 1) * X_SPACING) / 2;
  const oz = -((rows - 1) * Z_SPACING) / 2;
  const x = ox + col * X_SPACING + (row % 2 === 1 ? X_SPACING / 2 : 0);
  const z = oz + row * Z_SPACING;
  return [x, z];
}

// ── Animated objective tile pulse ────────────────────────────────────────────
function ObjectivePulse({ height }) {
  const matRef = useRef();
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity = 0.25 + Math.sin(clock.elapsedTime * 2.2) * 0.2;
  });
  return (
    <mesh position={[0, height + 0.012, 0]}>
      <cylinderGeometry args={[R * 0.84, R * 0.84, 0.014, 6, 1, false, Math.PI / 6]} />
      <meshStandardMaterial
        ref={matRef}
        color="#ffcc44"
        emissive="#ffcc44"
        emissiveIntensity={0.3}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Water shimmer ─────────────────────────────────────────────────────────────
function WaterSurface({ height }) {
  const matRef = useRef();
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity = 0.1 + Math.sin(clock.elapsedTime * 1.7 + Math.random() * 0.1) * 0.08;
  });
  return (
    <mesh position={[0, height + 0.008, 0]}>
      <cylinderGeometry args={[R * 0.92, R * 0.92, 0.01, 6, 1, false, Math.PI / 6]} />
      <meshStandardMaterial
        ref={matRef}
        color="#55aaff"
        emissive="#2255aa"
        emissiveIntensity={0.15}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Edge bevel cap (top face, slightly inset) ─────────────────────────────────
function TileCap({ height, color, roughness, metalness }) {
  return (
    <mesh position={[0, height + 0.001, 0]} receiveShadow>
      <cylinderGeometry args={[R * 0.90, R * 0.90, 0.018, 6, 1, false, Math.PI / 6]} />
      <meshStandardMaterial
        color={color}
        roughness={Math.max(0, roughness - 0.12)}
        metalness={metalness}
      />
    </mesh>
  );
}

// ── Highlight overlay ─────────────────────────────────────────────────────────
function HighlightOverlay({ height, highlight }) {
  const matRef = useRef();
  const isMoveHL = highlight === 'move';
  const hlColor = isMoveHL ? '#4488ff' : '#ff3333';

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.opacity = isMoveHL
      ? 0.45 + Math.sin(clock.elapsedTime * 3.0) * 0.15
      : 0.55 + Math.sin(clock.elapsedTime * 4.0) * 0.2;
  });

  return (
    <mesh position={[0, height + 0.022, 0]}>
      <cylinderGeometry args={[R * 0.87, R * 0.87, 0.02, 6, 1, false, Math.PI / 6]} />
      <meshStandardMaterial
        ref={matRef}
        color={hlColor}
        emissive={hlColor}
        emissiveIntensity={isMoveHL ? 1.8 : 2.2}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Single hex tile ──────────────────────────────────────────────────────────
function HexTile({ row, col, type, cols, rows, highlight, onClick }) {
  const cfg = TILE_CONFIG[type] ?? TILE_CONFIG[TILE_GRASS];
  const [x, z] = hexWorldPos(col, row, cols, rows);

  return (
    <group position={[x, 0, z]}>
      {/* Side body */}
      <mesh
        position={[0, cfg.height / 2, 0]}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(row, col); }}
      >
        <cylinderGeometry args={[R * 0.97, R * 0.99, cfg.height, 6, 1, false, Math.PI / 6]} />
        <meshStandardMaterial
          color={cfg.sideColor}
          roughness={cfg.roughness}
          metalness={cfg.metalness}
          emissive={cfg.emissive}
          emissiveIntensity={cfg.emissiveIntensity}
        />
      </mesh>

      {/* Top cap — slightly lighter, inset for depth */}
      <TileCap height={cfg.height} color={cfg.topColor} roughness={cfg.roughness} metalness={cfg.metalness} />

      {/* Type-specific surface effects */}
      {type === TILE_OBJECTIVE && <ObjectivePulse height={cfg.height} />}
      {type === TILE_WATER && <WaterSurface height={cfg.height} />}

      {/* Highlight overlay */}
      {highlight && <HighlightOverlay height={cfg.height} highlight={highlight} />}
    </group>
  );
}

// ── Ground plane beneath the grid ────────────────────────────────────────────
function GroundPlane({ cols, rows }) {
  const w = cols * X_SPACING + 4;
  const h = rows * Z_SPACING + 4;
  return (
    <mesh position={[0, -0.06, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        color="#0d1a0d"
        roughness={0.95}
        metalness={0.0}
      />
    </mesh>
  );
}

/**
 * HexGrid — renders the full battlefield terrain with raised hexagonal prisms,
 * animated tile effects, and responsive highlight overlays.
 *
 * Props:
 *   grid         – ctx.grid (2D array of tile objects)
 *   highlights   – Map<"row,col", 'move'|'attack'> (reactive)
 *   onTileClick  – (row, col) => void
 */
export default function HexGrid({ grid, highlights, onTileClick }) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const tiles = useMemo(() => {
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({ row: r, col: c, type: grid[r][c].type });
      }
    }
    return out;
  }, [grid, rows, cols]);

  return (
    <group>
      <GroundPlane cols={cols} rows={rows} />
      {tiles.map(({ row, col, type }) => (
        <HexTile
          key={`${row},${col}`}
          row={row}
          col={col}
          type={type}
          cols={cols}
          rows={rows}
          highlight={highlights?.get(`${row},${col}`) ?? null}
          onClick={onTileClick}
        />
      ))}
    </group>
  );
}
