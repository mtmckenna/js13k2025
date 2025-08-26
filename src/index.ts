
import catImageUrl from '../assets/cat.png';

const canvas: HTMLCanvasElement = document.createElement("canvas");
const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
const width = 800;
const height = 600;

canvas.id = "game";
canvas.width = width;
canvas.height = height;
document.body.appendChild(canvas);

interface Point {
  x: number;
  y: number;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  velocityX: number;
  isGrounded: boolean;
  isDiving: boolean;
  angle: number;
  targetAngle: number;
  frameIndex: number;
  animationTimer: number;
}

interface Camera {
  x: number;
  y: number;
}

interface Cloud {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
}

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
}

interface CatSprite {
  x: number;
  y: number;
  frameIndex: number;
  animationTimer: number;
}

const GROUND_HEIGHT = 50;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GROUND_Y = height - GROUND_HEIGHT;
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;

const player: Player = {
  x: 50,
  y: GROUND_Y,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  velocityY: 0,
  velocityX: 0,
  isGrounded: true,
  isDiving: false,
  angle: 0,
  targetAngle: 0,
  frameIndex: 0,
  animationTimer: 0
};

function bottomOfPlayer(player: Player): number {
  return player.y + player.height;
}

const camera: Camera = {
  x: 0,
  y: 0
};

const clouds: Cloud[] = [];
const blocks: Block[] = [];
const particles: Particle[] = [];

const catImage = new Image();
catImage.src = catImageUrl;


function generateCloud() {
  clouds.push({
    x: camera.x + width + Math.random() * 200,
    y: Math.random() * 150 + 20,
    radius: Math.random() * 15 + 10,
    opacity: Math.random() * 0.6 + 0.2
  });
}

function generateBlock() {
  const blockHeight = Math.random() * 120 + 40;
  blocks.push({
    x: camera.x + width + Math.random() * 600,
    width: 60,
    height: blockHeight,
    y: GROUND_Y - blockHeight,
    velocityX: -0.6
  });
}

for (let i = 0; i < 10; i++) {
  clouds.push({
    x: Math.random() * width * 2,
    y: Math.random() * 150 + 20,
    radius: Math.random() * 15 + 10,
    opacity: Math.random() * 0.6 + 0.2
  });
}

for (let i = 0; i < 3; i++) {
  const blockHeight = Math.random() * 120 + 40;
  blocks.push({
    x: player.x + width + i * 400 + Math.random() * 200,
    width: 60,
    height: blockHeight,
    y: GROUND_Y - blockHeight,
    velocityX: -0.6
  });
}

let jumpPressed = false;
let jumpHoldTime = 0;
const MAX_JUMP_HOLD_TIME = 15;

function drawShape(points: Point[], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x - camera.x, points[0].y - camera.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x - camera.x, points[i].y - camera.y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawCloud(cloud: Cloud) {
  ctx.save();
  ctx.globalAlpha = cloud.opacity;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cloud.x - camera.x, cloud.y - camera.y, cloud.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBlock(block: Block) {
  ctx.fillStyle = '#808080';
  ctx.fillRect(block.x - camera.x, block.y - camera.y, block.width, block.height);
  ctx.strokeStyle = '#606060';
  ctx.lineWidth = 2;
  ctx.strokeRect(block.x - camera.x, block.y - camera.y, block.width, block.height);
}

function createExplosion(x: number, y: number) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x,
      y: y,
      velocityX: (Math.random() - 0.5) * 8,
      velocityY: (Math.random() - 0.5) * 8,
      life: 30
    });
  }
}

function drawParticle(particle: Particle) {
  ctx.fillStyle = '#808080';
  ctx.fillRect(particle.x - camera.x, particle.y - camera.y, 3, 3);
}

function updatePlayerAnimation() {
  if (player.isGrounded) {
    player.animationTimer++;
    if (player.animationTimer >= 10) {
      player.frameIndex = (player.frameIndex + 1) % 2;
      player.animationTimer = 0;
    }
  } else {
    player.frameIndex = 0;
  }
}

function drawPlayer() {
  const frameWidth = 16;
  const frameHeight = 16;
  const sourceX = player.frameIndex * frameWidth;
  
  ctx.save();
  ctx.translate(player.x + player.width/2 - camera.x, player.y + player.height/2 - camera.y);
  ctx.rotate(player.angle);
  
  ctx.drawImage(
    catImage,
    sourceX, 0, frameWidth, frameHeight,
    -player.width/2, -player.height/2, player.width, player.height
  );
  
  ctx.restore();
}

function getPlayerVertices(): Point[] {
  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);
  
  const pointDistance = player.width * 1.2;
  const tipX = player.x + player.width * 0.5 + dirX * pointDistance;
  const tipY = player.y + player.height * 0.5 + dirY * pointDistance;
  
  const perpX = -dirY;
  const perpY = dirX;
  const baseWidth = player.width * 0.5;
  
  return [
    { x: tipX, y: tipY },
    { x: player.x + player.width * 0.5 + perpX * baseWidth, y: player.y + player.height * 0.5 + perpY * baseWidth },
    { x: player.x + player.width * 0.5 - perpX * baseWidth, y: player.y + player.height * 0.5 - perpY * baseWidth }
  ];
}

function checkCollision(rect1: {x: number, y: number, width: number, height: number}, rect2: {x: number, y: number, width: number, height: number}): boolean {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
}


function drawGround() {
  ctx.fillStyle = '#27ae60';
  ctx.fillRect(0, GROUND_Y - camera.y, width, GROUND_HEIGHT);
  // draw brder around ground for debug
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, GROUND_Y - camera.y, width, GROUND_HEIGHT);
}

function tick() {
  requestAnimationFrame(tick);
  
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, width, height);
  
  for (let i = clouds.length - 1; i >= 0; i--) {
    const cloud = clouds[i];
    if (cloud.x < camera.x - 100) {
      clouds.splice(i, 1);
    } else {
      drawCloud(cloud);
    }
  }
  
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    block.x += block.velocityX;
    if (block.x < camera.x - 100) {
      blocks.splice(i, 1);
    } else {
      if (player.isDiving && checkCollision(player, block)) {
        createExplosion(block.x + block.width/2, block.y + block.height/2);
        
        const bounceAngle = player.angle;
        const bounceForce = 8;
        player.velocityX = Math.abs(Math.cos(bounceAngle - Math.PI) * bounceForce);
        player.velocityY = Math.sin(bounceAngle - Math.PI) * bounceForce;
        
        blocks.splice(i, 1);
        continue;
      }
      drawBlock(block);
    }
  }
  
  if (Math.random() < 0.02) {
    generateCloud();
  }
  
  if (Math.random() < 0.01) {
    generateBlock();
  }
  
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.x += particle.velocityX;
    particle.y += particle.velocityY;
    particle.velocityY += 0.2;
    particle.life--;
    
    if (particle.life <= 0) {
      particles.splice(i, 1);
    } else {
      drawParticle(particle);
    }
  }
  
  drawGround();
  
  updatePlayerAnimation();
  
  if (player.isDiving) {
    player.targetAngle = Math.PI / 4;
  } else {
    player.targetAngle = 0;
  }
  
  const angleDiff = player.targetAngle - player.angle;
  player.angle += angleDiff * 0.4;

  if (jumpPressed && jumpHoldTime < MAX_JUMP_HOLD_TIME && player.velocityY < 0) {
    player.velocityY += -1;
    jumpHoldTime++;
  }

  if (player.isDiving) {
    player.velocityY += GRAVITY * 2;
  } else {
    player.velocityY += GRAVITY;
  }

  if (player.isGrounded) {
    player.velocityX = 1;
  }
  
  player.y += player.velocityY;
  player.x += player.velocityX;
  
  camera.x = player.x - width / 2;
  camera.y = GROUND_Y - height + GROUND_HEIGHT;
  
  //debug
  if (bottomOfPlayer(player) >= GROUND_Y) {
    player.y = GROUND_Y - player.height;
    player.velocityY = 0;
    player.isGrounded = true;
    player.isDiving = false;
    jumpHoldTime = 0;
  } else {
    player.isGrounded = false;
  }
  
  drawPlayer();
}

requestAnimationFrame(tick);

window.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === " " && !jumpPressed) {
    jumpPressed = true;
    if (player.isGrounded) {
      player.velocityY = JUMP_FORCE;
      player.isGrounded = false;
    } else if (!player.isDiving) {
      player.isDiving = true;
      player.velocityY = Math.max(player.velocityY, 2);
      player.velocityX = Math.max(player.velocityX, 2);
    }
  }
});

window.addEventListener("keyup", (e: KeyboardEvent) => {
  if (e.key === " ") {
    jumpPressed = false;
    jumpHoldTime = 0;
  }
});
