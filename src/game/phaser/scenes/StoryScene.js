import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI } from '../../config.js';

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

const SLIDES = [
  {
    headline: 'YEAR  2847',
    body: 'The Outer Rim colonies are home to millions.\nFor decades, the Iron Cadets — elite young mech\npilots — have kept them safe.',
    visual: 'starfield',
  },
  {
    headline: 'SIGNAL  DETECTED',
    body: 'Then the drones came. Hundreds of rogue\nautonomous war machines, advancing on New Geneva\ncolony without mercy or warning.',
    visual: 'radar',
  },
  {
    headline: 'IRON CADETS:  SCRAMBLE',
    body: 'Colony evacuation: T-minus 60 minutes.\nCommander, your squad is the only thing standing\nbetween those people and destruction.',
    visual: 'mech',
  },
  {
    headline: 'YOUR ORDERS,  COMMANDER',
    body: 'Choose your mechs.\nLock your loadout.\nThe clock is ticking.',
    visual: 'transmission',
  },
];

export default class StoryScene extends Phaser.Scene {
  constructor() {
    super('StoryScene');
  }

  init(data) {
    this.missionIndex = data?.missionIndex ?? 0;
  }

  create() {
    this._currentSlide = 0;
    this._transitioning = false;
    this._skipping = false;
    this._typewriterTimer = null;
    this._promptTween = null;

    // Layer 0: background gradient + procedural visuals
    this._bgLayer = this.add.graphics();
    this._visualLayer = this.add.graphics();

    // Slide number indicator
    this._slideIndicator = this.add.text(CANVAS_WIDTH - 18, 18, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#334455',
    }).setOrigin(1, 0);

    // Headline
    this._headlineText = this.add.text(CX, CANVAS_HEIGHT * 0.22, '', {
      fontSize: '40px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#00eedd',
      stroke: '#003333',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffee', blur: 16, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    // Body text
    this._bodyText = this.add.text(CX, CANVAS_HEIGHT * 0.45, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ccddee',
      align: 'center',
      lineSpacing: 10,
      wordWrap: { width: 800 },
    }).setOrigin(0.5).setAlpha(0);

    // Continue prompt
    this._promptText = this.add.text(CX, CANVAS_HEIGHT - 40, 'CLICK OR SPACE TO CONTINUE', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#557799',
    }).setOrigin(0.5).setAlpha(0);

    // Skip hint
    this.add.text(CANVAS_WIDTH - 18, CANVAS_HEIGHT - 18, 'ESC: SKIP ALL', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#334455',
    }).setOrigin(1, 1);

    // Black fade overlay
    this._fadeRect = this.add.rectangle(
      CX, CY, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 1
    ).setDepth(100);

    // Input
    this.input.on('pointerdown', () => this._onAdvance());
    this.input.keyboard.on('keydown-SPACE', () => this._onAdvance());
    this.input.keyboard.on('keydown-ESC', () => this._skip());

    this._showSlide(0);
  }

  // ── Slide rendering ────────────────────────────────────────────────────────

  _showSlide(index) {
    if (this._skipping) return;
    this._currentSlide = index;
    this._transitioning = true;
    this._typewriterTimer?.remove();
    this._typewriterTimer = null;
    this._promptTween?.stop();
    this._promptTween = null;

    const slide = SLIDES[index];
    this._slideIndicator.setText(`${index + 1} / ${SLIDES.length}`);

    this._drawVisual(slide.visual);

    this._headlineText.setText(slide.headline).setAlpha(0);
    this._bodyText.setText('').setAlpha(0);
    this._promptText.setAlpha(0);

    this.tweens.add({
      targets: this._fadeRect,
      alpha: 0,
      duration: 400,
      ease: 'Linear',
      onComplete: () => {
        if (this._skipping) return;
        this.tweens.add({
          targets: this._headlineText,
          alpha: 1,
          duration: 350,
          onComplete: () => {
            if (this._skipping) return;
            this.tweens.add({
              targets: this._bodyText,
              alpha: 1,
              duration: 200,
              onComplete: () => {
                if (this._skipping) return;
                this._typeText(this._bodyText, slide.body, () => {
                  if (this._skipping) return;
                  this._transitioning = false;
                  this._promptText.setAlpha(1);
                  this._promptTween = this.tweens.add({
                    targets: this._promptText,
                    alpha: { from: 1, to: 0.15 },
                    yoyo: true, repeat: -1,
                    duration: 700,
                  });
                });
              },
            });
          },
        });
      },
    });
  }

  _typeText(textObj, fullString, onComplete) {
    let i = 0;
    textObj.setText('');
    this._typewriterTimer = this.time.addEvent({
      delay: 30,
      repeat: fullString.length - 1,
      callback: () => {
        if (this._skipping) return;
        textObj.setText(fullString.slice(0, ++i));
        if (i === fullString.length && onComplete) onComplete();
      },
    });
  }

  // ── Input handlers ─────────────────────────────────────────────────────────

  _onAdvance() {
    if (this._skipping) return;

    if (this._transitioning) {
      this._typewriterTimer?.remove();
      this._typewriterTimer = null;
      this.tweens.killTweensOf([this._headlineText, this._bodyText, this._fadeRect, this._promptText]);
      const slide = SLIDES[this._currentSlide];
      this._fadeRect.setAlpha(0);
      this._headlineText.setText(slide.headline).setAlpha(1);
      this._bodyText.setText(slide.body).setAlpha(1);
      this._transitioning = false;
      this._promptText.setAlpha(1);
      this._promptTween?.stop();
      this._promptTween = this.tweens.add({
        targets: this._promptText,
        alpha: { from: 1, to: 0.15 },
        yoyo: true, repeat: -1,
        duration: 700,
      });
      return;
    }

    const next = this._currentSlide + 1;
    if (next >= SLIDES.length) {
      this._endStory();
    } else {
      this._transitioning = true;
      this._promptTween?.stop();
      this._promptTween = null;
      this._promptText.setAlpha(0);
      this.tweens.add({
        targets: this._fadeRect,
        alpha: 1,
        duration: 300,
        ease: 'Linear',
        onComplete: () => this._showSlide(next),
      });
    }
  }

  _skip() {
    if (this._skipping) return;
    this._skipping = true;
    this._typewriterTimer?.remove();
    this._promptTween?.stop();
    this.tweens.killAll();
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('MechSelectScene', { missionIndex: this.missionIndex });
    });
  }

  // ── End sequence ───────────────────────────────────────────────────────────

  _endStory() {
    this._skipping = true;
    this._typewriterTimer?.remove();
    this._promptTween?.stop();
    this.tweens.killAll();

    const flash = this.add.rectangle(CX, CY, CANVAS_WIDTH, CANVAS_HEIGHT, 0xffffff, 0).setDepth(200);

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      duration: 180,
      yoyo: true,
      onComplete: () => {
        this._fadeRect.setAlpha(0.88).setDepth(150);

        const callText = this.add.text(CX, CY, 'CADET,\nCHOOSE YOUR SQUAD', {
          fontSize: '40px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#00eedd',
          align: 'center',
          stroke: '#002233',
          strokeThickness: 8,
          lineSpacing: 14,
          shadow: { offsetX: 0, offsetY: 0, color: '#00ffee', blur: 20, fill: true },
        }).setOrigin(0.5).setDepth(160).setAlpha(0);

        this.tweens.add({
          targets: callText,
          alpha: 1,
          duration: 450,
          hold: 1000,
          yoyo: true,
          onComplete: () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
              this.scene.start('MechSelectScene', { missionIndex: this.missionIndex });
            });
          },
        });
      },
    });
  }

  // ── Procedural visuals per slide ───────────────────────────────────────────

  _drawVisual(type) {
    this._bgLayer.clear();
    this._visualLayer.clear();

    // Deep space background
    this._bgLayer.fillGradientStyle(0x020210, 0x020210, 0x06061a, 0x06061a, 1);
    this._bgLayer.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (type === 'starfield') {
      this._bgLayer.fillStyle(0xffffff, 1);
      for (let i = 0; i < 140; i++) {
        const x = Phaser.Math.Between(0, CANVAS_WIDTH);
        const y = Phaser.Math.Between(0, CANVAS_HEIGHT);
        const r = Phaser.Math.FloatBetween(0.4, 2.0);
        const a = Phaser.Math.FloatBetween(0.3, 1);
        this._bgLayer.fillStyle(0xffffff, a);
        this._bgLayer.fillCircle(x, y, r);
      }

      // Distant planet (upper-right area)
      const px = CANVAS_WIDTH * 0.72, py = CANVAS_HEIGHT * 0.18;
      this._visualLayer.fillStyle(0x1a4a6a, 1);
      this._visualLayer.fillCircle(px, py, 100);
      this._visualLayer.fillStyle(0x2266aa, 0.45);
      this._visualLayer.fillCircle(px, py, 120);
      this._visualLayer.fillStyle(0x44aacc, 0.2);
      this._visualLayer.fillCircle(px, py, 144);
      // Continent patches
      this._visualLayer.fillStyle(0x2a6a40, 0.7);
      this._visualLayer.fillEllipse(px - 18, py - 30, 56, 32);
      this._visualLayer.fillEllipse(px + 30, py + 15, 38, 26);
      // Highlight
      this._visualLayer.fillStyle(0xaaddff, 0.12);
      this._visualLayer.fillCircle(px - 26, py - 32, 44);

    } else if (type === 'radar') {
      this._bgLayer.fillStyle(0xffffff, 0.5);
      for (let i = 0; i < 50; i++) {
        this._bgLayer.fillCircle(
          Phaser.Math.Between(0, CANVAS_WIDTH),
          Phaser.Math.Between(0, CANVAS_HEIGHT),
          0.8
        );
      }

      // Concentric rings
      this._visualLayer.lineStyle(1, 0x330000, 0.9);
      for (let r = 80; r <= 480; r += 80) {
        this._visualLayer.strokeCircle(CX, CY, r);
      }
      // Crosshairs
      this._visualLayer.strokeLineShape(new Phaser.Geom.Line(CX, 30, CX, CANVAS_HEIGHT - 30));
      this._visualLayer.strokeLineShape(new Phaser.Geom.Line(30, CY, CANVAS_WIDTH - 30, CY));
      // Diagonals
      this._visualLayer.lineStyle(1, 0x220000, 0.4);
      this._visualLayer.strokeLineShape(new Phaser.Geom.Line(CX - 360, CY - 360, CX + 360, CY + 360));
      this._visualLayer.strokeLineShape(new Phaser.Geom.Line(CX + 360, CY - 360, CX - 360, CY + 360));

      // Threat blips
      const blips = [
        [180, 180], [120, 300], [220, 420], [150, 520], [90, 240], [260, 480],
        [340, 160], [100, 440],
      ];
      blips.forEach(([x, y]) => {
        this._visualLayer.fillStyle(0xff1100, 0.9);
        this._visualLayer.fillCircle(x, y, 6);
        this._visualLayer.fillStyle(0xff3300, 0.35);
        this._visualLayer.fillCircle(x, y, 16);
        this._visualLayer.fillStyle(0xff2200, 0.12);
        this._visualLayer.fillCircle(x, y, 30);
      });

      // Sweep sector
      this._visualLayer.fillStyle(0xff0000, 0.06);
      this._visualLayer.slice(CX, CY, 460, -0.2, 0.1, false);
      this._visualLayer.fillPath();

    } else if (type === 'mech') {
      this._bgLayer.fillStyle(0xffffff, 0.3);
      for (let i = 0; i < 70; i++) {
        this._bgLayer.fillCircle(
          Phaser.Math.Between(0, CANVAS_WIDTH),
          Phaser.Math.Between(0, CANVAS_HEIGHT),
          Phaser.Math.FloatBetween(0.5, 1.5)
        );
      }

      // Large mech silhouette (right-center)
      const mx = CANVAS_WIDTH * 0.65, my = CANVAS_HEIGHT * 0.48;
      const s = 1.5; // scale factor vs original

      // Outer glow
      this._visualLayer.fillStyle(0x0066cc, 0.06);
      this._visualLayer.fillCircle(mx, my, 190);
      this._visualLayer.fillStyle(0x0088ff, 0.09);
      this._visualLayer.fillCircle(mx, my, 140);

      // Mech body (dark silhouette)
      this._visualLayer.fillStyle(0x101028, 1);
      // Torso
      this._visualLayer.fillRect(mx - 48 * s, my - 66 * s, 96 * s, 111 * s);
      // Head
      this._visualLayer.fillRect(mx - 27 * s, my - 108 * s, 54 * s, 45 * s);
      // Shoulders
      this._visualLayer.fillRect(mx - 87 * s, my - 57 * s, 36 * s, 42 * s);
      this._visualLayer.fillRect(mx + 51 * s, my - 57 * s, 36 * s, 42 * s);
      // Forearms
      this._visualLayer.fillRect(mx - 96 * s, my - 21 * s, 24 * s, 66 * s);
      this._visualLayer.fillRect(mx + 72 * s, my - 21 * s, 33 * s, 24 * s);
      this._visualLayer.fillRect(mx + 78 * s, my, 24 * s, 36 * s);
      // Legs
      this._visualLayer.fillRect(mx - 45 * s, my + 45 * s, 36 * s, 78 * s);
      this._visualLayer.fillRect(mx + 9 * s, my + 45 * s, 36 * s, 78 * s);
      // Feet
      this._visualLayer.fillRect(mx - 54 * s, my + 117 * s, 45 * s, 18 * s);
      this._visualLayer.fillRect(mx + 9 * s, my + 117 * s, 45 * s, 18 * s);

      // Eye glow
      this._visualLayer.fillStyle(0x00eedd, 1);
      this._visualLayer.fillCircle(mx - 10 * s, my - 85 * s, 6);
      this._visualLayer.fillCircle(mx + 10 * s, my - 85 * s, 6);
      this._visualLayer.fillStyle(0x00eedd, 0.18);
      this._visualLayer.fillCircle(mx, my - 85 * s, 26);

      // Chest core
      this._visualLayer.fillStyle(0x0088ff, 0.5);
      this._visualLayer.fillCircle(mx, my - 15 * s, 12);
      this._visualLayer.fillStyle(0x44aaff, 1);
      this._visualLayer.fillCircle(mx, my - 15 * s, 6);

    } else if (type === 'transmission') {
      // CRT scanlines
      for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        const a = y % 8 === 0 ? 0.14 : 0.04;
        this._visualLayer.fillStyle(0x00bb77, a);
        this._visualLayer.fillRect(0, y, CANVAS_WIDTH, 2);
      }

      // Static noise blocks
      this._visualLayer.fillStyle(0x00bb77, 0.05);
      for (let i = 0; i < 80; i++) {
        const x = Phaser.Math.Between(0, CANVAS_WIDTH - 120);
        const y = Phaser.Math.Between(0, CANVAS_HEIGHT);
        const w = Phaser.Math.Between(40, 200);
        const h = Phaser.Math.Between(1, 6);
        this._visualLayer.fillRect(x, y, w, h);
      }

      // Border frame
      this._visualLayer.lineStyle(2, 0x00bb77, 0.55);
      this._visualLayer.strokeRect(26, 26, CANVAS_WIDTH - 52, CANVAS_HEIGHT - 52);
      this._visualLayer.lineStyle(1, 0x00bb77, 0.18);
      this._visualLayer.strokeRect(36, 36, CANVAS_WIDTH - 72, CANVAS_HEIGHT - 72);

      // Corner tick marks
      const tLen = 22;
      [
        [26, 26], [CANVAS_WIDTH - 26, 26],
        [26, CANVAS_HEIGHT - 26], [CANVAS_WIDTH - 26, CANVAS_HEIGHT - 26],
      ].forEach(([cx, cy]) => {
        this._visualLayer.lineStyle(2, 0x00ff99, 0.6);
        const dx = cx < CX ? tLen : -tLen;
        const dy = cy < CY ? tLen : -tLen;
        this._visualLayer.strokeLineShape(new Phaser.Geom.Line(cx, cy, cx + dx, cy));
        this._visualLayer.strokeLineShape(new Phaser.Geom.Line(cx, cy, cx, cy + dy));
      });
    }
  }
}
