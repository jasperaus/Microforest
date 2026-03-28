import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI } from '../../config.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    // ── Background ─────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a14, 0x0a0a14, 0x141428, 0x141428, 1);
    bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle grid pattern
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a30, 0.12);
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      grid.strokeLineShape(new Phaser.Geom.Line(x, 0, x, CANVAS_HEIGHT));
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      grid.strokeLineShape(new Phaser.Geom.Line(0, y, CANVAS_WIDTH, y));
    }

    // ── Metal frame border ─────────────────────────────────────────────────
    const frame = this.add.graphics();
    frame.lineStyle(4, UI.BORDER_OUTER);
    frame.strokeRect(8, 8, CANVAS_WIDTH - 16, CANVAS_HEIGHT - 16);
    frame.lineStyle(2, UI.BORDER_INNER);
    frame.strokeRect(14, 14, CANVAS_WIDTH - 28, CANVAS_HEIGHT - 28);

    // Corner rivets
    const rivetPos = [
      [22, 22], [CANVAS_WIDTH - 22, 22],
      [22, CANVAS_HEIGHT - 22], [CANVAS_WIDTH - 22, CANVAS_HEIGHT - 22],
    ];
    rivetPos.forEach(([rx, ry]) => {
      frame.fillStyle(UI.BORDER_RIVET, 1);
      frame.fillCircle(rx, ry, 5);
      frame.fillStyle(0x666660, 0.4);
      frame.fillCircle(rx - 1, ry - 1, 2);
    });

    // ── Stars ──────────────────────────────────────────────────────────────
    for (let i = 0; i < 120; i++) {
      const x = Phaser.Math.Between(24, CANVAS_WIDTH - 24);
      const y = Phaser.Math.Between(24, CANVAS_HEIGHT - 24);
      const size = Phaser.Math.FloatBetween(0.5, 2.5);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: 0.05 },
        yoyo: true, repeat: -1,
        duration: Phaser.Math.Between(1500, 4000),
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    // ── Mech silhouettes ───────────────────────────────────────────────────
    const mechIds = ['zip', 'rex', 'nova', 'vex', 'bolt'];
    const spacingX = CANVAS_WIDTH / (mechIds.length + 1);
    mechIds.forEach((id, i) => {
      const mx = spacingX * (i + 1);
      const my = CANVAS_HEIGHT * 0.42;
      const mech = this.add.image(mx, my, `mech_${id}`);
      mech.setDisplaySize(80, 80);
      mech.setAlpha(0.5);
      this.tweens.add({
        targets: mech,
        y: my - 8,
        yoyo: true, repeat: -1,
        duration: 1600 + i * 200,
        ease: 'Sine.easeInOut',
        delay: i * 150,
      });
    });

    // ── Scanline overlay ───────────────────────────────────────────────────
    const scanlines = this.add.graphics();
    for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
      scanlines.fillStyle(0x000000, y % 8 === 0 ? 0.06 : 0.02);
      scanlines.fillRect(0, y, CANVAS_WIDTH, 2);
    }

    // ── Title ──────────────────────────────────────────────────────────────
    const title = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.14, 'IRON CADETS', {
      fontSize: '52px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#00eedd',
      stroke: '#004444',
      strokeThickness: 8,
      shadow: { offsetX: 2, offsetY: 2, color: '#00ffee', blur: 12, fill: true },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scaleX: { from: 1, to: 1.02 },
      scaleY: { from: 1, to: 1.02 },
      yoyo: true, repeat: -1,
      duration: 2000,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.22, 'A BattleTech Tactical RPG', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#aaaacc',
    }).setOrigin(0.5);

    // Story blurb
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.58, 'Rogue drones threaten the colony.\nCommand your squad of Iron Cadets and save the day!', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ccccee',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    // ── Play button ────────────────────────────────────────────────────────
    const btnX = CANVAS_WIDTH / 2, btnY = CANVAS_HEIGHT * 0.72;
    const btnBg = this.add.rectangle(btnX, btnY, 200, 48, 0x004488)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x0088ff);

    this.add.rectangle(btnX, btnY, 196, 44, 0x004488, 0)
      .setStrokeStyle(1, 0x0066aa);

    const btnText = this.add.text(btnX, btnY, '▶  PLAY', {
      fontSize: '22px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x0066cc);
      btnText.setScale(1.05);
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x004488);
      btnText.setScale(1);
    });
    btnBg.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('StoryScene', { missionIndex: 0 }));
    });

    this.tweens.add({
      targets: btnBg,
      scaleX: { from: 1, to: 1.04 },
      scaleY: { from: 1, to: 1.04 },
      yoyo: true, repeat: -1,
      duration: 900,
    });

    // How to play hint
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.88, 'Click mechs to select  •  Move  •  Attack  •  End Turn', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#555577',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }
}
