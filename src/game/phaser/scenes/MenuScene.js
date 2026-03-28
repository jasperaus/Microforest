import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    // Background gradient (dark space)
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a1040, 0x1a1040, 1);
    bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Stars
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, CANVAS_WIDTH);
      const y = Phaser.Math.Between(0, CANVAS_HEIGHT);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 1));
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: 0.1 },
        yoyo: true,
        repeat: -1,
        duration: Phaser.Math.Between(1500, 4000),
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    // Show all 5 mech silhouettes in a row (decorative)
    const mechIds = ['zip', 'rex', 'nova', 'vex', 'bolt'];
    const spacingX = CANVAS_WIDTH / (mechIds.length + 1);
    mechIds.forEach((id, i) => {
      const mx = spacingX * (i + 1);
      const my = CANVAS_HEIGHT * 0.38;
      const mech = this.add.image(mx, my, `mech_${id}`);
      mech.setDisplaySize(52, 52);
      mech.setAlpha(0.55);
      // Gentle float animation
      this.tweens.add({
        targets: mech,
        y: my - 6,
        yoyo: true,
        repeat: -1,
        duration: 1600 + i * 200,
        ease: 'Sine.easeInOut',
        delay: i * 150,
      });
    });

    // Title
    const title = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.14, 'IRON CADETS', {
      fontSize: '36px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#00eedd',
      stroke: '#004444',
      strokeThickness: 6,
      shadow: { offsetX: 2, offsetY: 2, color: '#00ffee', blur: 8, fill: true },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scaleX: { from: 1, to: 1.02 },
      scaleY: { from: 1, to: 1.02 },
      yoyo: true,
      repeat: -1,
      duration: 2000,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.22, 'A BattleTech Tactical RPG', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#aaaacc',
    }).setOrigin(0.5);

    // Story blurb
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.56, 'Rogue drones threaten the colony.\nCommand your squad of Iron Cadets and save the day!', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ccccee',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    // Play button
    const btnBg = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.72, 160, 40, 0x004488).setInteractive({ useHandCursor: true });
    const btnText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.72, '▶  PLAY', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    btnBg.setStrokeStyle(2, 0x0088ff);

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
      this.time.delayedCall(300, () => this.scene.start('MechSelectScene', { missionIndex: 0 }));
    });

    // Pulse button
    this.tweens.add({
      targets: btnBg,
      scaleX: { from: 1, to: 1.04 },
      scaleY: { from: 1, to: 1.04 },
      yoyo: true,
      repeat: -1,
      duration: 900,
    });

    // How to play hint
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.88, 'Click mechs to select  •  Move  •  Attack  •  End Turn', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#666688',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }
}
