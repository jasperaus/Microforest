import Phaser from 'phaser';
import campaignsData from '../../data/campaigns.json';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI } from '../../config.js';

export default class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  init(data) {
    this.won = data.won;
    this.missionIndex = data.missionIndex || 0;
    this.stats = data.stats || {};
  }

  create() {
    const mission = campaignsData[this.missionIndex];
    const nextMission = campaignsData[this.missionIndex + 1];

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050510, 0x050510, 0x100520, 0x100520, 1);
    bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a30, 0.08);
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      grid.strokeLineShape(new Phaser.Geom.Line(x, 0, x, CANVAS_HEIGHT));
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      grid.strokeLineShape(new Phaser.Geom.Line(0, y, CANVAS_WIDTH, y));
    }

    // Metal frame
    const frame = this.add.graphics();
    frame.lineStyle(4, UI.BORDER_OUTER);
    frame.strokeRect(8, 8, CANVAS_WIDTH - 16, CANVAS_HEIGHT - 16);
    frame.lineStyle(2, UI.BORDER_INNER);
    frame.strokeRect(14, 14, CANVAS_WIDTH - 28, CANVAS_HEIGHT - 28);

    if (this.won) {
      this._buildVictory(mission, nextMission);
    } else {
      this._buildDefeat(mission);
    }

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  _buildVictory(mission, nextMission) {
    // Firework particles
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 300, () => {
        const x = Phaser.Math.Between(100, CANVAS_WIDTH - 100);
        const y = Phaser.Math.Between(60, CANVAS_HEIGHT * 0.5);
        const colors = [0xffcc00, 0x00eedd, 0xff4488, 0x44ffaa];
        const color = colors[Phaser.Math.Between(0, colors.length - 1)];
        for (let j = 0; j < 10; j++) {
          const angle = (j / 10) * Math.PI * 2;
          const spark = this.add.circle(x, y, 4, color);
          this.tweens.add({
            targets: spark,
            x: x + Math.cos(angle) * 60,
            y: y + Math.sin(angle) * 60,
            alpha: 0,
            duration: 700,
            onComplete: () => spark.destroy(),
          });
        }
      });
    }

    // Victory header
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.1, 'VICTORY!', {
      fontSize: '64px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ffcc00', stroke: '#664400', strokeThickness: 10,
      shadow: { offsetX: 0, offsetY: 0, color: '#ffcc00', blur: 24, fill: true },
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.19, `Mission ${this.missionIndex + 1}: ${mission.name}`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#aaccff',
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.24, 'The Iron Cadets prevail!', {
      fontSize: '14px', fontFamily: 'monospace', color: '#88aacc',
    }).setOrigin(0.5);

    // Stats panel
    const panelX = CANVAS_WIDTH / 2, panelY = CANVAS_HEIGHT * 0.42;
    this.add.rectangle(panelX, panelY, 380, 130, 0x111133)
      .setStrokeStyle(2, 0x334466);

    const statsText = [
      `Turns taken:       ${this.stats.turns || 1}`,
      `Enemies destroyed: ${this.stats.enemiesKilled || 0}`,
      `Mechs lost:        ${this.stats.mechsLost || 0}`,
      `Credits earned:    ${mission.rewardCredits}`,
    ];
    statsText.forEach((line, i) => {
      this.add.text(panelX, panelY - 46 + i * 26, line, {
        fontSize: '14px', fontFamily: 'monospace', color: '#ccddee',
      }).setOrigin(0.5);
    });

    // Next mission button
    if (nextMission) {
      const btn = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.68, 260, 48, 0x004422)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0x44ff88);
      this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.68, `▶  NEXT: ${nextMission.name.toUpperCase()}`, {
        fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: '#44ff88',
      }).setOrigin(0.5);
      btn.on('pointerover', () => btn.setFillStyle(0x005533));
      btn.on('pointerout', () => btn.setFillStyle(0x004422));
      btn.on('pointerdown', () => {
        this.cameras.main.fade(300, 0, 0, 0);
        this.time.delayedCall(300, () => {
          this.scene.start('MechSelectScene', { missionIndex: this.missionIndex + 1 });
        });
      });
    } else {
      this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.68, 'CAMPAIGN COMPLETE!', {
        fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc00',
        shadow: { offsetX: 0, offsetY: 0, color: '#ffcc00', blur: 12, fill: true },
      }).setOrigin(0.5);
    }

    // Main menu button
    const replay = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.82, 200, 40, 0x002244)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x224488);
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.82, 'MAIN MENU', {
      fontSize: '13px', fontFamily: 'monospace', color: '#6688aa',
    }).setOrigin(0.5);
    replay.on('pointerover', () => replay.setFillStyle(0x003366));
    replay.on('pointerout', () => replay.setFillStyle(0x002244));
    replay.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });
  }

  _buildDefeat(mission) {
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.12, 'DEFEAT', {
      fontSize: '64px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ff3344', stroke: '#440011', strokeThickness: 10,
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.24, 'All mechs destroyed.', {
      fontSize: '18px', fontFamily: 'monospace', color: '#aa6677',
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.3, 'The colony needs you — try again!', {
      fontSize: '14px', fontFamily: 'monospace', color: '#886677',
    }).setOrigin(0.5);

    // Retry button
    const retry = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.55, 240, 48, 0x330011)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xcc2233);
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.55, 'RETRY MISSION', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ff4455',
    }).setOrigin(0.5);
    retry.on('pointerover', () => retry.setFillStyle(0x440022));
    retry.on('pointerout', () => retry.setFillStyle(0x330011));
    retry.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('MechSelectScene', { missionIndex: this.missionIndex });
      });
    });

    const menu = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.7, 200, 40, 0x111122)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x334466);
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.7, 'MAIN MENU', {
      fontSize: '13px', fontFamily: 'monospace', color: '#6688aa',
    }).setOrigin(0.5);
    menu.on('pointerover', () => menu.setFillStyle(0x222244));
    menu.on('pointerout', () => menu.setFillStyle(0x111122));
    menu.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });
  }
}
