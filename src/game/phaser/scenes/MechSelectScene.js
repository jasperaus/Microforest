import mechsData from '../../data/mechs.json';
import campaignsData from '../../data/campaigns.json';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config.js';

export default class MechSelectScene extends Phaser.Scene {
  constructor() {
    super('MechSelectScene');
    this.selected = [];
    this.missionIndex = 0;
  }

  init(data) {
    this.missionIndex = data.missionIndex || 0;
    this.selected = [];
  }

  create() {
    const mission = campaignsData[this.missionIndex];
    // Max selectable = number of player spawns (or 3, whichever is less)
    this.maxSelect = Math.min(mission.playerSpawns.length, 3);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a1040, 0x1a1040, 1);
    bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Header
    this.add.text(CANVAS_WIDTH / 2, 20, `MISSION ${this.missionIndex + 1}: ${mission.name.toUpperCase()}`, {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#00eedd',
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, 42, mission.subtitle, {
      fontSize: '10px', fontFamily: 'monospace', color: '#aaaacc',
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, 58, mission.objective, {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffcc44',
    }).setOrigin(0.5);

    // Select prompt
    this.promptText = this.add.text(CANVAS_WIDTH / 2, 78, `Choose ${this.maxSelect} mech${this.maxSelect > 1 ? 's' : ''} for your squad`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ccccee',
    }).setOrigin(0.5);

    // Build mech cards
    const playerMechs = mechsData.filter(m => m.team === 'player');
    const cardW = 100, cardH = 140;
    const totalW = playerMechs.length * (cardW + 12) - 12;
    const startX = (CANVAS_WIDTH - totalW) / 2;
    const cardY = CANVAS_HEIGHT * 0.45;

    this.cards = [];
    playerMechs.forEach((mech, i) => {
      const cx = startX + i * (cardW + 12) + cardW / 2;
      this._buildCard(mech, cx, cardY, cardW, cardH);
    });

    // Divider
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x334466);
    divider.strokeRect(20, CANVAS_HEIGHT * 0.75, CANVAS_WIDTH - 40, CANVAS_HEIGHT * 0.18);

    // Deploy button
    this.deployBtn = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.88, 160, 36, 0x224400)
      .setInteractive({ useHandCursor: true });
    this.deployBtnText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.88, 'SELECT YOUR SQUAD', {
      fontSize: '12px', fontFamily: 'monospace', color: '#666666',
    }).setOrigin(0.5);
    this.deployBtn.setStrokeStyle(2, 0x336600);

    this.deployBtn.on('pointerdown', () => {
      if (this.selected.length < this.maxSelect) return;
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('BattleScene', {
          missionIndex: this.missionIndex,
          selectedMechs: this.selected,
        });
      });
    });

    this._updateDeployButton();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  _buildCard(mech, cx, cy, cardW, cardH) {
    const isUnlocked = mech.unlocked !== false;
    const card = {
      mech,
      bg: null,
      selected: false,
    };

    const bg = this.add.rectangle(cx, cy, cardW, cardH, isUnlocked ? 0x112244 : 0x222222)
      .setInteractive({ useHandCursor: isUnlocked })
      .setStrokeStyle(2, isUnlocked ? 0x334466 : 0x333333);

    const img = this.add.image(cx, cy - 30, `mech_${mech.id}`).setDisplaySize(56, 56);
    const name = this.add.text(cx, cy + 10, mech.name, {
      fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold',
      color: isUnlocked ? '#ffffff' : '#555555',
    }).setOrigin(0.5);
    const cls = this.add.text(cx, cy + 22, mech.class, {
      fontSize: '9px', fontFamily: 'monospace', color: isUnlocked ? '#aaaacc' : '#444444',
    }).setOrigin(0.5);

    // Stats
    const stats = `SPD:${mech.speed} HP:${mech.maxHp}`;
    this.add.text(cx, cy + 34, stats, {
      fontSize: '8px', fontFamily: 'monospace', color: isUnlocked ? '#88aacc' : '#333333',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 46, mech.specialName || '', {
      fontSize: '8px', fontFamily: 'monospace', color: isUnlocked ? '#ffcc44' : '#333333',
    }).setOrigin(0.5);

    if (!isUnlocked) {
      this.add.text(cx, cy - 10, '🔒', { fontSize: '20px' }).setOrigin(0.5);
    }

    if (isUnlocked) {
      bg.on('pointerover', () => { if (!card.selected) bg.setStrokeStyle(2, 0x6688aa); });
      bg.on('pointerout', () => { if (!card.selected) bg.setStrokeStyle(2, 0x334466); });
      bg.on('pointerdown', () => this._toggleCard(card, mech, bg, img));
    }

    card.bg = bg;
    card.img = img;
    this.cards.push(card);
  }

  _toggleCard(card, mech, bg, img) {
    if (card.selected) {
      card.selected = false;
      this.selected = this.selected.filter(id => id !== mech.id);
      bg.setFillStyle(0x112244);
      bg.setStrokeStyle(2, 0x334466);
      img.setAlpha(1);
      // Destroy badge to prevent memory leak
      if (card.badge) { card.badge.destroy(); card.badge = null; }
      // Renumber remaining badges
      this.cards.filter(c => c.selected).forEach((c, i) => {
        if (c.badge) c.badge.setText(`${i + 1}`);
      });
    } else {
      if (this.selected.length >= this.maxSelect) return;
      card.selected = true;
      this.selected.push(mech.id);
      bg.setFillStyle(0x224488);
      bg.setStrokeStyle(3, 0x44aaff);
      img.setAlpha(1);
      // Selection number badge
      const num = this.add.text(bg.x + 38, bg.y - 58, `${this.selected.length}`, {
        fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold',
        color: '#ffffff', backgroundColor: '#0044cc', padding: { x: 4, y: 2 },
      }).setDepth(20);
      card.badge = num;
    }
    this._updateDeployButton();
  }

  _updateDeployButton() {
    const ready = this.selected.length >= this.maxSelect;
    this.deployBtn.setFillStyle(ready ? 0x224400 : 0x111111);
    this.deployBtn.setStrokeStyle(2, ready ? 0x44ff00 : 0x333333);
    this.deployBtnText.setColor(ready ? '#44ff00' : '#444444');
    this.deployBtnText.setText(ready ? `▶ DEPLOY SQUAD (${this.selected.length})` : `SELECT ${this.maxSelect - this.selected.length} MORE`);
  }
}
