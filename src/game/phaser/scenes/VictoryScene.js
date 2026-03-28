import Phaser from 'phaser';
import campaignsData from '../../data/campaigns.json';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config.js';

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

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050510, 0x050510, 0x100520, 0x100520, 1);
    bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.won) {
      this._buildVictory(mission, nextMission);
    } else {
      this._buildDefeat(mission);
    }

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  _buildVictory(mission, nextMission) {
    // Firework-like particles
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 300, () => {
        const x = Phaser.Math.Between(60, CANVAS_WIDTH - 60);
        const y = Phaser.Math.Between(40, CANVAS_HEIGHT * 0.5);
        const colors = [0xffcc00, 0x00eedd, 0xff4488, 0x44ffaa];
        const color = colors[Phaser.Math.Between(0, colors.length - 1)];
        for (let j = 0; j < 8; j++) {
          const angle = (j / 8) * Math.PI * 2;
          const spark = this.add.circle(x, y, 3, color);
          this.tweens.add({
            targets: spark,
            x: x + Math.cos(angle) * 40,
            y: y + Math.sin(angle) * 40,
            alpha: 0,
            duration: 600,
            onComplete: () => spark.destroy(),
          });
        }
      });
    }

    // Victory header
    this.add.text(CANVAS_WIDTH / 2, 50, 'VICTORY!', {
      fontSize: '48px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ffcc00', stroke: '#664400', strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 0, color: '#ffcc00', blur: 20, fill: true },
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, 100, `Mission ${this.missionIndex + 1}: ${mission.name}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaccff',
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, 120, 'The Iron Cadets prevail!', {
      fontSize: '11px', fontFamily: 'monospace', color: '#88aacc',
    }).setOrigin(0.5);

    // Stats panel
    const panelX = CANVAS_WIDTH / 2, panelY = CANVAS_HEIGHT * 0.45;
    this.add.rectangle(panelX, panelY, 280, 100, 0x111133).setStrokeStyle(1, 0x334466);

    const statsText = [
      `Turns taken:   ${this.stats.turns || 1}`,
      `Enemies destroyed: ${this.stats.enemiesKilled || 0}`,
      `Mechs lost:    ${this.stats.mechsLost || 0}`,
      `Credits earned: ${mission.rewardCredits}`,
    ];
    statsText.forEach((line, i) => {
      this.add.text(panelX, panelY - 36 + i * 20, line, {
        fontSize: '11px', fontFamily: 'monospace', color: '#ccddee',
      }).setOrigin(0.5);
    });

    // Next mission button
    if (nextMission) {
      const btn = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.72, 200, 40, 0x004422)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0x44ff88);
      this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.72, `▶  NEXT: ${nextMission.name.toUpperCase()}`, {
        fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#44ff88',
      }).setOrigin(0.5);
      btn.on('pointerdown', () => {
        this.cameras.main.fade(300, 0, 0, 0);
        this.time.delayedCall(300, () => {
          this.scene.start('MechSelectScene', { missionIndex: this.missionIndex + 1 });
        });
      });
    } else {
      // Final mission complete
      this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.72, '🏆 CAMPAIGN COMPLETE! 🏆', {
        fontSize: '16px', fontFamily: 'monospace', color: '#ffcc00',
      }).setOrigin(0.5);
    }

    // Replay button
    const replay = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.84, 160, 32, 0x002244)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x224488);
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.84, '↩  MAIN MENU', {
      fontSize: '11px', fontFamily: 'monospace', color: '#6688aa',
    }).setOrigin(0.5);
    replay.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });
  }

  _buildDefeat(mission) {
    this.add.text(CANVAS_WIDTH / 2, 55, 'DEFEAT', {
      fontSize: '48px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#ff3344', stroke: '#440011', strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, 106, 'All mechs destroyed.', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aa6677',
    }).setOrigin(0.5);

    this.add.text(CANVAS_WIDTH / 2, 126, 'The colony needs you — try again!', {
      fontSize: '11px', fontFamily: 'monospace', color: '#886677',
    }).setOrigin(0.5);

    // Retry button
    const retry = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.6, 180, 40, 0x330011)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xcc2233);
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.6, '↺  RETRY MISSION', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ff4455',
    }).setOrigin(0.5);
    retry.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('MechSelectScene', { missionIndex: this.missionIndex });
      });
    });

    const menu = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.74, 160, 32, 0x111122)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x334466);
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.74, '↩  MAIN MENU', {
      fontSize: '11px', fontFamily: 'monospace', color: '#6688aa',
    }).setOrigin(0.5);
    menu.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });
  }
}
