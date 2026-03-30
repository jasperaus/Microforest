import React, { useMemo, useState, useEffect } from 'react';
import { TILE_GRASS, TILE_WALL, TILE_WATER, TILE_OBJECTIVE } from '../config.js';

// Tile visual parameters
const TILE_CONFIG = {
  [TILE_GRASS]:     { height: 0.15, color: '#3a6b2a', roughness: 0.85, metalness: 0.00 },
  [TILE_WALL]:      { height: 0.50, color: '#555566', roughness: 0.90, metalness: 0.30 },
  [TILE_WATER]:     { height: 0.05, color: '#1a5a8a', roughness: 0.05, metalness: 0.00 },
  [TILE_OBJECTIVE]: { height: 0.25, color: '#8b6914', roughness: 0.60, metalness: 0.40 },
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

// Single hex tile
function HexTile({ row, col, type, cols, rows, highlight, onClick }) {
  const cfg = TILE_CONFIG[type] ?? TILE_CONFIG[TILE_GRASS];
  const [x, z] = hexWorldPos(col, row, cols, rows);
  const y = cfg.height / 2;

  return (
    <group position={[x, 0, z]}>
      {/* Main hex column */}
      <mesh
        position={[0, y, 0]}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(row, col); }}
      >
        <cylinderGeometry args={[R * 0.97, R * 0.97, cfg.height, 6, 1, false, Math.PI / 6]} />
        <meshStandardMaterial
          color={cfg.color}
          roughness={cfg.roughness}
          metalness={cfg.metalness}
        />
      </mesh>

      {/* Highlight disk — emissive overlay */}
      {highlight && (
        <mesh position={[0, cfg.height + 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R * 0.88, R * 0.88, 0.02, 6, 1, false, Math.PI / 6]} />
          <meshStandardMaterial
            color={highlight === 'move' ? '#4488ff' : '#ff3333'}
            emissive={highlight === 'move' ? '#4488ff' : '#ff3333'}
            emissiveIntensity={1.5}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * HexGrid — renders the full battlefield terrain.
 *
 * Props:
 *   grid         – ctx.grid (2D array of tile objects with .type and .highlight)
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
