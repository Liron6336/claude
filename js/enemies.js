'use strict';

class Enemy {
  constructor(type, x, y) {
    this.type = type;
    this.def = ENEMIES[type];
    this.hp = this.maxHp = this.def.hp;
    this.x = x;
    this.y = y;
    this.angle = Math.PI;
    this.atkT = 0.5;
    this.walk = Math.random() * 10;
    this.lunge = 0;
    this.hitFlash = 0;
    this.dead = false;
    this.spawnT = this.def.spawns ? this.def.spawns.every : 0;
  }

  update(world, dt) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.lunge = Math.max(0, this.lunge - dt * 4);

    if (this.def.spawns) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = this.def.spawns.every;
        for (let i = 0; i < this.def.spawns.n; i++) {
          const a = Math.random() * Math.PI * 2;
          world.addEnemy(this.def.spawns.type, this.x + Math.cos(a) * 0.3, this.y + Math.sin(a) * 0.3);
        }
        world.burst(this.x, this.y, this.def.color, 10, 2);
      }
    }

    const W = world.W;
    const tx = Math.floor(this.x), ty = Math.floor(this.y);
    let best = -1, bd = world.flow[ty * W + tx];
    for (let d = 0; d < 4; d++) {
      const nx = tx + DIRS[d][0], ny = ty + DIRS[d][1];
      if (!world.inBounds(nx, ny)) continue;
      const f = world.flow[ny * W + nx];
      if (f < bd) { bd = f; best = d; }
    }
    if (best < 0) return;

    const nx = tx + DIRS[best][0], ny = ty + DIRS[best][1];
    const b = world.grid[ny * W + nx];
    if (b) {
      // Путь перегорожен зданием: встаём в центр своей клетки и грызём его
      const gx = tx + 0.5, gy = ty + 0.5;
      if (Math.hypot(gx - this.x, gy - this.y) > 0.3) {
        this.move(gx, gy, dt);
      } else {
        this.angle = angleLerp(this.angle, Math.atan2(ny - ty, nx - tx), Math.min(1, dt * 8));
        this.atkT -= dt;
        if (this.atkT <= 0) {
          this.atkT = this.def.rate;
          this.lunge = 1;
          world.damageBuilding(b, this.def.dmg);
          world.burst(this.x + DIRS[best][0] * 0.5, this.y + DIRS[best][1] * 0.5, '#ffcf8a', 4, 1);
        }
      }
    } else {
      this.move(nx + 0.5, ny + 0.5, dt);
    }
  }

  move(gx, gy, dt) {
    const dx = gx - this.x, dy = gy - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-4) return;
    const step = Math.min(d, this.def.speed * dt);
    this.x += dx / d * step;
    this.y += dy / d * step;
    this.angle = angleLerp(this.angle, Math.atan2(dy, dx), Math.min(1, dt * 10));
    this.walk += step * 9;
  }
}

class Bullet {
  constructor(x, y, target, dmg, color) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.target = target;
    this.tx = target.x;
    this.ty = target.y;
    this.dmg = dmg;
    this.color = color;
    this.speed = 14;
    this.life = 2;
    this.dead = false;
  }

  update(world, dt) {
    if (!this.target.dead) { this.tx = this.target.x; this.ty = this.target.y; }
    this.px = this.x;
    this.py = this.y;
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step + 0.05) {
      this.x = this.tx;
      this.y = this.ty;
      if (!this.target.dead) world.hitEnemy(this.target, this.dmg);
      world.burst(this.x, this.y, this.color, 3, 1);
      this.dead = true;
      return;
    }
    this.x += dx / d * step;
    this.y += dy / d * step;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}
