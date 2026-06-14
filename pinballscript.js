//===state-variable===>
let ballDamage = 1, ballHp = 100, ballMaxHp = 100, score = 0, best = localStorage.getItem('best') ? parseInt(localStorage.getItem('best')) : 0;
let atkCooldown = 0;
let resetting = false, gameOver = false, waiting = true;
let explosions = [];
let gutterCooldown = 0;
let lastBallX = 210, lastBallY = 540;
let launchedL = false, launchedR = false;
let idleTimer = 0;
let aimPhase = 0;
const launchSpeed = 12;
const launchAimSpread = 0.75;
//===dodge===>
    let iFrames =0;
    let slowMoTimer = 0;
    let perfectDodgeTextTimer = 0;
    let perfectDodgeAttackReady = false;
//===projectiles===>
    let projectiles = [];
//===flippers===>
    let prevLAngle = 0.4;
    let prevRAngle = Math.PI - 0.4;
    let lAngle = 0.4, rAngle = Math.PI - 0.4;
//===laser===>
    let laserActive = false;
    let laserDamage = 3;
    let laserTimer = 0;
    let laserX = 0, laserY = 0;
    let laserTargetX = 0, laserTargetY = 0;
    let laserOwner = null;
//===ball-slashes===>
    let slashCooldown = 0;
    let slashes = [];
    let slashQueue = [];
    let slashQueueTimer = 0;

//===canva===>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 420, H = 640;
    canvas.focus();
    canvas.addEventListener('click', () => canvas.focus())

//===ball===>
const ball = { x: 210, y: 540, vx: 0, vy: 0, r: 14 };

//===enemies===>
const enemies = [
    { x: 150, y: 185, r: 24, char: 'C', hit: 0, hp: 10, maxHp: 10, cooldown: 0, shootTimer: 0, shootCount: 0 },
];

//===boosters===>
const boost = [
    { x: 140, y: 280, w: 34, h: 20, char: 'T', hit: false, timer: 0 },
    { x: 245, y: 280,  w: 34, h: 20, char: 'A', hit: false, timer: 0 },
];

//===keys===>
const keys = {};
    document.addEventListener('keydown', e => {
        keys[e.key] = true;
    if (e.key === ' ') { e.preventDefault(); launch(); }
    if (e.key === 'r' || e.key === 'R') { restartGame(); }
    if (e.key === 'w' || e.key === 'W') { atkNear(); }
    if (e.key === 'Shift') {e.preventDefault(); dodge(); }
    if (e.key === 'q' || e.key === 'Q') {e.preventDefault(); slashAtk(); }
});

    document.addEventListener('keyup', e => { keys[e.key] = false; });

//===UI===>
function updateUI() {
    document.getElementById('scoreEl').textContent = score;
    document.getElementById('bestEl').textContent = best;
    document.getElementById('hpText').textContent = ballHp + '/' + ballMaxHp;
    document.getElementById('hpFill').style.width = Math.max(0, (ballHp / ballMaxHp) * 100) + '%';
}

//===score===>
function addScore(n) {
        score += n;
    if (score > best) {
        best = score;
            localStorage.setItem('best', best);
        }
        updateUI();
}

//===ball-line===>
function closestPoint(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy) / (dx*dx + dy*dy)));
        return { x: ax + t*dx, y: ay + t*dy };
}

//===collision===>
function ptDist(ax, ay, bx, by) {
        return Math.sqrt((ax-bx)**2 + (ay-by)**2);
}

function isLaserDangerous() {
    return laserActive && laserOwner !== null && laserTimer > 45;
}

//===characters===>
function drawChar(char, x, y, size) {
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, x, y);
}

//===bounce===>
function wallBounce() {
    if (ball.x < 14 + ball.r) { ball.vx = Math.abs(ball.vx) * 0.85; ball.x = 14 + ball.r; }
    if (ball.x > W-14-ball.r) { ball.vx = -Math.abs(ball.vx) * 0.85; ball.x = W-14-ball.r; }
    if (ball.y < 14 + ball.r) { ball.vy = Math.abs(ball.vy) * 0.7;   ball.y = 14 + ball.r; }
}

//===grid===>
function drawGrid() {
    ctx.fillStyle = 'rgba(100,90,200,0.07)';
    for (let gx = 28; gx < W; gx += 24)
        for (let gy = 28; gy < H; gy += 24) {
            ctx.beginPath();
            ctx.arc(gx, gy, 1.5, 0, Math.PI*2);
            ctx.fill();
        }
}

function getLaunchAngle() {
    return -Math.PI / 2 + Math.sin(aimPhase) * launchAimSpread;
}

//===start/gameover===>
function launch() {
    if (gameOver) { restartGame(); return; }
    if (waiting) {
        const angle = getLaunchAngle();
        waiting = false;
        ball.vx = Math.cos(angle) * launchSpeed;
        ball.vy = Math.sin(angle) * launchSpeed;
    }
}

//===reset===>
function restartGame() {
    ballHp = ballMaxHp; score = 0; gameOver = false; laserDamage = 3;
        laserActive = false; laserOwner = null;
        boost.forEach(t => { t.hit = false; t.timer = 0; });
        enemies.forEach(b => { b.hit = 0; b.hp = b.maxHp; b.shootTimer = 0; b.shootCount = 0; });
        resetBall();
    updateUI();
}

//===ball-reset===>
function resetBall() {
    ball.x = 210; ball.y = 540;
    ball.vx = 0;  ball.vy = 0;
        lastBallX = 210; lastBallY = 540;
        aimPhase = 0;
        resetting = false;
        waiting = true;
        perfectDodgeAttackReady = false;
        iFrames = 180;
}

//===flipper-collision===>
function flipperCollide(cx, cy, angle, isLeft) {
    const ex = cx + Math.cos(angle) * 70;
    const ey = cy + Math.sin(angle) * 70;

//===flipper-tip-collision===>
    const cp = closestPoint(ball.x, ball.y, cx, cy, ex, ey);
    const d  = ptDist(ball.x, ball.y, cp.x, cp.y);

    if (d > ball.r) return;

    const flipping = isLeft ? keys['a'] : keys['d'];

//===flipper-push===>
    ball.y = cp.y - ball.r;

//===flipper-tip-push===>
    const tipDist = ptDist(cp.x, cp.y, ex, ey);
        if (tipDist < 12) {
        ball.x += isLeft ? 5 : -5;
}

//===flip-launch-bounce===>
    if (flipping) {
        ball.vy = -12;
        ball.vx = isLeft ? -6 : 6;
        gutterCooldown = 25;
        idleTimer = 0;
    } else {
    ball.vy = -ball.vy * 0.3;
    ball.vx *= 0.97;
    ball.vx += isLeft ? 0.4 : -0.4;
}
}

//===attack===>
function atkNear() {
    if (waiting || gameOver) return;
    if (atkCooldown > 0) return;

//===enemy-detect===>
    let closest = null, closesDist = Infinity;
    enemies.forEach(b => {
        const d = ptDist(ball.x, ball.y, b.x, b.y);
    if (d < closesDist) { closesDist = d; closest = b; }
});
    if (!closest) return;

//===attack-toward===>
    const dx = closest.x - ball.x;
    const dy = closest.y - ball.y;
    const d = Math.sqrt(dx*dx + dy*dy);
        ball.vx = (dx / d) * 10;
        ball.vy = (dy / d) * 10;
    idleTimer = 0;
    atkCooldown = 300;

}

//===dodge===>
let dodgeCooldown = 500;

function dodge() {
    if (waiting || gameOver) return;
    if (dodgeCooldown > 0) return;

    // find nearest projectile
    let nearest = null, nearestDist = Infinity;
    projectiles.forEach(p => {
        const d = ptDist(ball.x, ball.y, p.x, p.y);
        if (d < nearestDist) { nearestDist = d; nearest = p; }
    });

    const laserDist = isLaserDangerous() ? ptDist(laserTargetX, laserTargetY, ball.x, ball.y) : Infinity;
    const perfectDodge = nearestDist < ball.r + 35 || laserDist < ball.r + 35;

    ball.vx *= -0.4;
    ball.vy *= -0.4;

    if (nearest) {
        // check if projectile is below the ball
        if (nearest.y > ball.y) {
            // dodge sideways based on ball's horizontal direction
            ball.vx += ball.vx >= 0 ? 2 : -2;
        } else {
            // projectile is above or beside — dodge up
            ball.vy -= 4;
        }
    } else {
        
        ball.vy -= 4;
    }

    dodgeCooldown = 420;
    iFrames = perfectDodge ? 90 : 65;

    if (perfectDodge) {
        slowMoTimer = 120;
        perfectDodgeTextTimer = 70;
        perfectDodgeAttackReady = true;
    }
}

//===slash-atk===>
function slashAtk() {
    if (waiting || gameOver) return;
    if (slashCooldown > 0) return;

    let closest = null, closesDist = Infinity;
    enemies.forEach(b => {
        const d = ptDist(ball.x, ball.y, b.x, b.y);
        if (d < closesDist) { closesDist = d; closest = b; }

        });
        if (!closest) return;

        const dx = closest.x - ball.x;
        const dy = closest.y - ball.y;
        const angle = Math.atan2(dy, dx);

        slashQueue = [
            { angle: angle - 0.3, delay: 0  },
            { angle: angle,       delay: 10 },
            { angle: angle + 0.3, delay: 20 },
        ];
        slashCooldown = 240;
        slashQueueTimer = 0
}

//===update===>
function update() {
    if (gameOver || waiting) return;
    if (atkCooldown > 0 ) atkCooldown--;
    if (dodgeCooldown > 0) dodgeCooldown--;
    if (iFrames > 0) iFrames--;
    if (slowMoTimer > 0) slowMoTimer--;
    if (perfectDodgeTextTimer > 0) perfectDodgeTextTimer--;
    if (slashCooldown > 0) slashCooldown--;
    if (slashQueue.length > 0) {
        slashQueueTimer++;
        if (slashQueueTimer >= slashQueue[0].delay) {
            const s = slashQueue.shift();
            slashes.push({
                x: ball.x, y: ball.y,
                vx: Math.cos(s.angle) * 8,
                vy: Math.sin(s.angle) * 8,
                life:40,
                hit: false,
                angle: s.angle
            });
        }
    }

    const worldSpeed = slowMoTimer > 0 ? 0.35 : 1;

//===last-position===>
    lastBallX = ball.x;
    lastBallY = ball.y;

//===physics===>
    ball.vy += 0.030;
    ball.x  += ball.vx;
    ball.y  += ball.vy;

//===ball-drag===>
    ball.vx *= 0.992;
    if (ball.y < 400) ball.vy *= 0.995;

    prevLAngle = lAngle;
    prevRAngle = rAngle;
    const targetL = keys['a'] ? -0.45 : 0.4;
    const targetR = keys['d'] ? Math.PI + 0.45 : Math.PI - 0.4;
    lAngle += (targetL - lAngle) * 0.4;
    rAngle += (targetR - rAngle) * 0.4;

    wallBounce();

    // lost ball
        if (ball.y > H - 10 && !resetting) {
        resetting = true;
        ballHp = Math.max(0, ballHp - 1);
        if (score > best) {
            best = score;
            localStorage.setItem('best', best);
        }
        updateUI();

        if (ballHp <= 0) { gameOver = true; return; }
        setTimeout(resetBall, 600);
    }

    // flippers
    flipperCollide(84,  565, lAngle, true);
    flipperCollide(335, 565, rAngle, false);

    // gutters — zone based, follows diagonal line exactly
    if (gutterCooldown > 0) {
        gutterCooldown--;
    } else if (ball.y > 525 && ball.y < 570) {
        const t = (ball.y - 525) / 40;
        const leftX  = 15  + t * (84  - 15);
        const rightX = 405 - t * (405 - 335);
        if (ball.x < leftX  + ball.r + 10) {
            ball.x  = leftX  + ball.r + 10;
            ball.vx = 2;
            ball.vy = Math.min(ball.vy, 1.5);
        }
        if (ball.x > rightX - ball.r - 10) {
            ball.x  = rightX - ball.r - 10;
            ball.vx = -2;
            ball.vy = Math.min(ball.vy, 1.5);
        }
    }
// left flipper inner edge
        if (ball.x > 92 && ball.x < 122 && ball.y > 570 && ball.y < 600) {
            ball.vx = Math.abs(ball.vx) * 0.8;
            ball.x = 122;
    }

// right flipper inner edge  
        if (ball.x > 298 && ball.x < 328 && ball.y > 570 && ball.y < 600) {
            ball.vx = -Math.abs(ball.vx) * 0.8;
            ball.x = 298;
}

//===ball-drag===>
    idleTimer++;
        const idleDrag = Math.min(idleTimer / 600, 0.015);
            ball.vx *= (1 - idleDrag);
            ball.vy *= (1 - idleDrag);

//===ball-physics-drag===>
        if (Math.abs(ball.vx) < 0.5 && Math.abs(ball.vx) > 0) {
            ball.vx += ball.vx > 0 ? 0.02: -0.02;
        }

//===enemies===>
    enemies.forEach(b => {
        if (!(laserActive && laserOwner === b)) {
            b.shootTimer += worldSpeed;
            if (b.shootTimer > 180) {
                b.shootTimer = 0;
                b.shootCount++;

                const dx = ball.x - b.x;
                const dy = ball.y - b.y;
                const d = Math.sqrt(dx*dx + dy*dy);

                if (b.shootCount % 5 === 0) {
                    laserActive = true;
                    laserTimer = 360;
                    laserX = b.x;
                    laserY = b.y;
                    laserTargetX = ball.x;
                    laserTargetY = ball.y;
                    laserOwner = b;
                } else if (d > 0) {
                    projectiles.push({
                        x: b.x,
                        y: b.y,
                        vx: (dx / d) * 2.4,
                        vy: (dy / d) * 2.4,
                        r: 5
                    });
                }
            }
        }

        if (b.cooldown > 0) { b.cooldown--; if (b.hit > 0) b.hit--; return; }
        if (b.hit > 0) b.hit--;

        const ex = ball.x - b.x, ey = ball.y - b.y;
        const ed = Math.sqrt(ex*ex + ey*ey);
        if (ed < ball.r + b.r) {
            const nx = ex/ed, ny = ey/ed;
            const spd = Math.max(Math.sqrt(ball.vx**2 + ball.vy**2), 3);
            ball.vx = nx * spd; ball.vy = ny * spd;
            ball.x  = b.x + nx * (ball.r + b.r + 1);
            ball.y  = b.y + ny * (ball.r + b.r + 1);
            b.hit = 8; b.cooldown = 20;
            const damage = perfectDodgeAttackReady ? 3 : ballDamage;
            if (b.hp !== undefined) b.hp -= damage;
            if (perfectDodgeAttackReady) {
                perfectDodgeAttackReady = false;
                dodgeCooldown = 0;
            }
            if (b.hp <= 0) {
                explosions.push({ x: b.x, y: b.y, r: 10, alpha: 1.0 });
                if (laserOwner === b) {
                    laserActive = false;
                    laserOwner = null;
                    laserTimer = 0;
                }
                Object.assign(b, {
                    x:    35  + Math.random() * 350,
                    y:    70  + Math.random() * 300,
                    hp:   b.maxHp,
                    char: ['⭐','💥','🌟','✨','💎','🔥','💫','⚡'][Math.floor(Math.random()*8)]
                });
            }
            if (b.hp === b.maxHp) {
                b.shootTimer = 0;
                b.shootCount = 0;
            }
            addScore(100);
        }
    });

//===laser===>
    if (laserActive) {
        laserTimer -= worldSpeed;
        if (laserTimer <= 0) {
            if (laserOwner !== null) laserOwner.shootTimer = 0;
            laserActive = false;
            laserOwner = null;
        }

            const laserSlow = slowMoTimer > 0 ? 0.15 : 1;
            laserTargetX += (ball.x - laserTargetX) * 0.06 * worldSpeed * laserSlow;
            laserTargetY += (ball.y - laserTargetY) * 0.06 * worldSpeed * laserSlow;

        if (isLaserDangerous() && iFrames <= 0 && ptDist(laserTargetX, laserTargetY, ball.x, ball.y) < ball.r + 12) {

//===dmg-per-frame===>
            if (Math.random() < 0.04) {
                ballHp = Math.max(0, ballHp - Math.floor(laserDamage));
                laserDamage += 0.2;
                updateUI();
                if (ballHp <= 0) gameOver = true;

            }
        }
    }

//===explosions===>
    explosions.forEach(e => { e.r += 3 * worldSpeed; e.alpha -= 0.06 * worldSpeed; });
    explosions = explosions.filter(e => e.alpha > 0);

//===boost===>
    boost.forEach(t => {
        if (t.timer > 0) { t.timer--; if (t.timer === 0) t.hit = false; return; }
        if (!t.hit &&
            ball.x + ball.r > t.x && ball.x - ball.r < t.x + t.w &&
            ball.y + ball.r > t.y && ball.y - ball.r < t.y + t.h) {
    const hitCenter = t.x + t.w / 2;
        ball.vy = -Math.abs(ball.vy) - 4;
        ball.vx = ball.vx >= 0 ? 4 : -4;
            t.hit = true; t.timer = 500;
            addScore(250);
        }
    });

//===projectiles===>
    projectiles.forEach(p => {
        p.x += p.vx * worldSpeed;
        p.y += p.vy * worldSpeed;
    });

    projectiles = projectiles.filter(p => {
        const hit = ptDist(p.x, p.y, ball.x, ball.y) < ball.r + p.r;
        if (hit && iFrames <= 0) {
            ballHp = Math.max(0, ballHp - (p.isLaser ? 3 : 1));
            updateUI()
            if (ballHp <= 0) gameOver = true;
            return false;
        }
        return p.y < H && p.y > 0 && p.x > 0 && p.x < W && !hit;
    });

    slashes.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        s.life--;

        if (!s.hit) {
            enemies.forEach(b => {
                const d = ptDist(s.x, s.y, b.x, b.y);
                if (d < b.r + 10) {
                    s.hit =true;
                    b.hp -= 2;
                    b.hit = 8;
                    explosions.push({ x: s.x, y: s.y, r: 6, alpha: 1.0 });
                    if (b.hp <= 0) {
                        explosions.push({ x: b.x, y: b.y, r: 10, alpha: 1.0});
                        Object.assign(b, {
                            x: 35 + Math.random() * 350,
                            y: 70 + Math.random() * 300,
                            hp: b.maxHp,
                            char: ['⭐','💥','🌟','✨','💎','🔥','💫','⚡'][Math.floor(Math.random()*8)]
                        });
                    }
                    addScore(50);
                }
            });
        }
    });
    slashes = slashes.filter(s => s.life > 0 && !s.hit);
}

// --- draw ---
function drawFlipper(cx, cy, angle) {
    const ex = cx + Math.cos(angle) * 70;
    const ey = cy + Math.sin(angle) * 70;
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth   = 12;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
}

function draw() {
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, W, H);
    drawGrid();

    if (slowMoTimer > 0) {
        ctx.fillStyle = 'rgba(80, 190, 255, 0.08)';
        ctx.fillRect(0, 0, W, H);
    }

    // border
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth   = 15;
    ctx.strokeRect(14, 14, W-28, H-28);

    // gutters
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth   = 14;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(15, 525); ctx.lineTo(84, 565);
    ctx.moveTo(405, 525); ctx.lineTo(335, 565);
    ctx.stroke();

    // targets
    boost.forEach(t => {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(t.x, t.y, t.w, t.h, 5);
        ctx.fillStyle   = t.hit ? '#0a3028' : '#422222';
        ctx.strokeStyle = t.hit ? '#1D9E75' : '#cc5533';
        ctx.lineWidth   = 3.5;
        ctx.fill(); ctx.stroke();
        ctx.restore();
        drawChar(t.char, t.x + t.w/2, t.y + t.h/2, 13);
    });

    // bumpers
    enemies.forEach(b => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
        ctx.fillStyle   = b.hit > 0 ? '#f5f5f5' : '#4e4e4e';
        ctx.strokeStyle = b.hit > 0 ? '#505050' : '#f5f5f5';
        ctx.lineWidth   = 2.5;
        ctx.fill(); ctx.stroke();
        if (b.hit > 0) {
            ctx.shadowColor = '#686868';
            ctx.shadowBlur  = 14;
            ctx.stroke();
            ctx.shadowBlur  = 0;
        }
        ctx.restore();
        drawChar(b.char, b.x, b.y, b.r * 1.1);
        if (b.hp !== undefined) {
            const hpBarW = 44;
            const hpBarH = 5;
            const hpBarX = b.x - hpBarW / 2;
            const hpBarY = b.y + b.r + 9;
            const hpPercent = Math.max(0, b.hp / b.maxHp);

            ctx.fillStyle = '#211';
            ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
            ctx.fillStyle = hpPercent > 0.4 ? '#44ff88' : '#ff4444';
            ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPercent, hpBarH);
            ctx.strokeStyle = '#f5f5f5';
            ctx.lineWidth = 1;
            ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
        }
    });

    // explosions
    explosions.forEach(e => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(200,180,255,${e.alpha})`;
        ctx.lineWidth   = 3;
        ctx.stroke();
        ctx.restore();
    });

//===projectiles===>
    projectiles.forEach(p => {
    ctx.save();
    if (p.isLaser) {
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 10;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 15;
    } else {
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 4;
    }
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 6, p.y - p.vy * 6);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
});

//===ball-atk===>
    const fill = atkCooldown > 0 ? (atkCooldown / 300) * 100 : 100;
        document.getElementById('atkFill').style.height = fill + '%';
        document.getElementById('atkFill').style.background = atkCooldown > 0 ? '#ff4444' : '#44ff88';
        document.getElementById('atkLabel').textContent = atkCooldown > 0 ? Math.ceil(atkCooldown/60) + 's' : 'ATK';

//===dodge===>
    const dodgeFill = dodgeCooldown > 0 ? (dodgeCooldown / 500) * 100 : 100;
        document.getElementById('dodgeFill').style.height = dodgeFill + '%';
        document.getElementById('dodgeFill').style.background = dodgeCooldown > 0 ? '#4444ff' : '#44ccff';
        document.getElementById('dodgeLabel').textContent = dodgeCooldown > 0 ? Math.ceil(dodgeCooldown/60) + 's' : 'DGE';

//===laser===>
    if (laserActive) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 136, 0, ${laserTimer / 360})`;
        ctx.lineWidth = 13;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 20;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(laserX, laserY);
        ctx.lineTo(laserTargetX, laserTargetY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    
    // laser tip circle
        ctx.beginPath();
        ctx.arc(laserTargetX, laserTargetY, 15, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255, 80, 0, ${laserTimer / 360})`;
        ctx.fill();
        ctx.restore();
}

    // flippers
    drawFlipper(84,  565, lAngle);
    drawFlipper(335, 565, rAngle);


//===slashes===> 
    slashes.forEach(s => {
    ctx.save();
    ctx.strokeStyle = `rgba(180, 220, 255, ${s.life / 40})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#44ccff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 14, s.angle - Math.PI/2, s.angle + Math.PI/2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
});

    // ball
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
    ctx.fillStyle   = iFrames > 0 ? '#8ecfff' : '#6d6d6d';
    ctx.strokeStyle = iFrames > 0 ? '#d9f4ff' : '#f5f5f5';
    ctx.lineWidth   = 2;
    ctx.fill(); ctx.stroke();
    ctx.restore();
    drawChar('A', ball.x, ball.y, ball.r * 1.7);

    if (perfectDodgeTextTimer > 0) {
        const textAlpha = Math.min(1, perfectDodgeTextTimer / 30);
        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.fillStyle = '#d9f4ff';
        ctx.font = '700 13px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PERFECT DODGE', ball.x, ball.y - 34);
        ctx.restore();
    }

    // waiting
    if (waiting && !gameOver) {
        aimPhase += 0.025;
        const angle = getLaunchAngle();
        const arrowLen = 76;
        const arrowStartX = ball.x;
        const arrowStartY = ball.y - ball.r - 8;
        const arrowEndX = arrowStartX + Math.cos(angle) * arrowLen;
        const arrowEndY = arrowStartY + Math.sin(angle) * arrowLen;
        const headSize = 10;

        ctx.save();
        ctx.strokeStyle = '#44ccff';
        ctx.fillStyle = '#44ccff';
        ctx.shadowColor = '#44ccff';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(arrowStartX, arrowStartY);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(arrowEndX, arrowEndY);
        ctx.lineTo(
            arrowEndX - Math.cos(angle - 0.45) * headSize,
            arrowEndY - Math.sin(angle - 0.45) * headSize
        );
        ctx.lineTo(
            arrowEndX - Math.cos(angle + 0.45) * headSize,
            arrowEndY - Math.sin(angle + 0.45) * headSize
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle    = 'rgba(243, 243, 243, 0.85)';
        ctx.font         = '500 14px system-ui';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('press SPACE to launch', W/2, H - 160);
    }

    // game over
    if (gameOver) {
        ctx.fillStyle = 'rgba(8,6,24,0.88)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f5f5f5'; ctx.font = '700 28px system-ui';
        ctx.fillText('GAME OVER', W/2, H/2 - 40);
        ctx.fillStyle = '#ffffff'; ctx.font = '400 16px system-ui';
        ctx.fillText('Score: ' + score, W/2, H/2);
        ctx.fillStyle = '#7fc9ff';
        ctx.fillText('Best: '  + best,  W/2, H/2 + 28);
        ctx.fillStyle = '#f5f5f5'; ctx.font = '400 13px system-ui';
        ctx.fillText('press SPACE to play again', W/2, H/2 + 68);
    }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
updateUI();
loop();
