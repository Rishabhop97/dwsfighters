// ====================== CHARACTERS ======================
const CHARACTERS = [
  { id: 0, name: "Tauseef Sir",  color: 0x4a90d9, hp: 130, speed: 210, power: 17, specialName: "Grammar Storm",    specialDmg: 48, accent: 0x7ec8ff },
  { id: 1, name: "Ramashray Yadav", color: 0x2ecc71, hp: 145, speed: 180, power: 20, specialName: "Infinite Equation", specialDmg: 52, accent: 0x58d68d },
  { id: 2, name: "Priyanshi Pandey", color: 0xe91e63, hp: 115, speed: 250, power: 16, specialName: "Order 999",       specialDmg: 55, accent: 0xff6b9d },
  { id: 3, name: "Wasif Sir",    color: 0xf39c12, hp: 125, speed: 200, power: 19, specialName: "Calculation Blast", specialDmg: 50, accent: 0xf5b041 },
  { id: 4, name: "Afreen Mam",   color: 0x9b59b6, hp: 120, speed: 230, power: 18, specialName: "Quantum Burst",   specialDmg: 54, accent: 0xbb8fce }
];

// ====================== CONFIG ======================
const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#0d0d1a",
  physics: { default: "arcade", arcade: { gravity: { y: 980 }, debug: false } },
  scene: { preload, create, update },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
};

const game = new Phaser.Game(config);

// ====================== STATE ======================
let player, enemy;
let cursors, keys;
let joystick = { active: false, dx: 0, dy: 0 };
let buttons = {};
let playerHPBar, enemyHPBar, playerNameText, enemyNameText;
let comboText, timerText, specialText, roundText, scoreText;
let gameOver = false;
let selectedChar = 0;
let enemyChar = 1;
let groundY;
let specialCooldown = 0;
let enemyAITimer = 0;
let comboCount = 0;
let lastHitTime = 0;
let gameState = "select"; // select | fight | between
let selectUI = [];
let schoolBg;
let floorGlow;

// 3 ROUND SYSTEM
let currentRound = 1;
let playerWins = 0;
let enemyWins = 0;
const MAX_ROUNDS = 3;

// ====================== PRELOAD ======================
function preload() {
  this.load.image("school", "school_bg.png");
}

// ====================== CREATE ======================
function create() {
  if (gameState === "select") {
    showCharacterSelect(this);
  } else {
    startFight(this);
  }
}

// ====================== CHARACTER SELECT ======================
function showCharacterSelect(scene) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  selectUI = [];
  currentRound = 1;
  playerWins = 0;
  enemyWins = 0;

  const bg = scene.add.rectangle(w/2, h/2, w, h, 0x0a0a18).setDepth(0);
  selectUI.push(bg);

  const title = scene.add.text(w/2, 36, "DAWN WASHCO SCHOOL", {
    fontSize: "26px", color: "#ff3333", fontFamily: "Arial", fontStyle: "bold",
    stroke: "#000", strokeThickness: 4
  }).setOrigin(0.5).setDepth(10);
  selectUI.push(title);

  const sub = scene.add.text(w/2, 68, "SELECT YOUR TEACHER  •  BEST OF 3", {
    fontSize: "15px", color: "#ffffff", fontFamily: "Arial"
  }).setOrigin(0.5).setDepth(10);
  selectUI.push(sub);

  const thumb = scene.add.image(w/2, 120, "school").setDisplaySize(Math.min(300, w-40), 90).setOrigin(0.5).setDepth(5).setAlpha(0.85);
  selectUI.push(thumb);

  const cardW = Math.min(140, (w - 30) / 5 - 6);
  const startX = w/2 - (CHARACTERS.length * (cardW + 8)) / 2 + cardW/2;
  const cardY = h * 0.42;

  CHARACTERS.forEach((ch, i) => {
    const x = startX + i * (cardW + 8);
    const card = scene.add.rectangle(x, cardY, cardW, 170, 0x1a1a2e).setStrokeStyle(3, ch.color).setInteractive().setDepth(10);
    scene.add.rectangle(x, cardY - 65, cardW, 26, ch.color).setDepth(11);
    const avatar = scene.add.rectangle(x, cardY - 8, 46, 64, ch.color).setDepth(12);
    scene.add.rectangle(x + 16, cardY - 8, 12, 64, Phaser.Display.Color.ValueToColor(ch.color).darken(35).color).setDepth(11);
    const nameTxt = scene.add.text(x, cardY + 48, ch.name.split(" ")[0], {
      fontSize: "12px", color: "#fff", fontFamily: "Arial", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(13);
    const spTxt = scene.add.text(x, cardY + 66, ch.specialName, {
      fontSize: "9px", color: "#aaaaaa", fontFamily: "Arial"
    }).setOrigin(0.5).setDepth(13);

    card.on("pointerdown", () => {
      selectedChar = i;
      selectUI.forEach(o => {
        if (o.type === "Rectangle" && o.width === cardW) o.setStrokeStyle(3, 0x333355);
      });
      card.setStrokeStyle(4, 0xffff00);
    });
    selectUI.push(card, avatar, nameTxt, spTxt);
  });

  const startBtn = scene.add.rectangle(w/2, h - 65, 220, 48, 0xe74c3c).setInteractive().setDepth(20);
  const startTxt = scene.add.text(w/2, h - 65, "START FIGHT", {
    fontSize: "20px", color: "#fff", fontFamily: "Arial", fontStyle: "bold"
  }).setOrigin(0.5).setDepth(21);

  startBtn.on("pointerdown", () => {
    enemyChar = (selectedChar + 2) % CHARACTERS.length;
    gameState = "fight";
    selectUI.forEach(o => o.destroy());
    startBtn.destroy();
    startTxt.destroy();
    startFight(scene);
  });
  selectUI.push(startBtn, startTxt);

  const hint = scene.add.text(w/2, h - 28, "Tap a card then START FIGHT", {
    fontSize: "12px", color: "#888", fontFamily: "Arial"
  }).setOrigin(0.5).setDepth(10);
  selectUI.push(hint);
}

// ====================== START FIGHT / ROUND ======================
function startFight(scene) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  groundY = h - 90;
  gameOver = false;
  specialCooldown = 0;
  comboCount = 0;
  enemyAITimer = 0;
  buttons = {};
  joystick = { active: false, dx: 0, dy: 0 };

  // school bg
  schoolBg = scene.add.image(w/2, h/2 - 30, "school");
  const scaleX = w / schoolBg.width;
  const scaleY = (h * 0.75) / schoolBg.height;
  schoolBg.setScale(Math.max(scaleX, scaleY)).setAlpha(0.92).setDepth(0);

  scene.add.rectangle(w/2, h - 40, w, 120, 0x0a0a18, 0.55).setDepth(1);
  scene.add.rectangle(w/2, groundY + 50, w + 40, 110, 0x1a1a2e).setDepth(2);
  scene.add.rectangle(w/2, groundY + 6, w + 40, 10, 0x2a2a4a).setDepth(3);
  floorGlow = scene.add.rectangle(w/2, groundY + 2, w, 3, 0x00ffff, 0.3).setDepth(4);

  const ground = scene.add.rectangle(w/2, groundY + 28, w, 50, 0x000000, 0);
  scene.physics.add.existing(ground, true);

  const pData = CHARACTERS[selectedChar];
  const eData = CHARACTERS[enemyChar];

  player = createFighter(scene, 150, groundY - 55, pData, 1);
  enemy = createFighter(scene, w - 150, groundY - 55, eData, -1);

  scene.physics.add.collider(player, ground);
  scene.physics.add.collider(enemy, ground);
  scene.physics.add.collider(player, enemy);

  // HP bars
  scene.add.rectangle(22, 32, 284, 32, 0x111111).setOrigin(0, 0.5).setDepth(50);
  scene.add.rectangle(22, 32, 284, 32, 0x222222).setOrigin(0, 0.5).setStrokeStyle(2, pData.color).setDepth(50);
  playerHPBar = scene.add.rectangle(24, 32, 280, 26, 0x00ff66).setOrigin(0, 0.5).setDepth(51);
  playerNameText = scene.add.text(28, 14, pData.name, { fontSize: "13px", color: "#aaffcc", fontFamily: "Arial", fontStyle: "bold" }).setDepth(52);

  scene.add.rectangle(w - 22, 32, 284, 32, 0x111111).setOrigin(1, 0.5).setDepth(50);
  scene.add.rectangle(w - 22, 32, 284, 32, 0x222222).setOrigin(1, 0.5).setStrokeStyle(2, eData.color).setDepth(50);
  enemyHPBar = scene.add.rectangle(w - 24, 32, 280, 26, 0xff3333).setOrigin(1, 0.5).setDepth(51);
  enemyNameText = scene.add.text(w - 28, 14, eData.name, { fontSize: "13px", color: "#ffaaaa", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(1, 0).setDepth(52);

  // ROUND + SCORE
  roundText = scene.add.text(w/2, 18, "ROUND " + currentRound + " / 3", {
    fontSize: "16px", color: "#ffff88", fontFamily: "Arial", fontStyle: "bold", stroke: "#000", strokeThickness: 3
  }).setOrigin(0.5).setDepth(52);

  scoreText = scene.add.text(w/2, 52, playerWins + "  -  " + enemyWins, {
    fontSize: "22px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold", stroke: "#000", strokeThickness: 3
  }).setOrigin(0.5).setDepth(52);

  timerText = scene.add.text(w/2, 78, "99", {
    fontSize: "28px", color: "#fff", fontFamily: "Arial", fontStyle: "bold", stroke: "#000", strokeThickness: 3
  }).setOrigin(0.5).setDepth(52);

  comboText = scene.add.text(w/2, 108, "", {
    fontSize: "24px", color: "#ffff00", fontFamily: "Arial", fontStyle: "bold", stroke: "#000", strokeThickness: 3
  }).setOrigin(0.5).setAlpha(0).setDepth(52);

  specialText = scene.add.text(28, 58, "SPECIAL READY", { fontSize: "12px", color: "#00ffff", fontStyle: "bold" }).setDepth(52);
  scene.add.text(28, 76, pData.specialName, { fontSize: "11px", color: "#88aaff" }).setDepth(52);

  createJoystick(scene);
  createButtons(scene);

  cursors = scene.input.keyboard.createCursorKeys();
  keys = scene.input.keyboard.addKeys("W,A,S,D,J,K,L,I,U");

  // ROUND START BANNER
  const banner = scene.add.text(w/2, h/2 - 40, "ROUND " + currentRound, {
    fontSize: "56px", color: "#ffff00", fontFamily: "Arial", fontStyle: "bold",
    stroke: "#000", strokeThickness: 6
  }).setOrigin(0.5).setDepth(180).setAlpha(0);

  const fightTxt = scene.add.text(w/2, h/2 + 20, "FIGHT!", {
    fontSize: "42px", color: "#ff3333", fontFamily: "Arial", fontStyle: "bold",
    stroke: "#000", strokeThickness: 5
  }).setOrigin(0.5).setDepth(180).setAlpha(0);

  scene.tweens.add({ targets: banner, alpha: 1, duration: 300, yoyo: true, hold: 600 });
  scene.tweens.add({ targets: fightTxt, alpha: 1, duration: 300, delay: 400, yoyo: true, hold: 500, onComplete: () => {
    banner.destroy();
    fightTxt.destroy();
  }});

  scene.timeLeft = 99;
  scene.time.addEvent({
    delay: 1000,
    callback: () => {
      if (gameOver || gameState !== "fight") return;
      scene.timeLeft--;
      timerText.setText(scene.timeLeft);
      if (scene.timeLeft <= 0) {
        // time over → more HP wins the round
        endRound(scene, player.hp >= enemy.hp ? "player" : "enemy");
      }
    },
    loop: true
  });

  const backBtn = scene.add.text(w - 14, h - 28, "CHANGE CHAR", {
    fontSize: "11px", backgroundColor: "#222", padding: { x: 8, y: 5 }, color: "#ccc"
  }).setOrigin(1).setInteractive().setDepth(150);
  backBtn.on("pointerdown", () => {
    gameState = "select";
    currentRound = 1;
    playerWins = 0;
    enemyWins = 0;
    scene.scene.restart();
  });
}

// ===== CREATE FIGHTER =====
function createFighter(scene, x, y, data, facing) {
  const shadow = scene.add.ellipse(x, y + 48, 55, 14, 0x000000, 0.5).setDepth(5);
  const body = scene.add.rectangle(x, y, 48, 88, data.color).setDepth(10);
  const side = scene.add.rectangle(x + facing * 16, y, 14, 88, Phaser.Display.Color.ValueToColor(data.color).darken(40).color).setDepth(9);
  const head = scene.add.rectangle(x, y - 52, 36, 28, Phaser.Display.Color.ValueToColor(data.color).lighten(25).color).setDepth(11);
  const eyeL = scene.add.rectangle(x - 8, y - 54, 7, 5, 0xffffff, 0.95).setDepth(12);
  const eyeR = scene.add.rectangle(x + 8, y - 54, 7, 5, 0xffffff, 0.95).setDepth(12);

  const fighter = scene.add.rectangle(x, y, 48, 88, 0x000000, 0);
  scene.physics.add.existing(fighter);
  fighter.body.setCollideWorldBounds(true);
  fighter.body.setBounce(0.08);
  fighter.body.setDragX(900);

  fighter.parts = { body, side, head, eyeL, eyeR, shadow };
  fighter.hp = data.hp;
  fighter.maxHp = data.hp;
  fighter.power = data.power;
  fighter.speed = data.speed;
  fighter.facing = facing;
  fighter.isAttacking = false;
  fighter.isBlocking = false;
  fighter.specialReady = true;
  fighter.charData = data;

  fighter.updateParts = function () {
    const px = this.x, py = this.y, f = this.facing;
    this.parts.body.setPosition(px, py);
    this.parts.side.setPosition(px + f * 16, py);
    this.parts.head.setPosition(px, py - 52);
    this.parts.eyeL.setPosition(px - 8, py - 54);
    this.parts.eyeR.setPosition(px + 8, py - 54);
    this.parts.shadow.setPosition(px, py + 48);
  };
  return fighter;
}

// ====================== JOYSTICK ======================
function createJoystick(scene) {
  const base = scene.add.circle(110, scene.scale.height - 130, 72, 0x333355, 0.55).setDepth(100).setScrollFactor(0);
  const thumb = scene.add.circle(110, scene.scale.height - 130, 32, 0x8899ff, 0.85).setDepth(101).setScrollFactor(0);

  scene.input.on("pointerdown", (p) => {
    if (gameState !== "fight" || gameOver) return;
    if (p.x < scene.scale.width / 2 && p.y > scene.scale.height / 2) {
      joystick.active = true;
      joystick.pointerId = p.id;
      base.setPosition(p.x, p.y);
      thumb.setPosition(p.x, p.y);
    }
  });
  scene.input.on("pointermove", (p) => {
    if (!joystick.active || p.id !== joystick.pointerId) return;
    const dx = p.x - base.x, dy = p.y - base.y;
    const dist = Math.sqrt(dx*dx + dy*dy), max = 58;
    if (dist > max) {
      const a = Math.atan2(dy, dx);
      thumb.x = base.x + Math.cos(a) * max;
      thumb.y = base.y + Math.sin(a) * max;
    } else { thumb.x = p.x; thumb.y = p.y; }
    joystick.dx = (thumb.x - base.x) / max;
    joystick.dy = (thumb.y - base.y) / max;
  });
  scene.input.on("pointerup", (p) => {
    if (p.id === joystick.pointerId) {
      joystick.active = false; joystick.dx = 0; joystick.dy = 0;
      thumb.setPosition(base.x, base.y);
    }
  });
}

// ====================== BUTTONS ======================
function createButtons(scene) {
  const h = scene.scale.height, w = scene.scale.width;
  const size = 56, startX = w - 175, startY = h - 200;

  const makeBtn = (x, y, label, color, key) => {
    const bg = scene.add.circle(x, y, size/2, color, 0.8).setInteractive().setDepth(100);
    scene.add.circle(x - 5, y - 5, size/4, 0xffffff, 0.22).setDepth(101);
    scene.add.text(x, y, label, { fontSize: "11px", color: "#fff", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5).setDepth(102);
    bg.on("pointerdown", () => { if (!gameOver) buttons[key] = true; bg.setAlpha(1); });
    bg.on("pointerup", () => { buttons[key] = false; bg.setAlpha(0.8); });
    bg.on("pointerout", () => { buttons[key] = false; bg.setAlpha(0.8); });
  };
  makeBtn(startX + 68, startY + 68, "PUNCH", 0xe74c3c, "punch");
  makeBtn(startX + 136, startY + 18, "KICK", 0x3498db, "kick");
  makeBtn(startX + 136, startY + 118, "BLOCK", 0x7f8c8d, "block");
  makeBtn(startX, startY + 18, "JUMP", 0x2ecc71, "jump");
  makeBtn(startX, startY + 118, "SPECIAL", 0x9b59b6, "special");
}

// ====================== UPDATE ======================
function update(time, delta) {
  if (gameState !== "fight" || gameOver) return;

  let moveX = 0;
  if (joystick.active) moveX = joystick.dx;
  if (cursors.left.isDown || keys.A.isDown) moveX = -1;
  if (cursors.right.isDown || keys.D.isDown) moveX = 1;

  if (moveX !== 0) {
    player.body.setVelocityX(moveX * player.speed);
    player.facing = moveX > 0 ? 1 : -1;
  } else player.body.setVelocityX(0);

  const wantJump = buttons.jump || cursors.up.isDown || keys.W.isDown || keys.I.isDown;
  if (wantJump && player.body.blocked.down) player.body.setVelocityY(-520);

  player.isBlocking = buttons.block || keys.U.isDown;

  if ((buttons.punch || keys.J.isDown) && !player.isAttacking) doAttack(this, player, "punch");
  if ((buttons.kick || keys.K.isDown) && !player.isAttacking) doAttack(this, player, "kick");
  if ((buttons.special || keys.L.isDown) && player.specialReady && !player.isAttacking) doSpecial(this, player);

  if (!player.specialReady) {
    specialCooldown -= delta;
    specialText.setText("SPECIAL " + Math.ceil(specialCooldown/1000) + "s");
    specialText.setColor("#ff6666");
    if (specialCooldown <= 0) {
      player.specialReady = true;
      specialText.setText("SPECIAL READY");
      specialText.setColor("#00ffff");
    }
  }

  enemyAI(this, delta);

  if (player.x < enemy.x) { player.facing = 1; enemy.facing = -1; }
  else { player.facing = -1; enemy.facing = 1; }

  player.updateParts();
  enemy.updateParts();

  playerHPBar.width = Math.max(0, (player.hp / player.maxHp) * 280);
  enemyHPBar.width = Math.max(0, (enemy.hp / enemy.maxHp) * 280);

  if (time - lastHitTime > 1500) { comboCount = 0; comboText.setAlpha(0); }
  if (floorGlow) floorGlow.alpha = 0.2 + Math.sin(time * 0.003) * 0.1;
}

// ====================== ATTACK ======================
function doAttack(scene, attacker, type) {
  attacker.isAttacking = true;
  const range = type === "kick" ? 90 : 68;
  const dmg = type === "kick" ? attacker.power * 1.35 : attacker.power;
  const target = attacker === player ? enemy : player;

  const fx = scene.add.rectangle(attacker.x + attacker.facing * 48, attacker.y - 8, type === "kick" ? 55 : 38, 28, 0xffffff, 0.85).setDepth(20);
  scene.tweens.add({ targets: fx, alpha: 0, scaleX: 1.4, duration: 140, onComplete: () => fx.destroy() });

  if (Math.abs(attacker.x - target.x) < range + 28 && Math.abs(attacker.y - target.y) < 75) {
    if (target.isBlocking) {
      scene.cameras.main.shake(35, 0.003);
      const spark = scene.add.circle(target.x - target.facing * 30, target.y - 10, 18, 0xaaaaaa, 0.7).setDepth(25);
      scene.tweens.add({ targets: spark, alpha: 0, scale: 2, duration: 180, onComplete: () => spark.destroy() });
    } else {
      target.hp -= dmg;
      target.body.setVelocityX(attacker.facing * 300);
      target.body.setVelocityY(-140);
      scene.cameras.main.shake(55, 0.007);
      spawnHitParticles(scene, target.x, target.y, attacker.charData.color, 6);

      if (attacker === player) {
        comboCount++;
        lastHitTime = scene.time.now;
        comboText.setText(comboCount + " HIT COMBO!");
        comboText.setAlpha(1);
        scene.tweens.add({ targets: comboText, alpha: 0.25, duration: 450 });
      }
      if (target.hp <= 0) {
        target.hp = 0;
        endRound(scene, attacker === player ? "player" : "enemy");
      }
    }
  }
  scene.time.delayedCall(260, () => { attacker.isAttacking = false; });
}

// ====================== SPECIAL ======================
function doSpecial(scene, attacker) {
  attacker.isAttacking = true;
  attacker.specialReady = false;
  specialCooldown = 8000;

  const target = attacker === player ? enemy : player;
  const dmg = attacker.charData.specialDmg;
  const name = attacker.charData.specialName;
  const col = attacker.charData.color;

  const namePop = scene.add.text(attacker.x, attacker.y - 100, name, {
    fontSize: "18px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold",
    stroke: "#000", strokeThickness: 4
  }).setOrigin(0.5).setDepth(40);
  scene.tweens.add({ targets: namePop, y: namePop.y - 40, alpha: 0, duration: 900, onComplete: () => namePop.destroy() });

  if (name === "Grammar Storm") {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    for (let i = 0; i < 18; i++) {
      const L = scene.add.text(attacker.x + Phaser.Math.Between(-30, 30), attacker.y + Phaser.Math.Between(-40, 20),
        letters[Phaser.Math.Between(0, 25)], { fontSize: Phaser.Math.Between(18, 32) + "px", color: "#7ec8ff", fontStyle: "bold" }).setDepth(30);
      scene.tweens.add({ targets: L, x: L.x + attacker.facing * Phaser.Math.Between(80, 220), y: L.y + Phaser.Math.Between(-120, 40), alpha: 0, scale: 0.3, duration: 600 + Phaser.Math.Between(0, 300), onComplete: () => L.destroy() });
    }
  } else if (name === "Infinite Equation") {
    const syms = ["∞", "∑", "π", "√", "∫", "x²", "Δ", "±", "≠", "≈"];
    for (let i = 0; i < 16; i++) {
      const s = scene.add.text(attacker.x + Phaser.Math.Between(-20, 20), attacker.y + Phaser.Math.Between(-30, 10),
        syms[Phaser.Math.Between(0, 9)], { fontSize: Phaser.Math.Between(20, 36) + "px", color: "#58d68d", fontStyle: "bold" }).setDepth(30);
      scene.tweens.add({ targets: s, x: s.x + attacker.facing * Phaser.Math.Between(60, 200), y: s.y + Phaser.Math.Between(-100, 50), alpha: 0, scale: 1.5, duration: 700, onComplete: () => s.destroy() });
    }
  } else if (name === "Order 999") {
    const num = scene.add.text(attacker.x + attacker.facing * 40, attacker.y - 20, "999", {
      fontSize: "64px", color: "#ff6b9d", fontStyle: "bold", stroke: "#000", strokeThickness: 6
    }).setOrigin(0.5).setDepth(35);
    scene.tweens.add({ targets: num, scale: 2.2, alpha: 0, duration: 500, onComplete: () => num.destroy() });
    for (let r = 0; r < 3; r++) {
      const ring = scene.add.circle(attacker.x + attacker.facing * 50, attacker.y, 30 + r * 15, 0xe91e63, 0.4).setDepth(28);
      scene.tweens.add({ targets: ring, scale: 3 + r, alpha: 0, duration: 400 + r * 80, onComplete: () => ring.destroy() });
    }
  } else if (name === "Calculation Blast") {
    const formulas = ["2+2=4", "x=y", "a²+b²", "Σn", "log", "sinθ"];
    for (let i = 0; i < 12; i++) {
      const f = scene.add.text(attacker.x, attacker.y, formulas[Phaser.Math.Between(0, 5)], { fontSize: "16px", color: "#f5b041", fontStyle: "bold" }).setDepth(30);
      const ang = (i / 12) * Math.PI * 2;
      scene.tweens.add({ targets: f, x: f.x + Math.cos(ang) * 160, y: f.y + Math.sin(ang) * 120, alpha: 0, duration: 550, onComplete: () => f.destroy() });
    }
    const blast = scene.add.circle(attacker.x + attacker.facing * 40, attacker.y, 40, 0xf39c12, 0.7).setDepth(27);
    scene.tweens.add({ targets: blast, scale: 3.5, alpha: 0, duration: 400, onComplete: () => blast.destroy() });
  } else if (name === "Quantum Burst") {
    for (let i = 0; i < 8; i++) {
      const orb = scene.add.circle(attacker.x + Phaser.Math.Between(-40, 40), attacker.y + Phaser.Math.Between(-50, 30), Phaser.Math.Between(8, 18), 0xbb8fce, 0.85).setDepth(30);
      scene.tweens.add({ targets: orb, x: orb.x + attacker.facing * Phaser.Math.Between(100, 220), y: orb.y + Phaser.Math.Between(-80, 60), scale: 0.2, alpha: 0, duration: 650, onComplete: () => orb.destroy() });
    }
    const core = scene.add.circle(attacker.x + attacker.facing * 50, attacker.y, 25, 0x9b59b6, 0.9).setDepth(29);
    scene.tweens.add({ targets: core, scale: 4, alpha: 0, duration: 450, onComplete: () => core.destroy() });
  }

  if (Math.abs(attacker.x - target.x) < 160) {
    target.hp -= dmg;
    target.body.setVelocityX(attacker.facing * 480);
    target.body.setVelocityY(-260);
    scene.cameras.main.shake(140, 0.018);
    spawnHitParticles(scene, target.x, target.y, col, 14);
    if (target.hp <= 0) {
      target.hp = 0;
      endRound(scene, attacker === player ? "player" : "enemy");
    }
  }
  scene.time.delayedCall(420, () => { attacker.isAttacking = false; });
}

function spawnHitParticles(scene, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const p = scene.add.circle(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-30, 20), Phaser.Math.Between(3, 8), color, 0.9).setDepth(30);
    scene.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-60, 60), y: p.y + Phaser.Math.Between(-70, 20), alpha: 0, duration: 350, onComplete: () => p.destroy() });
  }
}

// ====================== ENEMY AI ======================
function enemyAI(scene, delta) {
  enemyAITimer -= delta;
  if (enemyAITimer > 0) return;
  enemyAITimer = Phaser.Math.Between(360, 820);

  const dist = enemy.x - player.x;
  const absDist = Math.abs(dist);

  if (absDist > 150) {
    enemy.body.setVelocityX(dist > 0 ? -enemy.speed * 0.7 : enemy.speed * 0.7);
  } else if (absDist < 45) {
    enemy.body.setVelocityX(dist > 0 ? enemy.speed * 0.5 : -enemy.speed * 0.5);
  } else {
    enemy.body.setVelocityX(0);
    if (Phaser.Math.Between(0, 10) > 3) {
      if (enemy.specialReady && Phaser.Math.Between(0, 10) > 7) doSpecial(scene, enemy);
      else doAttack(scene, enemy, Phaser.Math.Between(0, 1) ? "punch" : "kick");
    }
  }
  if (player.isAttacking && absDist < 95 && Phaser.Math.Between(0, 10) > 5) {
    enemy.isBlocking = true;
    scene.time.delayedCall(280, () => { enemy.isBlocking = false; });
  }
}

// ====================== END ROUND (3 ROUND SYSTEM) ======================
function endRound(scene, winner) {
  if (gameOver) return;
  gameOver = true;

  const w = scene.scale.width;
  const h = scene.scale.height;

  if (winner === "player") playerWins++;
  else enemyWins++;

  // update score display if still exists
  if (scoreText) scoreText.setText(playerWins + "  -  " + enemyWins);

  const overlay = scene.add.rectangle(w/2, h/2, w, h, 0x000000, 0.7).setDepth(200);

  // ROUND RESULT
  const roundMsg = winner === "player" ? "YOU WIN ROUND " + currentRound : "ENEMY WINS ROUND " + currentRound;
  const roundColor = winner === "player" ? "#00ff88" : "#ff4466";

  const resultTxt = scene.add.text(w/2, h/2 - 70, roundMsg, {
    fontSize: "32px", color: roundColor, fontFamily: "Arial", fontStyle: "bold",
    stroke: "#000", strokeThickness: 5
  }).setOrigin(0.5).setDepth(201);

  const scoreShow = scene.add.text(w/2, h/2 - 20, playerWins + "  -  " + enemyWins, {
    fontSize: "40px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold",
    stroke: "#000", strokeThickness: 4
  }).setOrigin(0.5).setDepth(201);

  // check match over
  const matchOver = playerWins >= 2 || enemyWins >= 2 || currentRound >= MAX_ROUNDS;

  if (matchOver) {
    const finalMsg = playerWins > enemyWins ? "YOU WIN THE MATCH!" : "YOU LOSE THE MATCH";
    const finalColor = playerWins > enemyWins ? "#00ff88" : "#ff4466";

    scene.add.text(w/2, h/2 + 40, finalMsg, {
      fontSize: "36px", color: finalColor, fontFamily: "Arial", fontStyle: "bold",
      stroke: "#000", strokeThickness: 5
    }).setOrigin(0.5).setDepth(201);

    scene.add.text(w/2, h/2 + 95, "TAP TO CHARACTER SELECT", {
      fontSize: "18px", color: "#eeeeee"
    }).setOrigin(0.5).setDepth(201);

    scene.input.once("pointerdown", () => {
      gameState = "select";
      currentRound = 1;
      playerWins = 0;
      enemyWins = 0;
      scene.scene.restart();
    });
  } else {
    // next round
    currentRound++;
    scene.add.text(w/2, h/2 + 45, "NEXT ROUND STARTING...", {
      fontSize: "20px", color: "#ffff88"
    }).setOrigin(0.5).setDepth(201);

    scene.add.text(w/2, h/2 + 85, "TAP TO CONTINUE", {
      fontSize: "16px", color: "#cccccc"
    }).setOrigin(0.5).setDepth(201);

    scene.input.once("pointerdown", () => {
      gameState = "fight";
      scene.scene.restart();
    });
  }
}
