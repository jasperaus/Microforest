import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PHASE, TILE_GRASS, TILE_WALL, TILE_WATER, TILE_OBJECTIVE } from '../config.js';
import mechsData from '../data/mechs.json';
import weaponsData from '../data/weapons.json';
import campaignsData from '../data/campaigns.json';
import EventBridge from '../phaser/EventBridge.js';
import TurnManager from '../phaser/systems/TurnManager.js';
import AIController from '../phaser/systems/AIController.js';
import { createGameContext } from '../GameContext.js';
import HexGrid from './HexGrid.jsx';
import MechModel from './MechModel.jsx';

// ── Mech state class (pure JS, no Phaser) ─────────────────────────────────

class MechState {
  constructor(data, row, col) {
    Object.assign(this, {
      id:      data.id,
      name:    data.name,
      class:   data.class,
      team:    data.team ?? 'player',
      row, col,
      speed:   data.speed ?? 3,
      maxHp:   data.maxHp ?? 100,
      hp:      data.maxHp ?? 100,
      maxHeat: data.maxHeat ?? 100,
      heat:    0,
      maxAp:   2,
      ap:      2,
      frontArmor: data.frontArmor ?? 30,
      rearArmor:  data.rearArmor  ?? 15,
      weapons:    data.weapons    ?? ['laser'],
      special:    data.special    ?? 'none',
      specialName: data.specialName ?? '',
      facing:  data.team === 'enemy' ? 'W' : 'E',
      alive:   true,
      overheated:       false,
      stealthed:        false,
      calledShot:       false,
      activatedThisTurn: false,
    });
  }

  setFacing(f) { this.facing = f; }

  getState() {
    return {
      id: this.id, name: this.name, class: this.class, team: this.team,
      row: this.row, col: this.col,
      hp: this.hp, maxHp: this.maxHp,
      heat: this.heat, maxHeat: this.maxHeat,
      ap: this.ap, maxAp: this.maxAp,
      frontArmor: this.frontArmor, rearArmor: this.rearArmor,
      alive: this.alive, overheated: this.overheated, stealthed: this.stealthed,
      facing: this.facing, special: this.special, specialName: this.specialName,
    };
  }
}

// ── Grid builder ─────────────────────────────────────────────────────────

function buildGrid(map) {
  return map.map((rowArr, row) =>
    rowArr.map((type, col) => ({
      row, col, type,
      walkable: type !== TILE_WALL && type !== TILE_WATER,
      mech: null,
      highlight: null,
    }))
  );
}

// ── Mech world-space Y position (sits on top of tile) ────────────────────

const TILE_TOP_Y = { [TILE_GRASS]: 0.15, [TILE_WALL]: 0.50, [TILE_WATER]: 0.05, [TILE_OBJECTIVE]: 0.25 };

/**
 * BattleScene3D — full 3D battle scene.
 *
 * Props:
 *   missionIndex  number
 *   selectedMechs string[] | null  — player's chosen mech ids
 *   ctx           GameContext      — shared dependency container
 *   onSceneEnd    (sceneName, data) => void
 */
export default function BattleScene3D({ missionIndex, selectedMechs, ctx, onSceneEnd }) {
  const [highlights, setHighlights] = useState(new Map());
  const [mechPositions, setMechPositions] = useState(new Map()); // mechId → [x,y,z]
  const [, forceUpdate] = useState(0);
  const turnManagerRef = useRef(null);
  const initialized = useRef(false);

  // ── Initialise context + game once ──────────────────────────────────────

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const mission = campaignsData[missionIndex] ?? campaignsData[0];

    // Inject callbacks into context
    ctx.mission = mission;
    ctx.missionIndex = missionIndex;
    ctx._setHighlights = (map) => setHighlights(new Map(map));
    ctx._setActiveScene = (name, data) => onSceneEnd(name, data);

    // Build grid
    ctx.grid = buildGrid(mission.map);

    // Build mech lookup
    const mechLookup = {};
    mechsData.forEach(m => { mechLookup[m.id] = m; });

    // Spawn player mechs
    const spawns = mission.playerSpawns;
    const finalSpawns = (selectedMechs?.length > 0)
      ? selectedMechs.slice(0, spawns.length).map((id, i) => ({ ...spawns[i], mechId: id }))
      : spawns;

    finalSpawns.forEach(spawn => {
      const data = mechLookup[spawn.mechId];
      if (!data) return;
      const mech = new MechState(data, spawn.row, spawn.col);
      ctx.grid[spawn.row][spawn.col].mech = mech;
      ctx.playerMechs.push(mech);
    });

    // Spawn enemy mechs
    mission.enemySpawns.forEach(spawn => {
      const data = mechLookup[spawn.mechId];
      if (!data) return;
      const mech = new MechState({ ...data, team: 'enemy' }, spawn.row, spawn.col);
      ctx.grid[spawn.row][spawn.col].mech = mech;
      ctx.enemyMechs.push(mech);
    });

    // Wire systems
    const tm = new TurnManager(ctx);
    const ai = new AIController(ctx);
    ctx.turnManager = tm;
    ctx.aiController = ai;
    turnManagerRef.current = tm;

    // Start game after brief delay (let R3F render first)
    setTimeout(() => {
      tm.startPlayerTurn();
    }, 1200);

    return () => {
      EventBridge.off('turnStart');
      EventBridge.off('phaseChange');
      EventBridge.off('mechUpdated');
      EventBridge.off('mechKilled');
    };
  }, []); // eslint-disable-line

  // ── Tile click handler ───────────────────────────────────────────────────

  const handleTileClick = useCallback((row, col) => {
    const tm = turnManagerRef.current;
    if (!tm) return;

    const phase = tm.getPhase();
    const tile  = ctx.grid[row]?.[col];
    if (!tile) return;

    if (phase === PHASE.ENEMY_TURN || phase === PHASE.MOVING || phase === PHASE.RESOLVING) return;

    if (phase === PHASE.MECH_SELECTED) {
      const sel = tm.selectedMech;
      if (tile.mech && tile.mech.team === 'player' && tile.mech !== sel) {
        tm.selectMech(tile.mech);
      } else if (tile.highlight === 'move') {
        tm.executeMove(sel, row, col).then(() => forceUpdate(n => n + 1));
      } else if (!tile.mech || tile.mech.team !== 'player') {
        tm.deselectMech();
      }
      return;
    }

    if (phase === PHASE.ATTACK_SELECT || phase === PHASE.SPECIAL_SELECT) {
      const sel = tm.selectedMech;
      if (tile.highlight === 'attack' && tile.mech?.team === 'enemy') {
        if (phase === PHASE.SPECIAL_SELECT) {
          tm.executeSpecialAttack(sel, tile.mech).then(() => forceUpdate(n => n + 1));
        } else {
          tm.executeAttack(sel, tile.mech, 0).then(() => forceUpdate(n => n + 1));
        }
      } else if (!tile.mech || tile.mech.team !== 'enemy') {
        tm.deselectMech();
      }
      return;
    }

    if (phase === PHASE.IDLE) {
      if (tile.mech?.team === 'player' && tile.mech.alive && tile.mech.ap > 0) {
        tm.selectMech(tile.mech);
      }
    }
  }, [ctx]);

  // ── Mech click (shortcut to select) ─────────────────────────────────────

  const handleMechClick = useCallback((mechId) => {
    const tm = turnManagerRef.current;
    if (!tm) return;
    const allMechs = [...ctx.playerMechs, ...ctx.enemyMechs];
    const mech = allMechs.find(m => m.id === mechId);
    if (!mech) return;

    const phase = tm.getPhase();
    if (phase === PHASE.IDLE && mech.team === 'player' && mech.alive && mech.ap > 0) {
      tm.selectMech(mech);
    } else if ((phase === PHASE.ATTACK_SELECT || phase === PHASE.SPECIAL_SELECT) && mech.team === 'enemy') {
      const tile = ctx.grid[mech.row]?.[mech.col];
      if (tile?.highlight === 'attack') {
        const sel = tm.selectedMech;
        if (phase === PHASE.SPECIAL_SELECT) {
          tm.executeSpecialAttack(sel, mech).then(() => forceUpdate(n => n + 1));
        } else {
          tm.executeAttack(sel, mech, 0).then(() => forceUpdate(n => n + 1));
        }
      }
    }
  }, [ctx]);

  // ── Mech anim registration ────────────────────────────────────────────────

  const handleAnimReady = useCallback((mechId, api) => {
    ctx.registerMechAnim(mechId, api);
  }, [ctx]);

  // ── Compute mech world positions ─────────────────────────────────────────

  const allMechs = [...ctx.playerMechs, ...ctx.enemyMechs];

  return (
    <group>
      <HexGrid
        grid={ctx.grid}
        highlights={highlights}
        onTileClick={handleTileClick}
      />

      {allMechs.map(mech => {
        const [x, z] = ctx.tileXZ(mech.col, mech.row);
        const tileType = ctx.grid[mech.row]?.[mech.col]?.type ?? TILE_GRASS;
        const tileH = TILE_TOP_Y[tileType] ?? 0.15;
        return (
          <MechModel
            key={mech.id}
            mechId={mech.id}
            position={[x, tileH, z]}
            alive={mech.alive}
            stealthed={mech.stealthed}
            onAnimReady={handleAnimReady}
            onClick={handleMechClick}
          />
        );
      })}
    </group>
  );
}
