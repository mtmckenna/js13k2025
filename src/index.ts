
import catImageUrl from '../assets/cat.png';

const canvas: HTMLCanvasElement = document.createElement("canvas");
const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const width = 1024;
const height = 768;
const CAT_SCALE = 6;

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
  spinVelocity: number;
  isSpinning: boolean;
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
  velocityX: number;
  circles: { x: number; y: number; radius: number }[];
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

const GROUND_HEIGHT = 120;
const GRAVITY = 0.1;
const DIVE_GRAVITY_MULTIPLIER = 1.0;
const JUMP_FORCE = -4.0;
const JUMP_BOOST = -.7;
const NORMAL_SPEED = 1.2;
const DIVE_SPEED = 3.6;
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
  animationTimer: 0,
  spinVelocity: 0,
  isSpinning: false
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
  const baseRadius = Math.random() * 30 + 20;
  const numCircles = Math.floor(Math.random() * 4) + 2; // 2-5 circles
  const circles = [];
  
  // Create multiple overlapping circles
  for (let i = 0; i < numCircles; i++) {
    circles.push({
      x: (Math.random() - 0.5) * baseRadius * 0.8,
      y: (Math.random() - 0.5) * baseRadius * 0.6,
      radius: baseRadius * (0.6 + Math.random() * 0.4)
    });
  }
  
  clouds.push({
    x: camera.x + width + Math.random() * 400,
    y: Math.random() * 300 + 50, // Spread vertically more
    radius: baseRadius,
    opacity: Math.random() * 0.4 + 0.3,
    velocityX: -0.2 - Math.random() * 0.3, // More varied parallax speeds
    circles: circles
  });
}

function generateBlock() {
  const blockHeight = Math.random() * 150 + 50;
  blocks.push({
    x: camera.x + width + Math.random() * 1500,
    width: 75,
    height: blockHeight,
    y: GROUND_Y - blockHeight,
    velocityX: -1.5
  });
}

for (let i = 0; i < 10; i++) {
  const baseRadius = Math.random() * 30 + 20;
  const numCircles = Math.floor(Math.random() * 4) + 2; // 2-5 circles
  const circles = [];
  
  // Create multiple overlapping circles
  for (let j = 0; j < numCircles; j++) {
    circles.push({
      x: (Math.random() - 0.5) * baseRadius * 0.8,
      y: (Math.random() - 0.5) * baseRadius * 0.6,
      radius: baseRadius * (0.6 + Math.random() * 0.4)
    });
  }
  
  clouds.push({
    x: Math.random() * width * 3,
    y: Math.random() * 300 + 50,
    radius: baseRadius,
    opacity: Math.random() * 0.4 + 0.3,
    velocityX: -0.2 - Math.random() * 0.3,
    circles: circles
  });
}

for (let i = 0; i < 8; i++) {
  const blockHeight = Math.random() * 150 + 50;
  blocks.push({
    x: player.x + width + i * 200 + Math.random() * 150,
    width: 75,
    height: blockHeight,
    y: GROUND_Y - blockHeight,
    velocityX: -1.5
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
  
  // First circle at full opacity
  ctx.globalAlpha = cloud.opacity;
  ctx.fillStyle = '#ffffff';
  let firstCircle = cloud.circles[0];
  let drawX = Math.floor(cloud.x + firstCircle.x - camera.x);
  let drawY = Math.floor(cloud.y + firstCircle.y - camera.y);
  ctx.beginPath();
  ctx.arc(drawX, drawY, firstCircle.radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Remaining circles with lighter blend mode
  // ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = cloud.opacity * 0.3; // Much lower opacity for overlaps
  
  for (let i = 1; i < cloud.circles.length; i++) {
    const circle = cloud.circles[i];
    drawX = Math.floor(cloud.x + circle.x - camera.x);
    drawY = Math.floor(cloud.y + circle.y - camera.y);
    ctx.beginPath();
    ctx.arc(drawX, drawY, circle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

function drawBlock(block: Block) {
  const drawX = Math.floor(block.x - camera.x);
  const drawY = Math.floor(block.y - camera.y);
  ctx.fillStyle = '#808080';
  ctx.fillRect(drawX, drawY, block.width, block.height);
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
  const drawX = Math.floor(particle.x - camera.x);
  const drawY = Math.floor(particle.y - camera.y);
  ctx.fillStyle = '#808080';
  ctx.fillRect(drawX, drawY, 3, 3);
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
  ctx.imageSmoothingEnabled = false;
  (ctx as any).webkitImageSmoothingEnabled = false;
  (ctx as any).mozImageSmoothingEnabled = false;
  (ctx as any).msImageSmoothingEnabled = false;

  
  if (Math.abs(player.angle) < 0.01) {
    // Draw without rotation scaled to player size
    const drawX = Math.floor(player.x - camera.x);
    const drawY = Math.floor(player.y - camera.y);
    ctx.drawImage(
      catImage,
      sourceX, 0, frameWidth, frameHeight,
      drawX, drawY, frameWidth * CAT_SCALE, frameHeight * CAT_SCALE
    );
  } else {
    // Use rotation when spinning/diving
    const drawX = Math.floor(player.x + player.width/2 - camera.x);
    const drawY = Math.floor(player.y + player.height/2 - camera.y);
    ctx.translate(drawX, drawY);
    ctx.rotate(player.angle);
    ctx.drawImage(
      catImage,
      sourceX, 0, frameWidth, frameHeight,
      -(frameWidth * CAT_SCALE)/2, -(frameHeight * CAT_SCALE)/2, frameWidth * CAT_SCALE, frameHeight * CAT_SCALE
    );
  }
  
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
}

function tick() {
  requestAnimationFrame(tick);
  
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, width, height);
  
  for (let i = clouds.length - 1; i >= 0; i--) {
    const cloud = clouds[i];
    cloud.x += cloud.velocityX;
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
      if (checkCollision(player, block) && player.velocityY > 0) {
        createExplosion(block.x + block.width/2, block.y + block.height/2);
        
        const bounceAngle = player.angle;
        const bounceForce = 4;
        player.velocityX = Math.abs(Math.cos(bounceAngle - Math.PI) * bounceForce);
        player.velocityY = Math.sin(bounceAngle - Math.PI) * bounceForce;
        
        // If space is held during bounce, apply jump boost
        if (jumpPressed) {
          //player.velocityY += JUMP_BOOST * 2; // Extra boost for bounce
          jumpHoldTime = 0; // Reset jump hold time for consistent bounces
        }
        
        player.isSpinning = true;
        player.spinVelocity = 0.3;
        
        blocks.splice(i, 1);
        continue;
      }
      drawBlock(block);
    }
  }
  
  if (Math.random() < 0.02) {
    generateCloud();
  }
  
  if (Math.random() < 0.03) {
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
  
  if (player.isSpinning) {
    player.angle += player.spinVelocity;
    player.spinVelocity *= 0.95;
    if (player.spinVelocity < 0.05) {
      player.isSpinning = false;
      player.spinVelocity = 0;
      player.angle = player.isDiving ? Math.PI / 4 : 0;
    }
  } else {
    if (player.isDiving) {
      player.targetAngle = Math.PI / 4;
    } else {
      player.targetAngle = 0;
    }
    
    const angleDiff = player.targetAngle - player.angle;
    player.angle += angleDiff * 0.4;
  }

  if (jumpPressed && jumpHoldTime < MAX_JUMP_HOLD_TIME && player.velocityY < 0) {
    player.velocityY += JUMP_BOOST;
    jumpHoldTime++;
  }

  if (player.isDiving) {
    player.velocityY += GRAVITY * DIVE_GRAVITY_MULTIPLIER;
  } else {
    player.velocityY += GRAVITY;
  }

  if (player.isGrounded) {
    player.velocityX = NORMAL_SPEED;
  } else if (!player.isDiving) {
    player.velocityX = NORMAL_SPEED;
  }
  
  player.y += player.velocityY;
  player.x += player.velocityX;
  
  camera.x = player.x - width / 5;
  camera.y = GROUND_Y - height + GROUND_HEIGHT;
  
  //debug
  if (bottomOfPlayer(player) >= GROUND_Y) {
    player.y = GROUND_Y - player.height;
    player.velocityY = 0;
    player.isGrounded = true;
    player.isDiving = false;
    player.isSpinning = false;
    player.spinVelocity = 0;
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
    } else {
      if (player.isDiving) {
        player.isDiving = false;
      } else {
        player.isDiving = true;
        player.velocityY = Math.max(player.velocityY, 2);
        player.velocityX = DIVE_SPEED;
      }
    }
  }
});

window.addEventListener("keyup", (e: KeyboardEvent) => {
  if (e.key === " ") {
    jumpPressed = false;
    jumpHoldTime = 0;
    if (!player.isGrounded && player.isDiving) {
      player.isDiving = false;
    }
  }
});
