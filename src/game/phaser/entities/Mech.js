import { MECH_COLORS } from '../../config.js';

/**
 * Mech: a game entity sprite with state, animations, and combat data.
 * Extends Phaser.GameObjects.Container to hold sprite + health bar.
 */
export default class Mech extends Phaser.GameObjects.Container {
  constructor(scene, x, y, data) {
    super(scene, x, y);

    this.mechData = data;

    // Game state (mutable)
    this.id = data.id;
    this.name = data.name;
    this.class = data.class;
    this.team = data.team;
    this.row = data.row;
    this.col = data.col;
    this.speed = data.speed;
    this.maxHp = data.maxHp;
    this.hp = data.maxHp;
    this.maxHeat = data.maxHeat;
    this.heat = 0;
    this.frontArmor = data.frontArmor;
    this.maxFrontArmor = data.frontArmor;
    this.rearArmor = data.rearArmor;
    this.maxRearArmor = data.rearArmor;
    this.maxAp = 2;
    this.ap = 2;
    this.weapons = data.weapons;
    this.special = data.special;
    this.specialName = data.specialName;

    this.alive = true;
    this.stealthed = false;
    this.overheated = false;
    this.calledShot = false;
    this.activatedThisTurn = false;

    // Build sprite visuals
    this._buildSprite(scene, data);

    scene.add.existing(this);
    this.setDepth(10);
  }

  _buildSprite(scene, data) {
    const color = MECH_COLORS[data.id] || 0xffffff;
    const textureKey = `mech_${data.id}`;

    // Main mech body sprite
    this.bodySprite = scene.add.image(0, -4, textureKey);
    this.bodySprite.setDisplaySize(44, 44);
    this.add(this.bodySprite);

    // HP bar — fixed-width track with a fill that shrinks from right
    this.hpBarBg = scene.add.rectangle(0, 24, 40, 6, 0x111111);
    this.hpBarBg.setStrokeStyle(1, 0x000000);
    this.add(this.hpBarBg);

    // Fill starts at left edge (-20) and scales width from left anchor
    this.hpBar = scene.add.rectangle(-20, 24, 40, 6, 0x44ff44);
    this.hpBar.setOrigin(0, 0.5); // left-anchored so shrinking goes rightward
    this.add(this.hpBar);

    // Name tag
    this.nameTag = scene.add.text(0, 30, data.name, {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
    this.add(this.nameTag);

    // Team indicator ring
    const ringColor = data.team === 'player' ? 0x4488ff : 0xff4444;
    this.ring = scene.add.circle(0, -4, 24, ringColor, 0);
    this.ring.setStrokeStyle(2, ringColor, 0.8);
    this.add(this.ring);

    // Flip enemy mechs to face left
    if (data.team === 'enemy') {
      this.bodySprite.setFlipX(true);
    }
  }

  updateHpBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    // Width shrinks from the right; origin is at left edge so x stays fixed at -20
    this.hpBar.width = Math.max(1, Math.floor(40 * pct));
    const color = pct > 0.6 ? 0x44ff44 : pct > 0.3 ? 0xffcc00 : 0xff3333;
    this.hpBar.setFillStyle(color);
  }

  setSelected(selected) {
    this.ring.setStrokeStyle(selected ? 3 : 2,
      selected ? 0xffff00 : (this.team === 'player' ? 0x4488ff : 0xff4444),
      selected ? 1 : 0.8
    );
    this.ring.setDisplaySize(selected ? 52 : 48, selected ? 52 : 48);
  }

  setDimmed(dimmed) {
    this.bodySprite.setAlpha(dimmed ? 0.4 : 1);
    this.ring.setAlpha(dimmed ? 0.3 : 1);
    this.nameTag.setAlpha(dimmed ? 0.4 : 1);
  }

  /** Tween the mech to a new pixel position. Returns a Promise. */
  moveTo(x, y) {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        x, y,
        duration: 280,
        ease: 'Sine.easeInOut',
        onComplete: resolve,
      });
    });
  }

  /** Flash red + screen shake on hit. */
  playHitEffect(damage) {
    return new Promise(resolve => {
      this.updateHpBar();

      // Flash red
      this.scene.tweens.add({
        targets: this.bodySprite,
        alpha: { from: 1, to: 0.1 },
        yoyo: true,
        repeat: 2,
        duration: 80,
        onComplete: () => {
          this.bodySprite.setAlpha(this.stealthed ? 0.3 : 1);
          resolve();
        },
      });

      // Damage number popup
      const dmgText = this.scene.add.text(this.x, this.y - 20, `-${damage}`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(50);

      this.scene.tweens.add({
        targets: dmgText,
        y: dmgText.y - 30,
        alpha: 0,
        duration: 900,
        onComplete: () => dmgText.destroy(),
      });
    });
  }

  /** Show a "MISS" popup. */
  playMissEffect() {
    return new Promise(resolve => {
      const txt = this.scene.add.text(this.x, this.y - 20, 'MISS!', {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(50);

      this.scene.tweens.add({
        targets: txt,
        y: txt.y - 25,
        alpha: 0,
        duration: 700,
        onComplete: () => { txt.destroy(); resolve(); },
      });
    });
  }

  /** Green glow + "REPAIRED" text. */
  playHealEffect() {
    return new Promise(resolve => {
      this.updateHpBar();

      const txt = this.scene.add.text(this.x, this.y - 20, '+20 HP', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#44ff88',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(50);

      this.scene.tweens.add({
        targets: txt,
        y: txt.y - 28,
        alpha: 0,
        duration: 900,
        onComplete: () => { txt.destroy(); resolve(); },
      });
    });
  }

  /** Fade out + sink animation on death. */
  playDeathEffect() {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        angle: 45,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          this.setVisible(false);
          resolve();
        },
      });

      const boom = this.scene.add.text(this.x, this.y, '💥', {
        fontSize: '28px',
      }).setOrigin(0.5).setDepth(50);

      this.scene.tweens.add({
        targets: boom,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 600,
        onComplete: () => boom.destroy(),
      });
    });
  }

  /** Stealth flicker effect. */
  playStealthEffect() {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this.bodySprite,
        alpha: 0.25,
        duration: 400,
        onComplete: resolve,
      });
    });
  }

  /** Return a plain-object snapshot of mech state for React. */
  getState() {
    return {
      id: this.id,
      name: this.name,
      class: this.class,
      team: this.team,
      row: this.row,
      col: this.col,
      hp: this.hp,
      maxHp: this.maxHp,
      heat: this.heat,
      maxHeat: this.maxHeat,
      frontArmor: this.frontArmor,
      maxFrontArmor: this.maxFrontArmor,
      rearArmor: this.rearArmor,
      maxRearArmor: this.maxRearArmor,
      ap: this.ap,
      maxAp: this.maxAp,
      alive: this.alive,
      stealthed: this.stealthed,
      overheated: this.overheated,
      special: this.special,
      specialName: this.specialName,
      weapons: this.weapons,
    };
  }
}
