// --- state ---
let ballDamage = 1, ballHp = 5, ballMaxHp = 5, score = 0, best = 0;
let resetting = false, gameOver = false, waiting = true;
let explosions = [];
let gutterCooldown = 0;
let lastBallX = 180, lastBallY = 120;
let launchedL = false, launchedR = false;
let idleTimer = 0;
let prevLAngle = 0.4;
let prevRAngle = Math.PI - 0.4;

// --- canvas ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 360, H = 560;

// --- ball ---
const ball = { x: 180, y: 120, vx: 0, vy: 0, r: 14 };

// --- bumpers ---
const bumpers = [
    { x: 130, y: 170, r: 24, char: '⭐', hit: 0, hp: 3, maxHp: 3, cooldown: 0 },
];

// --- targets ---
const targets = [
    { x: 120, y: 250, w: 34, h: 20, char: 'T', hit: false, timer: 0 },
    { x: 210, y: 250,  w: 34, h: 20, char: 'A', hit: false, timer: 0 },
    { x: 240, y: 100, w: 34, h: 20, char: '🦊', hit: false, timer: 0 },
    { x: 295, y: 165, w: 34, h: 20, char: '🐼', hit: false, timer: 0 },
    { x: 38,  y: 185, w: 34, h: 20, char: '🐧', hit: false, timer: 0 },
];

let lAngle = 0.4, rAngle = Math.PI - 0.4;

// --- input ---
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ') { e.preventDefault(); launch(); }
    if (e.key === 'r' || e.key === 'R') { restartGame(); }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// --- helpers ---
function updateUI() {
    document.getElementById('scoreEl').textContent = score;
    document.getElementById('bestEl').textContent = best;
    document.getElementById('livesEl').textContent = ballHp;
}

function addScore(n) {
    score += n;
    if (score > best) best = score;
    updateUI();
}

function closestPoint(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy) / (dx*dx + dy*dy)));
    return { x: ax + t*dx, y: ay + t*dy };
}

function ptDist(ax, ay, bx, by) {
    return Math.sqrt((ax-bx)**2 + (ay-by)**2);
}

function drawChar(char, x, y, size) {
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, x, y);
}

function wallBounce() {
    if (ball.x < 14 + ball.r) { ball.vx = Math.abs(ball.vx) * 0.85; ball.x = 14 + ball.r; }
    if (ball.x > W-14-ball.r) { ball.vx = -Math.abs(ball.vx) * 0.85; ball.x = W-14-ball.r; }
    if (ball.y < 14 + ball.r) { ball.vy = Math.abs(ball.vy) * 0.7;   ball.y = 14 + ball.r; }
}

function drawGrid() {
    ctx.fillStyle = 'rgba(100,90,200,0.07)';
    for (let gx = 28; gx < W; gx += 24)
        for (let gy = 28; gy < H; gy += 24) {
            ctx.beginPath();
            ctx.arc(gx, gy, 1.5, 0, Math.PI*2);
            ctx.fill();
        }
}

// --- game ---
function launch() {
    if (gameOver) { restartGame(); return; }
    if (waiting) {
        waiting = false;
        ball.vy = -6;
        ball.vx = -1.5 + Math.random();
    }
}

function restartGame() {
    ballHp = ballMaxHp; score = 0; gameOver = false;
    targets.forEach(t => { t.hit = false; t.timer = 0; });
    bumpers.forEach(b => { b.hit = 0; b.hp = b.maxHp; });
    resetBall();
    updateUI();
}

function resetBall() {
    ball.x = 180; ball.y = 120;
    ball.vx = 0;  ball.vy = 0;
    lastBallX = 180; lastBallY = 120;
    resetting = false;
    waiting = true;
}

function flipperCollide(cx, cy, angle, isLeft) {
    const ex = cx + Math.cos(angle) * 70;
    const ey = cy + Math.sin(angle) * 70;
    const cp = closestPoint(ball.x, ball.y, cx, cy, ex, ey);
    const d  = ptDist(ball.x, ball.y, cp.x, cp.y);

    if (d > ball.r) return;

    const flipping = isLeft ? keys['a'] : keys['d'];

    // push ball out of flipper
    ball.y = cp.y - ball.r;
    const tipDist = ptDist(cp.x, cp.y, ex, ey);
        if (tipDist < 12) {
        ball.x += isLeft ? 5 : -5;
}

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

// --- update ---
function update() {
    if (gameOver || waiting) return;

    // save last position for swept collision
    lastBallX = ball.x;
    lastBallY = ball.y;

    // physics
    ball.vy += 0.03;
    ball.x  += ball.vx;
    ball.y  += ball.vy;
    ball.vx *= 0.995;
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
        ballHp--;
        if (score > best) best = score;
        updateUI();
        if (ballHp <= 0) { gameOver = true; return; }
        setTimeout(resetBall, 600);
    }

    // flippers
    flipperCollide(72,  485, lAngle, true);
    flipperCollide(287, 485, rAngle, false);

    // gutters — zone based, follows diagonal line exactly
    if (gutterCooldown > 0) {
        gutterCooldown--;
    } else if (ball.y > 445 && ball.y < 490) {
        const t = (ball.y - 445) / 40;
        const leftX  = 15  + t * (72  - 15);
        const rightX = 345 - t * (345 - 287);
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
        if (ball.x > 80 && ball.x < 110 && ball.y > 490 && ball.y < 520) {
            ball.vx = Math.abs(ball.vx) * 0.8;
            ball.x = 110;
    }

// right flipper inner edge  
        if (ball.x > 250 && ball.x < 280 && ball.y > 490 && ball.y < 520) {
            ball.vx = -Math.abs(ball.vx) * 0.8;
            ball.x = 250;
}
    idleTimer++;
        const idleDrag = Math.min(idleTimer / 600, 0.015);
            ball.vx *= (1 - idleDrag);
            ball.vy *= (1 - idleDrag);

    // bumpers
    bumpers.forEach(b => {
        if (b.cooldown > 0) { b.cooldown--; if (b.hit > 0) b.hit--; return; }
        if (b.hit > 0) b.hit--;
        const dx = ball.x - b.x, dy = ball.y - b.y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < ball.r + b.r) {
            const nx = dx/d, ny = dy/d;
            const spd = Math.max(Math.sqrt(ball.vx**2 + ball.vy**2), 3);
            ball.vx = nx * spd; ball.vy = ny * spd;
            ball.x  = b.x + nx * (ball.r + b.r + 1);
            ball.y  = b.y + ny * (ball.r + b.r + 1);
            b.hit = 8; b.cooldown = 20;
            if (b.hp !== undefined) b.hp -= ballDamage;
            if (b.hp <= 0) {
                explosions.push({ x: b.x, y: b.y, r: 10, alpha: 1.0 });
                Object.assign(b, {
                    x:    30  + Math.random() * 300,
                    y:    60  + Math.random() * 250,
                    hp:   b.maxHp,
                    char: ['⭐','💥','🌟','✨','💎','🔥','💫','⚡'][Math.floor(Math.random()*8)]
                });
            }
            addScore(100);
        }
    });

    // explosions
    explosions.forEach(e => { e.r += 3; e.alpha -= 0.06; });
    explosions = explosions.filter(e => e.alpha > 0);

    // targets
    targets.forEach(t => {
        if (t.timer > 0) { t.timer--; if (t.timer === 0) t.hit = false; return; }
        if (!t.hit &&
            ball.x + ball.r > t.x && ball.x - ball.r < t.x + t.w &&
            ball.y + ball.r > t.y && ball.y - ball.r < t.y + t.h) {
            ball.vy = -Math.abs(ball.vy) - 2;
            t.hit = true; t.timer = 200;
            addScore(250);
        }
    });
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

    // border
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth   = 15;
    ctx.strokeRect(14, 14, W-28, H-28);

    // gutters
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth   = 14;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(15, 445); ctx.lineTo(72, 485);
    ctx.moveTo(345, 445); ctx.lineTo(287, 485);
    ctx.stroke();

    // targets
    targets.forEach(t => {
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
    bumpers.forEach(b => {
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
            ctx.fillStyle     = 'white';
            ctx.font          = '10px sans-serif';
            ctx.textAlign     = 'center';
            ctx.textBaseline  = 'middle';
            ctx.fillText('HP' + b.hp, b.x, b.y + b.r + 10);
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

    // flippers
    const la = keys['a'] ? -0.45 : 0.4;
    const ra = keys['d'] ? Math.PI + 0.45 : Math.PI - 0.4;
    drawFlipper(72,  485, lAngle);
    drawFlipper(287, 485, rAngle);

    // ball
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
    ctx.fillStyle   = '#6d6d6d';
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth   = 2;
    ctx.fill(); ctx.stroke();
    ctx.restore();
    drawChar('A', ball.x, ball.y, ball.r * 1.7);

    // waiting
    if (waiting && !gameOver) {
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