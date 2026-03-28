import Phaser from 'phaser';
import mechsData from '../../data/mechs.json';
import weaponsData from '../../data/weapons.json';
import campaignsData from '../../data/campaigns.json';
import abilitiesData from '../../data/abilities.json';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI } from '../../config.js';

const _abilityMap = {};
abilitiesData.forEach(a => { _abilityMap[a.id] = a; });

// Class badge colors
const CLASS_COLORS = {
  Scout:   0x00ccdd,
  Brawler: 0xff6600,
  Sniper:  0x44cc44,
  Support: 0xddaa00,
  Assault: 0xcc2222,
};

// Stat bar configuration
const STAT_CONFIGS = [
  { key: 'maxHp',      label: 'HP',    max: 120, color: 0x44cc44 },
  { key: 'speed',      label: 'SPD',   max: 6,   color: 0x4488ff },
  { key: 'maxHeat',    label: 'HEAT',  max: 100, color: 0xff8800 },
  { key: 'frontArmor', label: 'F.ARM', max: 60,  color: 0x8899aa },
  { key: 'rearArmor',  label: 'R.ARM', max: 60,  color: 0x667788 },
];

// ── Layout constants (1280×800) ──────────────────────────────────────────────
// Header:  y=0..60
// Content: y=60..732
//   Left panel:   x=0..240   (width=240)
//   Center panel: x=240..760 (width=520)
//   Right panel:  x=760..1280 (width=520)
// Footer: y=732..800 (height=68)

const HEADER_H = 60;
const FOOTER_Y = 732;
const FOOTER_H = 68;
const LEFT_W = 240;
const CENTER_X = 240;
const CENTER_W = 520;
const RIGHT_X = 760;
const RIGHT_W = 520;

export default class MechSelectScene extends Phaser.Scene {
  constructor() {
    super('MechSelectScene');
  }

  init(data) {
    this.missionIndex = data?.missionIndex ?? 0;
    this.selected = [];
    this.previewIdx = 0;
  }

  create() {
    this.mission = campaignsData[this.missionIndex];
    this.maxSelect = Math.min(this.mission.playerSpawns.length, 3);
    this.playerMechs = mechsData.filter(m => m.team === 'player');

    this._weaponsMap = {};
    weaponsData.forEach(w => { this._weaponsMap[w.id] = w; });

    this._rightPanelObjects = [];
    this._squadDotObjects = [];
    this._deployPulseTween = null;

    // ── Background ────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x060610, 0x060610, 0x0c0c22, 0x0c0c22, 1);
    bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x111122, 0.15);
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      grid.strokeLineShape(new Phaser.Geom.Line(x, 0, x, CANVAS_HEIGHT));
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      grid.strokeLineShape(new Phaser.Geom.Line(0, y, CANVAS_WIDTH, y));
    }

    this._drawPanelBorders();
    this._buildHeader();
    this._buildRoster();
    this._buildViewer();
    this._buildFooter();

    const firstUnlocked = this.playerMechs.findIndex(m => m.unlocked !== false);
    this._setPreview(firstUnlocked >= 0 ? firstUnlocked : 0);

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  // ── Panel structure ───────────────────────────────────────────────────────

  _drawPanelBorders() {
    const g = this.add.graphics();

    // Metal frame around entire canvas
    g.lineStyle(3, UI.BORDER_OUTER);
    g.strokeRect(4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8);
    g.lineStyle(1, UI.BORDER_INNER);
    g.strokeRect(8, 8, CANVAS_WIDTH - 16, CANVAS_HEIGHT - 16);

    // Panel dividers
    g.lineStyle(1, 0x1a2540);
    g.strokeLineShape(new Phaser.Geom.Line(0, HEADER_H, CANVAS_WIDTH, HEADER_H));
    g.strokeLineShape(new Phaser.Geom.Line(0, FOOTER_Y, CANVAS_WIDTH, FOOTER_Y));
    g.strokeLineShape(new Phaser.Geom.Line(LEFT_W, HEADER_H, LEFT_W, FOOTER_Y));
    g.strokeLineShape(new Phaser.Geom.Line(RIGHT_X, HEADER_H, RIGHT_X, FOOTER_Y));

    // Corner rivets
    const rivets = [[16, 16], [CANVAS_WIDTH - 16, 16], [16, CANVAS_HEIGHT - 16], [CANVAS_WIDTH - 16, CANVAS_HEIGHT - 16]];
    rivets.forEach(([rx, ry]) => {
      g.fillStyle(UI.BORDER_RIVET, 1);
      g.fillCircle(rx, ry, 4);
      g.fillStyle(0x666660, 0.4);
      g.fillCircle(rx - 1, ry - 1, 2);
    });
  }

  _buildHeader() {
    this.add.text(CANVAS_WIDTH / 2, 20, `MISSION ${this.missionIndex + 1}: ${this.mission.name.toUpperCase()}`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#00eedd',
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, 42, this.mission.objective || '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffcc44',
    }).setOrigin(0.5);
  }

  // ── Left panel: roster list ───────────────────────────────────────────────

  _buildRoster() {
    this.cards = [];
    const cardW = 220, cardH = 80;
    const cardCX = LEFT_W / 2;  // 120
    const startY = HEADER_H + 12;
    const gap = 6;

    // Panel label
    this.add.text(cardCX, startY, 'ROSTER', {
      fontSize: '9px', fontFamily: 'monospace', color: '#2a3a4a', letterSpacing: 2,
    }).setOrigin(0.5);

    const cardsStartY = startY + 18;

    this.playerMechs.forEach((mech, i) => {
      const cy = cardsStartY + i * (cardH + gap) + cardH / 2;
      const isUnlocked = mech.unlocked !== false;

      const cardBg = this.add.rectangle(cardCX, cy, cardW, cardH, 0x080c18)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x182438);

      const sprite = this.add.image(cardCX - 68, cy, `mech_${mech.id}`)
        .setDisplaySize(42, 42)
        .setAlpha(isUnlocked ? 1 : 0.25);

      this.add.text(cardCX - 42, cy - 16, mech.name.toUpperCase(), {
        fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold',
        color: isUnlocked ? '#ddeeff' : '#333344',
      }).setOrigin(0, 0.5);

      this.add.text(cardCX - 42, cy + 2, mech.class, {
        fontSize: '9px', fontFamily: 'monospace',
        color: isUnlocked ? '#7788aa' : '#2a2a3a',
      }).setOrigin(0, 0.5);

      this.add.text(cardCX - 42, cy + 18, isUnlocked ? `HP:${mech.maxHp}  SPD:${mech.speed}` : 'LOCKED', {
        fontSize: '9px', fontFamily: 'monospace',
        color: isUnlocked ? '#445566' : '#441111',
      }).setOrigin(0, 0.5);

      if (!isUnlocked) {
        this.add.text(cardCX + 84, cy, '🔒', { fontSize: '16px' }).setOrigin(0.5);
      }

      const checkText = this.add.text(cardCX + 84, cy - 24, '', {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#44ff66',
      }).setOrigin(0.5);

      const previewBar = this.add.rectangle(cardCX - cardW / 2, cy, 4, cardH, 0x00eedd, 0)
        .setOrigin(0, 0.5);

      const card = { mech, bg: cardBg, sprite, previewBar, checkText, selected: false };
      this.cards.push(card);

      cardBg.on('pointerover', () => {
        if (this.previewIdx !== i) cardBg.setStrokeStyle(1, 0x3355aa);
      });
      cardBg.on('pointerout', () => {
        if (this.previewIdx !== i) cardBg.setStrokeStyle(1, 0x182438);
      });
      cardBg.on('pointerdown', () => {
        this._setPreview(i);
        if (isUnlocked) this._toggleSelect(mech);
      });
    });

    // Select count at bottom of roster
    this._rosterCountText = this.add.text(cardCX, FOOTER_Y - 16, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#334455',
    }).setOrigin(0.5);
  }

  // ── Center panel: mech viewer ─────────────────────────────────────────────

  _buildViewer() {
    const cx = CENTER_X + CENTER_W / 2;  // 500

    // L-bracket corner decorations
    const bLen = 24, bThick = 2;
    const bracketColor = 0x00eedd;
    const bPad = 14;
    const corners = [
      [CENTER_X + bPad,             HEADER_H + bPad,    1,  1],
      [CENTER_X + CENTER_W - bPad,  HEADER_H + bPad,   -1,  1],
      [CENTER_X + bPad,             FOOTER_Y - bPad,    1, -1],
      [CENTER_X + CENTER_W - bPad,  FOOTER_Y - bPad,   -1, -1],
    ];
    const brackets = corners.map(([bx, by, dx, dy]) => {
      const g = this.add.graphics();
      g.lineStyle(bThick, bracketColor);
      g.strokeLineShape(new Phaser.Geom.Line(bx, by, bx + dx * bLen, by));
      g.strokeLineShape(new Phaser.Geom.Line(bx, by, bx, by + dy * bLen));
      return g;
    });

    this.tweens.add({
      targets: brackets,
      alpha: { from: 0.6, to: 1 },
      yoyo: true, repeat: -1,
      duration: 1400,
    });

    // Large mech sprite
    const spriteY = (HEADER_H + FOOTER_Y) / 2 - 30;  // ~366
    this._viewerSprite = this.add.image(cx, spriteY, 'mech_zip').setDisplaySize(256, 256);

    this.tweens.add({
      targets: this._viewerSprite,
      y: { from: spriteY, to: spriteY - 8 },
      yoyo: true, repeat: -1,
      duration: 1800,
      ease: 'Sine.easeInOut',
    });

    // Scan sweep line
    const scanLine = this.add.rectangle(cx, HEADER_H + 20, 300, 3, 0x00eedd, 0.5);
    this.tweens.add({
      targets: scanLine,
      y: { from: HEADER_H + 20, to: FOOTER_Y - 20 },
      alpha: { from: 0.5, to: 0 },
      duration: 2600,
      repeat: -1,
      delay: 600,
      ease: 'Linear',
    });

    // Name & class badge below sprite
    const nameY = spriteY + 150;
    this._viewerName = this.add.text(cx, nameY, '', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#eeeeff',
    }).setOrigin(0.5);

    this._classBadgeBg = this.add.rectangle(cx, nameY + 24, 110, 22, 0x00ccdd);
    this._classBadgeText = this.add.text(cx, nameY + 24, '', {
      fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#000000',
    }).setOrigin(0.5);

    // Navigation arrows
    const arrowCfg = {
      fontSize: '24px', fontFamily: 'monospace', color: '#00eedd',
      backgroundColor: '#080c18', padding: { x: 10, y: 6 },
    };
    const arrowY = FOOTER_Y - 40;
    const leftArrow = this.add.text(CENTER_X + 20, arrowY, '◄', arrowCfg)
      .setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    const rightArrow = this.add.text(CENTER_X + CENTER_W - 20, arrowY, '►', arrowCfg)
      .setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

    leftArrow.on('pointerover',  () => leftArrow.setColor('#ffffff'));
    leftArrow.on('pointerout',   () => leftArrow.setColor('#00eedd'));
    rightArrow.on('pointerover', () => rightArrow.setColor('#ffffff'));
    rightArrow.on('pointerout',  () => rightArrow.setColor('#00eedd'));
    leftArrow.on('pointerdown',  () => this._cyclePreview(-1));
    rightArrow.on('pointerdown', () => this._cyclePreview(1));
  }

  _cyclePreview(dir) {
    const unlocked = this.playerMechs
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.unlocked !== false);
    if (unlocked.length === 0) return;
    const curIdx = unlocked.findIndex(({ i }) => i === this.previewIdx);
    const nextIdx = (curIdx + dir + unlocked.length) % unlocked.length;
    this._setPreview(unlocked[nextIdx].i);
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  _buildFooter() {
    const footerCY = FOOTER_Y + FOOTER_H / 2;  // 766

    // Back button
    const backBtn = this.add.text(22, footerCY, '◄ BACK', {
      fontSize: '13px', fontFamily: 'monospace', color: '#446677',
      backgroundColor: '#080c18', padding: { x: 8, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#aaccdd'));
    backBtn.on('pointerout',  () => backBtn.setColor('#446677'));
    backBtn.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });

    // Mission name
    this.add.text(CANVAS_WIDTH / 2, FOOTER_Y + 10, this.mission.name.toUpperCase(), {
      fontSize: '9px', fontFamily: 'monospace', color: '#2a3a4a',
    }).setOrigin(0.5);

    // Squad dots
    this._buildSquadDots();

    // Deploy button
    this._deployBtnBg = this.add.rectangle(CANVAS_WIDTH - 110, footerCY, 190, 44, 0x111111)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x222222);

    this._deployBtnText = this.add.text(CANVAS_WIDTH - 110, footerCY, `PICK ${this.maxSelect} MECHS`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#333333',
    }).setOrigin(0.5);

    this._deployBtnBg.on('pointerdown', () => {
      if (this.selected.length < this.maxSelect) return;
      this._deploySequence();
    });
    this._deployBtnBg.on('pointerover', () => {
      if (this.selected.length >= this.maxSelect) this._deployBtnBg.setFillStyle(0x115500);
    });
    this._deployBtnBg.on('pointerout', () => {
      if (this.selected.length >= this.maxSelect) this._deployBtnBg.setFillStyle(0x0d3300);
    });
  }

  _buildSquadDots() {
    this._squadDotObjects.forEach(d => d.destroy());
    this._squadDotObjects = [];

    const footerCY = FOOTER_Y + FOOTER_H / 2;
    const dotR = 7, gap = 24;
    const totalW = this.maxSelect * gap - (gap - dotR * 2);
    const startX = CANVAS_WIDTH / 2 - totalW / 2 + dotR;

    for (let i = 0; i < this.maxSelect; i++) {
      const filled = i < this.selected.length;
      const mechId = this.selected[i];
      const mechData = mechId ? this.playerMechs.find(m => m.id === mechId) : null;
      const color = mechData ? parseInt((mechData.colorHex || '#334455').replace('#', ''), 16) : 0x334455;

      const dot = this.add.circle(startX + i * gap, footerCY, dotR, filled ? color : 0x050a10);
      dot.setStrokeStyle(2, filled ? color : 0x334455);
      this._squadDotObjects.push(dot);
    }
  }

  // ── Preview & selection logic ──────────────────────────────────────────────

  _setPreview(idx) {
    this.previewIdx = idx;
    const mech = this.playerMechs[idx];

    this._viewerSprite.setTexture(`mech_${mech.id}`).setDisplaySize(256, 256);
    this._viewerName.setText(mech.name.toUpperCase());

    const classColor = CLASS_COLORS[mech.class] || 0x446688;
    this._classBadgeBg.setFillStyle(classColor);
    this._classBadgeText.setText(mech.class.toUpperCase());

    this._buildRightPanel(mech);
    this._refreshCards();
  }

  _toggleSelect(mech) {
    const idx = this.selected.indexOf(mech.id);
    if (idx >= 0) {
      this.selected.splice(idx, 1);
    } else {
      if (this.selected.length >= this.maxSelect) return;
      this.selected.push(mech.id);
    }
    this._refreshCards();
    this._buildSquadDots();
    this._refreshDeployBtn();
    this._updateRosterCount();
  }

  _updateRosterCount() {
    if (this._rosterCountText) {
      this._rosterCountText.setText(`SELECT ${this.selected.length}/${this.maxSelect}`);
      this._rosterCountText.setColor(this.selected.length >= this.maxSelect ? '#44ff66' : '#334455');
    }
  }

  _refreshCards() {
    this.cards.forEach((card, i) => {
      const isPreviewing = this.previewIdx === i;
      const isSelected  = this.selected.includes(card.mech.id);
      const isUnlocked  = card.mech.unlocked !== false;

      card.bg.setFillStyle(isPreviewing ? 0x0e1e3a : (isUnlocked ? 0x080c18 : 0x060810));
      card.bg.setStrokeStyle(
        isPreviewing ? 2 : 1,
        isPreviewing ? 0x00eedd : (isSelected ? 0x44cc66 : 0x182438)
      );
      card.previewBar.setAlpha(isPreviewing ? 1 : 0);
      card.checkText.setText(isSelected ? '✓' : '');
    });
  }

  _refreshDeployBtn() {
    const ready = this.selected.length >= this.maxSelect;
    this._deployBtnBg.setFillStyle(ready ? 0x0d3300 : 0x111111);
    this._deployBtnBg.setStrokeStyle(2, ready ? 0x44ff00 : 0x222222);
    this._deployBtnText.setColor(ready ? '#44ff00' : '#333333');
    this._deployBtnText.setText(ready ? '▶ DEPLOY SQUAD' : `PICK ${this.maxSelect - this.selected.length} MORE`);

    if (ready && !this._deployPulseTween) {
      this._deployPulseTween = this.tweens.add({
        targets: this._deployBtnBg,
        scaleX: { from: 1, to: 1.04 },
        scaleY: { from: 1, to: 1.04 },
        yoyo: true, repeat: -1,
        duration: 650,
      });
    } else if (!ready && this._deployPulseTween) {
      this._deployPulseTween.stop();
      this._deployPulseTween = null;
      this._deployBtnBg.setScale(1);
    }
  }

  // ── Right panel: loadout detail ───────────────────────────────────────────

  _buildRightPanel(mech) {
    this._rightPanelObjects.forEach(o => { if (o && o.active) o.destroy(); });
    this._rightPanelObjects = [];

    const rx = RIGHT_X + 16;
    const rw = RIGHT_W - 32;
    let y = HEADER_H + 10;

    if (mech.unlocked === false) {
      this._buildClassifiedOverlay(rx, rw);
      return;
    }

    // Description
    if (mech.description) {
      const desc = this._rp(this.add.text(rx, y, mech.description, {
        fontSize: '11px', fontFamily: 'monospace', color: '#7799aa',
        wordWrap: { width: rw }, lineSpacing: 3,
      }));
      y += desc.height + 14;
    }

    // Stats
    this._rpDivider(rx, rw, y, '── STATS ──'); y += 20;
    STAT_CONFIGS.forEach(cfg => {
      this._rpStatBar(rx, y, cfg.label, mech[cfg.key] ?? 0, cfg.max, cfg.color);
      y += 28;
    });
    y += 8;

    // Weapons
    this._rpDivider(rx, rw, y, '── WEAPONS ──'); y += 20;
    (mech.weapons || []).forEach(wid => {
      const w = this._weaponsMap[wid];
      if (!w) return;
      this._rpWeapon(rx, rw, y, w);
      y += 60;
    });

    // Special ability
    if (mech.special && mech.special !== 'none') {
      this._rpDivider(rx, rw, y, '── SPECIAL ──'); y += 20;
      this._rpSpecial(rx, rw, y, mech);
    }
  }

  _rp(obj) {
    this._rightPanelObjects.push(obj);
    return obj;
  }

  _buildClassifiedOverlay(rx, rw) {
    const g = this.add.graphics();
    g.fillStyle(0x330000, 0.15);
    for (let d = -200; d < 600; d += 32) {
      g.fillRect(RIGHT_X + d, HEADER_H, 16, FOOTER_Y - HEADER_H);
    }
    this._rightPanelObjects.push(g);

    this._rp(this.add.text(rx + rw / 2, (HEADER_H + FOOTER_Y) / 2, 'CLASSIFIED', {
      fontSize: '32px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#cc1111', stroke: '#440000', strokeThickness: 5,
    }).setOrigin(0.5).setAngle(-22).setAlpha(0.92));

    this._rp(this.add.text(rx + rw / 2, (HEADER_H + FOOTER_Y) / 2 + 48, 'UNLOCK TO ACCESS', {
      fontSize: '11px', fontFamily: 'monospace', color: '#661111',
    }).setOrigin(0.5).setAngle(-22).setAlpha(0.7));
  }

  _rpDivider(rx, rw, y, label) {
    this._rp(this.add.text(rx + rw / 2, y, label, {
      fontSize: '9px', fontFamily: 'monospace', color: '#2a3a4a',
    }).setOrigin(0.5));
  }

  _rpStatBar(rx, y, label, val, maxVal, fillColor) {
    const labelW = 58;
    const barW = 180;
    const barX = rx + labelW + 6;

    this._rp(this.add.text(rx + labelW, y + 10, label, {
      fontSize: '10px', fontFamily: 'monospace', color: '#4a6077',
    }).setOrigin(1, 0.5));

    this._rp(this.add.rectangle(barX, y + 10, barW, 12, 0x0a1020).setOrigin(0, 0.5));

    const fillW = Math.max(2, Math.floor(barW * Math.min(val / maxVal, 1)));
    this._rp(this.add.rectangle(barX, y + 10, fillW, 10, fillColor).setOrigin(0, 0.5));

    this._rp(this.add.text(barX + barW + 8, y + 10, `${val}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#99aabb',
    }).setOrigin(0, 0.5));
  }

  _rpWeapon(rx, rw, y, weapon) {
    const iconColorStr = weapon.colorHex || '#888888';
    const iconColorNum = parseInt(iconColorStr.replace('#', ''), 16);

    this._rp(this.add.rectangle(rx + 10, y + 12, 22, 22, 0x0a0f1a).setOrigin(0, 0.5)
      .setStrokeStyle(1, iconColorNum));
    this._rp(this.add.text(rx + 21, y + 12, weapon.icon || '?', {
      fontSize: '10px', fontFamily: 'monospace', color: iconColorStr,
    }).setOrigin(0.5));

    this._rp(this.add.text(rx + 40, y + 2, weapon.name.toUpperCase(), {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ccdde8',
    }).setOrigin(0, 0));

    const hitPct = Math.round(weapon.hitChance * 100);
    this._rp(this.add.text(rx + 40, y + 20, `RNG:${weapon.range}  DMG:${weapon.damage}  HEAT:${weapon.heat}  ${hitPct}%hit`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#6688aa',
    }).setOrigin(0, 0));

    this._rp(this.add.text(rx + 40, y + 36, weapon.description || '', {
      fontSize: '9px', fontFamily: 'monospace', color: '#3d5466',
      wordWrap: { width: rw - 44 },
    }).setOrigin(0, 0));
  }

  _rpSpecial(rx, rw, y, mech) {
    this._rp(this.add.text(rx, y + 12, '★', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0, 0.5));

    this._rp(this.add.text(rx + 22, y + 2, (mech.specialName || 'ABILITY').toUpperCase(), {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc44',
    }).setOrigin(0, 0));

    const abilityData = _abilityMap[mech.special];
    const apLabel = abilityData ? `[${abilityData.apCost} AP]` : '[2 AP]';
    this._rp(this.add.text(rx + 22, y + 20, apLabel, {
      fontSize: '9px', fontFamily: 'monospace', color: '#886622',
    }).setOrigin(0, 0));

    this._rp(this.add.text(rx + 22, y + 36, mech.specialDesc || '', {
      fontSize: '9px', fontFamily: 'monospace', color: '#997733',
      wordWrap: { width: rw - 24 }, lineSpacing: 3,
    }).setOrigin(0, 0));
  }

  // ── Deploy transition sequence ────────────────────────────────────────────

  _deploySequence() {
    this._deployBtnBg.removeInteractive();
    this._deployPulseTween?.stop();

    const flash = this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      0xffffff, 0
    ).setDepth(300);

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      duration: 140,
      yoyo: true,
      onComplete: () => {
        const overlay = this.add.rectangle(
          CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
          CANVAS_WIDTH, CANVAS_HEIGHT,
          0x000000, 0
        ).setDepth(290);

        this.tweens.add({
          targets: overlay,
          alpha: 0.92,
          duration: 280,
          onComplete: () => {
            const deployText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, 'DEPLOYING CADETS...', {
              fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold', color: '#00ff44',
            }).setOrigin(0.5).setDepth(300).setAlpha(0);

            this.tweens.add({ targets: deployText, alpha: 1, duration: 180 });

            const barCX = CANVAS_WIDTH / 2;
            const barY = CANVAS_HEIGHT / 2 + 22;
            const barTotalW = 380;

            this.add.rectangle(barCX, barY, barTotalW + 4, 18, 0x0a1a0a).setDepth(300).setOrigin(0.5);
            this.add.rectangle(barCX, barY, barTotalW + 4, 18, 0x001100).setDepth(300).setOrigin(0.5)
              .setStrokeStyle(1, 0x225522);

            const barFill = this.add.rectangle(barCX - barTotalW / 2, barY, barTotalW, 14, 0x00ff44)
              .setDepth(301)
              .setOrigin(0, 0.5)
              .setScale(0.005, 1);

            this.tweens.add({
              targets: barFill,
              scaleX: 1,
              duration: 1200,
              ease: 'Linear',
              onComplete: () => {
                deployText.setText('READY').setColor('#ffffff');
                this.time.delayedCall(250, () => {
                  this.cameras.main.fade(380, 0, 0, 0);
                  this.time.delayedCall(380, () => {
                    this.scene.start('BattleScene', {
                      missionIndex: this.missionIndex,
                      selectedMechs: this.selected,
                    });
                  });
                });
              },
            });
          },
        });
      },
    });
  }
}
