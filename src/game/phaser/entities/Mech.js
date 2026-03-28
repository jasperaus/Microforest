import Phaser from 'phaser';
import { MECH_COLORS, MECH_SPRITE_SIZE } from '../../config.js';

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

    // Facing direction — player mechs start facing east (toward enemies)
    this.facing = data.facing || (data.team === 'player' ? 'E' : 'W');

    // Build sprite visuals
    this._buildSprite(scene, data);

    scene.add.existing(this);
    this.setDepth(10);
  }

  _buildSprite(scene, data) {
    const textureKey = `mech_${data.id}`;
    const spriteSize = MECH_SPRITE_SIZE;

    // Main mech body sprite
    this.bodySprite = scene.add.image(0, -6, textureKey);
    this.bodySprite.setDisplaySize(spriteSize, spriteSize);
    this.add(this.bodySprite);

    // HP bar — fixed-width track with a fill that shrinks from right
    const barW = 52;
    this.hpBarBg = scene.add.rectangle(0, 32, barW, 7, 0x111111);
    this.hpBarBg.setStrokeStyle(1, 0x000000);
    this.add(this.hpBarBg);

    // Fill starts at left edge and scales width from left anchor
    this.hpBar = scene.add.rectangle(-barW / 2, 32, barW, 5, 0x44ff44);
    this.hpBar.setOrigin(0, 0.5);
    this.add(this.hpBar);
    this._hpBarWidth = barW;

    // Name tag
    this.nameTag = scene.add.text(0, 38, data.name, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);
    this.add(this.nameTag);

    // Team indicator ring
    const ringColor = data.team === 'player' ? 0x4488ff : 0xff4444;
    this.ring = scene.add.circle(0, -6, 32, ringColor, 0);
    this.ring.setStrokeStyle(2, ringColor, 0.7);
    this.add(this.ring);

    // Facing indicator — small triangle below the sprite showing N/S/E/W
    this._facingIndicator = scene.add.graphics();
    this.add(this._facingIndicator);
    this._updateFacingIndicator(this.facing);

    // Flip enemy mechs to face left
    if (data.team === 'enemy') {
      this.bodySprite.setFlipX(true);
    }
  }

  updateHpBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width = Math.max(1, Math.floor(this._hpBarWidth * pct));
    const color = pct > 0.6 ? 0x44ff44 : pct > 0.3 ? 0xffcc00 : 0xff3333;
    this.hpBar.setFillStyle(color);
  }

  setSelected(selected) {
    this.ring.setStrokeStyle(selected ? 3 : 2,
      selected ? 0xffff00 : (this.team === 'player' ? 0x4488ff : 0xff4444),
      selected ? 1 : 0.7
    );
    const sz = selected ? 70 : 64;
    this.ring.setDisplaySize(sz, sz);
  }

  /** Update the facing direction and redraw the facing indicator. */
  setFacing(dir) {
    this.facing = dir;
    this._updateFacingIndicator(dir);
  }

  _updateFacingIndicator(facing) {
    const g = this._facingIndicator;
    g.clear();
    g.fillStyle(0xffcc44, 0.85);

    // Draw a small solid triangle pointing in the facing direction
    // positioned just outside the sprite bounds
    const sz = 7;
    const base = 30; // distance from center to base of triangle
    switch (facing) {
      case 'N':
        g.fillTriangle(0, -(base + sz), -sz, -base, sz, -base);
        break;
      case 'S':
        g.fillTriangle(0, base + sz, -sz, base, sz, base);
        break;
      case 'E':
        g.fillTriangle(base + sz, 0, base, -sz, base, sz);
        break;
      case 'W':
        g.fillTriangle(-(base + sz), 0, -base, -sz, -base, sz);
        break;
    }
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

  /** Flash red + damage popup on hit. opts: { isCrit, armorBroken } */
  playHitEffect(damage, opts = {}) {
    return new Promise(resolve => {
      this.updateHpBar();

      const flashColor = opts.isCrit ? '#ffaa00' : '#ff4444';
      const flashRepeats = opts.isCrit ? 4 : 2;

      this.scene.tweens.add({
        targets: this.bodySprite,
        alpha: { from: 1, to: 0.1 },
        yoyo: true,
        repeat: flashRepeats,
        duration: 70,
        onComplete: () => {
          this.bodySprite.setAlpha(this.stealthed ? 0.3 : 1);
          resolve();
        },
      });

      const label = opts.isCrit ? `CRIT! -${damage}` : `-${damage}`;
      const dmgText = this.scene.add.text(this.x, this.y - 24, label, {
        fontSize: opts.isCrit ? '20px' : '16px',
        fontFamily: 'monospace',
        color: flashColor,
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(50);

      this.scene.tweens.add({
        targets: dmgText,
        y: dmgText.y - 40,
        alpha: 0,
        duration: 950,
        onComplete: () => dmgText.destroy(),
      });

      if (opts.armorBroken) {
        const armText = this.scene.add.text(this.x, this.y - 8, 'ARMOR BREAK!', {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#ff8800',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5).setDepth(50);
        this.scene.tweens.add({
          targets: armText,
          y: armText.y - 28,
          alpha: 0,
          duration: 1100,
          onComplete: () => armText.destroy(),
        });
      }
    });
  }

  /** Orange overheat popup. */
  playOverheatEffect() {
    return new Promise(resolve => {
      const txt = this.scene.add.text(this.x, this.y - 32, 'OVERHEAT!', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ff6600',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(50);

      this.scene.tweens.add({
        targets: txt,
        y: txt.y - 30,
        alpha: 0,
        duration: 900,
        onComplete: () => { txt.destroy(); resolve(); },
      });
    });
  }

  /** Show a "MISS" popup. */
  playMissEffect() {
    return new Promise(resolve => {
      const txt = this.scene.add.text(this.x, this.y - 24, 'MISS!', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(50);

      this.scene.tweens.add({
        targets: txt,
        y: txt.y - 30,
        alpha: 0,
        duration: 700,
        onComplete: () => { txt.destroy(); resolve(); },
      });
    });
  }

  /** Green glow + heal text. */
  playHealEffect() {
    return new Promise(resolve => {
      this.updateHpBar();

      const txt = this.scene.add.text(this.x, this.y - 24, '+20 HP', {
        fontSize: '15px',
        fontFamily: 'monospace',
        color: '#44ff88',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(50);

      this.scene.tweens.add({
        targets: txt,
        y: txt.y - 32,
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
        fontSize: '32px',
      }).setOrigin(0.5).setDepth(50);

      this.scene.tweens.add({
        targets: boom,
        alpha: 0,
        scaleX: 2.5,
        scaleY: 2.5,
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
      facing: this.facing,
      special: this.special,
      specialName: this.specialName,
      weapons: this.weapons,
    };
  }
}
