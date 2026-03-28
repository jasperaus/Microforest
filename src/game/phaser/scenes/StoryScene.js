import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config.js';

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
    this._slideIndicator = this.add.text(CANVAS_WIDTH - 12, 12, '', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#334455',
    }).setOrigin(1, 0);

    // Headline
    this._headlineText = this.add.text(CANVAS_WIDTH / 2, 130, '', {
      fontSize: '30px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#00eedd',
      stroke: '#003333',
      strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 0, color: '#00ffee', blur: 12, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    // Body text
    this._bodyText = this.add.text(CANVAS_WIDTH / 2, 270, '', {
      fontSize: '15px',
      fontFamily: 'monospace',
      color: '#ccddee',
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: 560 },
    }).setOrigin(0.5).setAlpha(0);

    // Continue prompt
    this._promptText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 28, 'CLICK OR SPACE TO CONTINUE', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#557799',
    }).setOrigin(0.5).setAlpha(0);

    // Skip hint
    this.add.text(CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12, 'ESC: SKIP ALL', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#334455',
    }).setOrigin(1, 1);

    // Black fade overlay (starts opaque, fades to reveal each slide)
    this._fadeRect = this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      0x000000, 1
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

    // Draw background and visual for this slide
    this._drawVisual(slide.visual);

    // Reset text elements
    this._headlineText.setText(slide.headline).setAlpha(0);
    this._bodyText.setText('').setAlpha(0);
    this._promptText.setAlpha(0);

    // Fade in from black
    this.tweens.add({
      targets: this._fadeRect,
      alpha: 0,
      duration: 400,
      ease: 'Linear',
      onComplete: () => {
        if (this._skipping) return;
        // Fade in headline
        this.tweens.add({
          targets: this._headlineText,
          alpha: 1,
          duration: 350,
          onComplete: () => {
            if (this._skipping) return;
            // Fade in body area, then typewrite
            this.tweens.add({
              targets: this._bodyText,
              alpha: 1,
              duration: 200,
              onComplete: () => {
                if (this._skipping) return;
                this._typeText(this._bodyText, slide.body, () => {
                  if (this._skipping) return;
                  this._transitioning = false;
                  // Pulse prompt
                  this._promptText.setAlpha(1);
                  this._promptTween = this.tweens.add({
                    targets: this._promptText,
                    alpha: { from: 1, to: 0.15 },
                    yoyo: true,
                    repeat: -1,
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
      // Skip remaining animations — show everything immediately
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
        yoyo: true,
        repeat: -1,
        duration: 700,
      });
      return;
    }

    // Advance to next slide or end
    const next = this._currentSlide + 1;
    if (next >= SLIDES.length) {
      this._endStory();
    } else {
      this._transitioning = true;
      this._promptTween?.stop();
      this._promptTween = null;
      this._promptText.setAlpha(0);
      // Fade to black, then show next slide
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

    // White flash
    const flash = this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      0xffffff, 0
    ).setDepth(200);

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      duration: 180,
      yoyo: true,
      onComplete: () => {
        // Dark overlay
        this._fadeRect.setAlpha(0.88).setDepth(150);

        // Big call-to-action text
        const callText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'CADET,\nCHOOSE YOUR SQUAD', {
          fontSize: '30px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#00eedd',
          align: 'center',
          stroke: '#002233',
          strokeThickness: 6,
          lineSpacing: 10,
          shadow: { offsetX: 0, offsetY: 0, color: '#00ffee', blur: 16, fill: true },
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
      // Stars
      this._bgLayer.fillStyle(0xffffff, 1);
      for (let i = 0; i < 90; i++) {
        const x = Phaser.Math.Between(0, CANVAS_WIDTH);
        const y = Phaser.Math.Between(0, CANVAS_HEIGHT);
        const r = Phaser.Math.FloatBetween(0.4, 1.8);
        const a = Phaser.Math.FloatBetween(0.3, 1);
        this._bgLayer.fillStyle(0xffffff, a);
        this._bgLayer.fillCircle(x, y, r);
      }

      // Distant planet (top-right)
      this._visualLayer.fillStyle(0x1a4a6a, 1);
      this._visualLayer.fillCircle(590, 90, 68);
      // Atmosphere layers
      this._visualLayer.fillStyle(0x2266aa, 0.45);
      this._visualLayer.fillCircle(590, 90, 82);
      this._visualLayer.fillStyle(0x44aacc, 0.2);
      this._visualLayer.fillCircle(590, 90, 98);
      // Continent patches
      this._visualLayer.fillStyle(0x2a6a40, 0.7);
      this._visualLayer.fillEllipse(578, 70, 38, 22);
      this._visualLayer.fillEllipse(610, 100, 26, 18);
      // Planet highlight
      this._visualLayer.fillStyle(0xaaddff, 0.12);
      this._visualLayer.fillCircle(572, 68, 30);

    } else if (type === 'radar') {
      // Faint stars
      this._bgLayer.fillStyle(0xffffff, 0.5);
      for (let i = 0; i < 35; i++) {
        this._bgLayer.fillCircle(
          Phaser.Math.Between(0, CANVAS_WIDTH),
          Phaser.Math.Between(0, CANVAS_HEIGHT),
          0.8
        );
      }

      // Radar grid — concentric rings
      this._visualLayer.lineStyle(1, 0x330000, 0.9);
      for (let r = 60; r <= 320; r += 60) {
        this._visualLayer.strokeCircle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, r);
      }
      // Crosshairs
      this._visualLayer.strokeLineShape(new Phaser.Geom.Line(CANVAS_WIDTH / 2, 20, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20));
      this._visualLayer.strokeLineShape(new Phaser.Geom.Line(20, CANVAS_HEIGHT / 2, CANVAS_WIDTH - 20, CANVAS_HEIGHT / 2));
      // Diagonal arms
      this._visualLayer.lineStyle(1, 0x220000, 0.4);
      this._visualLayer.strokeLineShape(new Phaser.Geom.Line(CANVAS_WIDTH / 2 - 230, CANVAS_HEIGHT / 2 - 230, CANVAS_WIDTH / 2 + 230, CANVAS_HEIGHT / 2 + 230));
      this._visualLayer.strokeLineShape(new Phaser.Geom.Line(CANVAS_WIDTH / 2 + 230, CANVAS_HEIGHT / 2 - 230, CANVAS_WIDTH / 2 - 230, CANVAS_HEIGHT / 2 + 230));

      // Incoming threat blips (approaching from left side toward center)
      const blips = [
        [130, 130], [90, 200], [160, 280], [110, 350], [70, 160], [180, 320],
      ];
      blips.forEach(([x, y]) => {
        this._visualLayer.fillStyle(0xff1100, 0.9);
        this._visualLayer.fillCircle(x, y, 5);
        this._visualLayer.fillStyle(0xff3300, 0.35);
        this._visualLayer.fillCircle(x, y, 12);
        this._visualLayer.fillStyle(0xff2200, 0.12);
        this._visualLayer.fillCircle(x, y, 22);
      });

      // Sweep line (static representation — a sector arc)
      this._visualLayer.fillStyle(0xff0000, 0.06);
      this._visualLayer.slice(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 300, -0.2, 0.1, false);
      this._visualLayer.fillPath();

    } else if (type === 'mech') {
      // Stars (fewer)
      this._bgLayer.fillStyle(0xffffff, 0.3);
      for (let i = 0; i < 50; i++) {
        this._bgLayer.fillCircle(
          Phaser.Math.Between(0, CANVAS_WIDTH),
          Phaser.Math.Between(0, CANVAS_HEIGHT),
          Phaser.Math.FloatBetween(0.5, 1.5)
        );
      }

      // Large mech silhouette (right side, 570, 280)
      const mx = 560, my = 275;

      // Outer glow rings
      this._visualLayer.fillStyle(0x0066cc, 0.06);
      this._visualLayer.fillCircle(mx, my, 130);
      this._visualLayer.fillStyle(0x0088ff, 0.09);
      this._visualLayer.fillCircle(mx, my, 95);

      // Mech body (dark silhouette)
      this._visualLayer.fillStyle(0x101028, 1);
      // Torso
      this._visualLayer.fillRect(mx - 32, my - 44, 64, 74);
      // Head
      this._visualLayer.fillRect(mx - 18, my - 72, 36, 30);
      // Shoulders / upper arms
      this._visualLayer.fillRect(mx - 58, my - 38, 24, 28);
      this._visualLayer.fillRect(mx + 34, my - 38, 24, 28);
      // Forearms (cannon arm right, shield arm left)
      this._visualLayer.fillRect(mx - 64, my - 14, 16, 44);
      this._visualLayer.fillRect(mx + 48, my - 14, 22, 16);
      this._visualLayer.fillRect(mx + 52, my, 16, 24);
      // Legs
      this._visualLayer.fillRect(mx - 30, my + 30, 24, 52);
      this._visualLayer.fillRect(mx + 6, my + 30, 24, 52);
      // Feet
      this._visualLayer.fillRect(mx - 36, my + 78, 30, 12);
      this._visualLayer.fillRect(mx + 6, my + 78, 30, 12);

      // Eye glow
      this._visualLayer.fillStyle(0x00eedd, 1);
      this._visualLayer.fillCircle(mx - 7, my - 57, 4);
      this._visualLayer.fillCircle(mx + 7, my - 57, 4);
      // Cockpit halo
      this._visualLayer.fillStyle(0x00eedd, 0.18);
      this._visualLayer.fillCircle(mx, my - 57, 18);

      // Chest power core glow
      this._visualLayer.fillStyle(0x0088ff, 0.5);
      this._visualLayer.fillCircle(mx, my - 10, 8);
      this._visualLayer.fillStyle(0x44aaff, 1);
      this._visualLayer.fillCircle(mx, my - 10, 4);

    } else if (type === 'transmission') {
      // CRT scanlines
      for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        const a = y % 8 === 0 ? 0.14 : 0.04;
        this._visualLayer.fillStyle(0x00bb77, a);
        this._visualLayer.fillRect(0, y, CANVAS_WIDTH, 2);
      }

      // Static noise blocks (horizontal glitch streaks)
      this._visualLayer.fillStyle(0x00bb77, 0.05);
      for (let i = 0; i < 50; i++) {
        const x = Phaser.Math.Between(0, CANVAS_WIDTH - 80);
        const y = Phaser.Math.Between(0, CANVAS_HEIGHT);
        const w = Phaser.Math.Between(30, 140);
        const h = Phaser.Math.Between(1, 6);
        this._visualLayer.fillRect(x, y, w, h);
      }

      // Outer border frame (transmission window)
      this._visualLayer.lineStyle(2, 0x00bb77, 0.55);
      this._visualLayer.strokeRect(18, 18, CANVAS_WIDTH - 36, CANVAS_HEIGHT - 36);
      this._visualLayer.lineStyle(1, 0x00bb77, 0.18);
      this._visualLayer.strokeRect(26, 26, CANVAS_WIDTH - 52, CANVAS_HEIGHT - 52);

      // Corner tick marks
      const tLen = 16;
      [[18, 18], [CANVAS_WIDTH - 18, 18], [18, CANVAS_HEIGHT - 18], [CANVAS_WIDTH - 18, CANVAS_HEIGHT - 18]].forEach(([cx, cy]) => {
        this._visualLayer.lineStyle(2, 0x00ff99, 0.6);
        const dx = cx < CANVAS_WIDTH / 2 ? tLen : -tLen;
        const dy = cy < CANVAS_HEIGHT / 2 ? tLen : -tLen;
        this._visualLayer.strokeLineShape(new Phaser.Geom.Line(cx, cy, cx + dx, cy));
        this._visualLayer.strokeLineShape(new Phaser.Geom.Line(cx, cy, cx, cy + dy));
      });
    }
  }
}
