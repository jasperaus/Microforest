import Phaser from 'phaser';
import mechsData from '../../data/mechs.json';
import weaponsData from '../../data/weapons.json';
import campaignsData from '../../data/campaigns.json';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config.js';

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

// ── Layout constants ──────────────────────────────────────────────────────────
// Header:  y=0..48
// Content: y=48..444  (height=396)
//   Left panel:   x=0..160   (width=160)
//   Center panel: x=160..448 (width=288)
//   Right panel:  x=448..736 (width=288)
// Footer: y=444..496 (height=52)

export default class MechSelectScene extends Phaser.Scene {
  constructor() {
    super('MechSelectScene');
  }

  init(data) {
    this.missionIndex = data?.missionIndex ?? 0;
    this.selected = [];      // array of selected mech IDs (for deployment)
    this.previewIdx = 0;     // index into this.playerMechs
  }

  create() {
    this.mission = campaignsData[this.missionIndex];
    this.maxSelect = Math.min(this.mission.playerSpawns.length, 3);
    this.playerMechs = mechsData.filter(m => m.team === 'player');

    // Index weapons by id
    this._weaponsMap = {};
    weaponsData.forEach(w => { this._weaponsMap[w.id] = w; });

    // Dynamic object arrays
    this._rightPanelObjects = [];
    this._squadDotObjects = [];
    this._deployPulseTween = null;

    // ── Background ────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x060610, 0x060610, 0x0c0c22, 0x0c0c22, 1);
    bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this._drawPanelBorders();
    this._buildHeader();
    this._buildRoster();
    this._buildViewer();
    this._buildFooter();

    // Start previewing the first unlocked mech
    const firstUnlocked = this.playerMechs.findIndex(m => m.unlocked !== false);
    this._setPreview(firstUnlocked >= 0 ? firstUnlocked : 0);

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  // ── Panel structure ───────────────────────────────────────────────────────

  _drawPanelBorders() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x1a2540);
    // Header bottom border
    g.strokeLineShape(new Phaser.Geom.Line(0, 48, CANVAS_WIDTH, 48));
    // Footer top border
    g.strokeLineShape(new Phaser.Geom.Line(0, 444, CANVAS_WIDTH, 444));
    // Left panel right border
    g.strokeLineShape(new Phaser.Geom.Line(160, 48, 160, 444));
    // Right panel left border
    g.strokeLineShape(new Phaser.Geom.Line(448, 48, 448, 444));
  }

  _buildHeader() {
    this.add.text(CANVAS_WIDTH / 2, 15, `MISSION ${this.missionIndex + 1}: ${this.mission.name.toUpperCase()}`, {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#00eedd',
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, 34, this.mission.objective || '', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#ffcc44',
    }).setOrigin(0.5);
  }

  // ── Left panel: roster list ───────────────────────────────────────────────

  _buildRoster() {
    this.cards = [];
    const cardW = 148, cardH = 68;
    const cardCX = 80;   // center x of the 160px-wide left panel
    const startY = 60;
    const gap = 4;

    this.playerMechs.forEach((mech, i) => {
      const cy = startY + i * (cardH + gap) + cardH / 2;
      const isUnlocked = mech.unlocked !== false;

      // Card background
      const cardBg = this.add.rectangle(cardCX, cy, cardW, cardH, 0x080c18)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x182438);

      // Small mech sprite (left side of card)
      const sprite = this.add.image(cardCX - 46, cy, `mech_${mech.id}`)
        .setDisplaySize(30, 30)
        .setAlpha(isUnlocked ? 1 : 0.25);

      // Mech name
      this.add.text(cardCX - 28, cy - 12, mech.name.toUpperCase(), {
        fontSize: '10px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: isUnlocked ? '#ddeeff' : '#333344',
      }).setOrigin(0, 0.5);

      // Class
      this.add.text(cardCX - 28, cy + 2, mech.class, {
        fontSize: '8px',
        fontFamily: 'monospace',
        color: isUnlocked ? '#7788aa' : '#2a2a3a',
      }).setOrigin(0, 0.5);

      // Stats or LOCKED label
      this.add.text(cardCX - 28, cy + 16, isUnlocked ? `HP:${mech.maxHp}  SPD:${mech.speed}` : 'LOCKED', {
        fontSize: '8px',
        fontFamily: 'monospace',
        color: isUnlocked ? '#445566' : '#441111',
      }).setOrigin(0, 0.5);

      // Lock icon (right side)
      if (!isUnlocked) {
        this.add.text(cardCX + 58, cy, '🔒', { fontSize: '13px' }).setOrigin(0.5);
      }

      // Selection checkmark (hidden until selected)
      const checkText = this.add.text(cardCX + 58, cy - 20, '', {
        fontSize: '11px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#44ff66',
      }).setOrigin(0.5);

      // Left cyan preview bar (indicates currently previewed mech)
      const previewBar = this.add.rectangle(cardCX - cardW / 2, cy, 3, cardH, 0x00eedd, 0)
        .setOrigin(0, 0.5);

      const card = { mech, bg: cardBg, sprite, previewBar, checkText, selected: false };
      this.cards.push(card);

      // Hover effects
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
  }

  // ── Center panel: mech viewer ─────────────────────────────────────────────

  _buildViewer() {
    const cx = 304;  // center of 160+288/2

    // L-bracket corner decorations
    const bLen = 20, bThick = 2;
    const bracketColor = 0x00eedd;
    const corners = [
      [172, 58,   1,  1],   // top-left
      [436, 58,  -1,  1],   // top-right
      [172, 420,  1, -1],   // bottom-left
      [436, 420, -1, -1],   // bottom-right
    ];
    const brackets = corners.map(([bx, by, dx, dy]) => {
      const g = this.add.graphics();
      g.lineStyle(bThick, bracketColor);
      g.strokeLineShape(new Phaser.Geom.Line(bx, by, bx + dx * bLen, by));
      g.strokeLineShape(new Phaser.Geom.Line(bx, by, bx, by + dy * bLen));
      return g;
    });

    // Bracket pulse
    this.tweens.add({
      targets: brackets,
      alpha: { from: 0.65, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 1400,
    });

    // Large mech sprite (float animation target)
    this._viewerSprite = this.add.image(cx, 210, 'mech_zip').setDisplaySize(192, 192);

    this.tweens.add({
      targets: this._viewerSprite,
      y: { from: 210, to: 204 },
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: 'Sine.easeInOut',
    });

    // Scan sweep line
    const scanLine = this.add.rectangle(cx, 68, 220, 3, 0x00eedd, 0.55);
    this.tweens.add({
      targets: scanLine,
      y: { from: 68, to: 390 },
      alpha: { from: 0.55, to: 0 },
      duration: 2400,
      repeat: -1,
      delay: 600,
      ease: 'Linear',
    });

    // Mech name
    this._viewerName = this.add.text(cx, 318, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#eeeeff',
    }).setOrigin(0.5);

    // Class badge (pill)
    this._classBadgeBg = this.add.rectangle(cx, 338, 90, 18, 0x00ccdd);
    this._classBadgeText = this.add.text(cx, 338, '', {
      fontSize: '9px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5);

    // Navigation arrows
    const arrowCfg = {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#00eedd',
      backgroundColor: '#080c18',
      padding: { x: 8, y: 4 },
    };
    const leftArrow = this.add.text(176, 390, '◄', arrowCfg)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    const rightArrow = this.add.text(432, 390, '►', arrowCfg)
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

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
    // Back button
    const backBtn = this.add.text(14, 470, '◄ BACK', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#446677',
      backgroundColor: '#080c18',
      padding: { x: 6, y: 4 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#aaccdd'));
    backBtn.on('pointerout',  () => backBtn.setColor('#446677'));
    backBtn.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });

    // Mission name (center)
    this.add.text(CANVAS_WIDTH / 2, 456, this.mission.name.toUpperCase(), {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#2a3a4a',
    }).setOrigin(0.5);

    // Squad dots (will be rebuilt on selection change)
    this._buildSquadDots();

    // Deploy button
    this._deployBtnBg = this.add.rectangle(CANVAS_WIDTH - 86, 470, 156, 38, 0x111111)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x222222);

    this._deployBtnText = this.add.text(CANVAS_WIDTH - 86, 470, `PICK ${this.maxSelect} MECHS`, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#333333',
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

    const dotR = 5, gap = 18;
    const totalW = this.maxSelect * gap - (gap - dotR * 2);
    const startX = CANVAS_WIDTH / 2 - totalW / 2 + dotR;

    for (let i = 0; i < this.maxSelect; i++) {
      const filled = i < this.selected.length;
      const mechId = this.selected[i];
      const mechData = mechId ? this.playerMechs.find(m => m.id === mechId) : null;
      const color = mechData ? parseInt((mechData.colorHex || '#334455').replace('#', ''), 16) : 0x334455;

      const dot = this.add.circle(startX + i * gap, 472, dotR, filled ? color : 0x050a10);
      dot.setStrokeStyle(1.5, filled ? color : 0x334455);
      this._squadDotObjects.push(dot);
    }
  }

  // ── Preview & selection logic ──────────────────────────────────────────────

  _setPreview(idx) {
    this.previewIdx = idx;
    const mech = this.playerMechs[idx];

    // Update center viewer
    this._viewerSprite.setTexture(`mech_${mech.id}`).setDisplaySize(192, 192);
    this._viewerName.setText(mech.name.toUpperCase());

    const classColor = CLASS_COLORS[mech.class] || 0x446688;
    this._classBadgeBg.setFillStyle(classColor);
    this._classBadgeText.setText(mech.class.toUpperCase());

    // Rebuild right panel for this mech
    this._buildRightPanel(mech);

    // Refresh roster card highlights
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
        yoyo: true,
        repeat: -1,
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
    // Destroy previous dynamic objects
    this._rightPanelObjects.forEach(o => { if (o && o.active) o.destroy(); });
    this._rightPanelObjects = [];

    const rx = 456;   // left edge x with padding
    const rw = 268;   // usable width
    let y = 58;

    if (mech.unlocked === false) {
      this._buildClassifiedOverlay(rx, rw);
      return;
    }

    // Description
    if (mech.description) {
      const desc = this._rp(this.add.text(rx, y, mech.description, {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#7799aa',
        wordWrap: { width: rw },
        lineSpacing: 2,
      }));
      y += desc.height + 10;
    }

    // Stats
    this._rpDivider(rx, rw, y, '── STATS ──'); y += 17;
    STAT_CONFIGS.forEach(cfg => {
      this._rpStatBar(rx, y, cfg.label, mech[cfg.key] ?? 0, cfg.max, cfg.color);
      y += 23;
    });
    y += 4;

    // Weapons
    this._rpDivider(rx, rw, y, '── WEAPONS ──'); y += 17;
    (mech.weapons || []).forEach(wid => {
      const w = this._weaponsMap[wid];
      if (!w) return;
      this._rpWeapon(rx, rw, y, w);
      y += 52;
    });

    // Special ability
    if (mech.special && mech.special !== 'none') {
      this._rpDivider(rx, rw, y, '── SPECIAL ──'); y += 17;
      this._rpSpecial(rx, rw, y, mech);
    }
  }

  // Helper: push a right-panel object into the tracked array and return it
  _rp(obj) {
    this._rightPanelObjects.push(obj);
    return obj;
  }

  _buildClassifiedOverlay(rx, rw) {
    // Diagonal stripe background
    const g = this.add.graphics();
    g.fillStyle(0x330000, 0.15);
    for (let d = -150; d < 350; d += 28) {
      g.fillRect(448 + d, 48, 14, 396);
    }
    this._rightPanelObjects.push(g);

    this._rp(this.add.text(rx + rw / 2, 246, 'CLASSIFIED', {
      fontSize: '26px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#cc1111',
      stroke: '#440000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAngle(-22).setAlpha(0.92));

    this._rp(this.add.text(rx + rw / 2, 290, 'UNLOCK TO ACCESS', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#661111',
    }).setOrigin(0.5).setAngle(-22).setAlpha(0.7));
  }

  _rpDivider(rx, rw, y, label) {
    this._rp(this.add.text(rx + rw / 2, y, label, {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#2a3a4a',
    }).setOrigin(0.5));
  }

  _rpStatBar(rx, y, label, val, maxVal, fillColor) {
    const labelW = 52;
    const barW = 118;
    const barX = rx + labelW + 4;

    this._rp(this.add.text(rx + labelW, y + 8, label, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#4a6077',
    }).setOrigin(1, 0.5));

    // Bar track
    this._rp(this.add.rectangle(barX, y + 8, barW, 10, 0x0a1020).setOrigin(0, 0.5));

    // Bar fill
    const fillW = Math.max(2, Math.floor(barW * Math.min(val / maxVal, 1)));
    this._rp(this.add.rectangle(barX, y + 8, fillW, 8, fillColor).setOrigin(0, 0.5));

    // Numeric value
    this._rp(this.add.text(barX + barW + 6, y + 8, `${val}`, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#99aabb',
    }).setOrigin(0, 0.5));
  }

  _rpWeapon(rx, rw, y, weapon) {
    const iconColorStr = weapon.colorHex || '#888888';
    const iconColorNum = parseInt(iconColorStr.replace('#', ''), 16);

    // Icon box
    this._rp(this.add.rectangle(rx + 8, y + 9, 18, 18, 0x0a0f1a).setOrigin(0, 0.5)
      .setStrokeStyle(1, iconColorNum));
    this._rp(this.add.text(rx + 17, y + 9, weapon.icon || '?', {
      fontSize: '9px', fontFamily: 'monospace', color: iconColorStr,
    }).setOrigin(0.5));

    // Name
    this._rp(this.add.text(rx + 32, y + 2, weapon.name.toUpperCase(), {
      fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ccdde8',
    }).setOrigin(0, 0));

    // Stats line: Range / Damage / Heat / Hit%
    const hitPct = Math.round(weapon.hitChance * 100);
    this._rp(this.add.text(rx + 32, y + 16, `RNG:${weapon.range}  DMG:${weapon.damage}  HEAT:${weapon.heat}  ${hitPct}%hit`, {
      fontSize: '8px', fontFamily: 'monospace', color: '#6688aa',
    }).setOrigin(0, 0));

    // Description
    this._rp(this.add.text(rx + 32, y + 30, weapon.description || '', {
      fontSize: '8px', fontFamily: 'monospace', color: '#3d5466',
      wordWrap: { width: rw - 34 },
    }).setOrigin(0, 0));
  }

  _rpSpecial(rx, rw, y, mech) {
    this._rp(this.add.text(rx, y + 9, '★', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0, 0.5));

    this._rp(this.add.text(rx + 18, y + 2, (mech.specialName || 'ABILITY').toUpperCase(), {
      fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc44',
    }).setOrigin(0, 0));

    this._rp(this.add.text(rx + 18, y + 16, '[2 AP]', {
      fontSize: '8px', fontFamily: 'monospace', color: '#886622',
    }).setOrigin(0, 0));

    this._rp(this.add.text(rx + 18, y + 30, mech.specialDesc || '', {
      fontSize: '8px', fontFamily: 'monospace', color: '#997733',
      wordWrap: { width: rw - 20 }, lineSpacing: 2,
    }).setOrigin(0, 0));
  }

  // ── Deploy transition sequence ────────────────────────────────────────────

  _deploySequence() {
    // Prevent double-trigger
    this._deployBtnBg.removeInteractive();
    this._deployPulseTween?.stop();

    // White flash
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
        // Black overlay
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
            // "DEPLOYING CADETS..." text
            const deployText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 36, 'DEPLOYING CADETS...', {
              fontSize: '18px',
              fontFamily: 'monospace',
              fontStyle: 'bold',
              color: '#00ff44',
            }).setOrigin(0.5).setDepth(300).setAlpha(0);

            this.tweens.add({ targets: deployText, alpha: 1, duration: 180 });

            // Loading bar track
            const barCX = CANVAS_WIDTH / 2;
            const barY = CANVAS_HEIGHT / 2 + 18;
            const barTotalW = 300;

            this.add.rectangle(barCX, barY, barTotalW + 4, 16, 0x0a1a0a).setDepth(300).setOrigin(0.5);
            this.add.rectangle(barCX, barY, barTotalW + 4, 16, 0x001100).setDepth(300).setOrigin(0.5)
              .setStrokeStyle(1, 0x225522);

            // Fill bar — scaled from 0 to 1 along X axis (origin left)
            const barFill = this.add.rectangle(barCX - barTotalW / 2, barY, barTotalW, 12, 0x00ff44)
              .setDepth(301)
              .setOrigin(0, 0.5)
              .setScaleX(0.005);

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
