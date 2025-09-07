
import catImageUrl from '../assets/cat.png';
import cupcakeImageUrl from '../assets/cupcake.png';

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
  hasDoubleJumped: boolean;
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
  color: string;
}

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  color: string;
  size: number;
  angle: number;
  rotationSpeed: number;
}

interface CatSprite {
  x: number;
  y: number;
  frameIndex: number;
  animationTimer: number;
}

const GROUND_HEIGHT = 120;
const GRAVITY = 0.2;
const DIVE_GRAVITY_MULTIPLIER = 1.0;
const JUMP_FORCE = -3.2;
const DOUBLE_JUMP_FORCE = -2.8;
const JUMP_BOOST = -1;
const NORMAL_SPEED = 3;
const DIVE_SPEED = 5;
const GROUND_Y = height - GROUND_HEIGHT;
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;

// Camera constants
const CAMERA_OFFSET_SPEED = 0.015;
const CAMERA_ROTATION_SPEED = 0.02;
const CAMERA_TILT_MULTIPLIER = 0.05;
const CAMERA_ZOOM_SPEED = 0.08;
const JUMP_ZOOM_OUT = 0.9; // Zoom level when jumping (not diving)
const DIVE_ZOOM_OUT = 0.8; // Zoom level when diving

// Shadow constants
const SHADOW_WIDTH_SCALE = 1.7; // Shadow width relative to player
const SHADOW_HEIGHT_SCALE = 0.5; // Shadow height relative to player
const SHADOW_MIN_SCALE = 0.25; // Minimum shadow size when high up
const SHADOW_MAX_HEIGHT = 400; // Max height for shadow visibility
const SHADOW_MIN_OPACITY = 0.3; // Minimum shadow opacity
const SHADOW_OFFSET_X = 0; // Horizontal offset from player center
const SHADOW_OFFSET_Y = -30; // Vertical offset from ground surface
const SHADOW_SCALE_RATE = .5; // Rate at which shadow shrinks with height (1.0 = normal, 2.0 = faster, 0.5 = slower)

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
  isSpinning: false,
  hasDoubleJumped: false
};

function bottomOfPlayer(player: Player): number {
  return player.y + player.height;
}

const camera: Camera = {
  x: 0,
  y: 0
};

let cameraOffsetX = 0; // Smooth camera offset for diving
let cameraAngle = 0; // Smooth camera rotation
let cameraZoom = 1.0; // Camera zoom for speed effect
let cameraOffsetY = 0; // Vertical offset for zoom bias

const clouds: Cloud[] = [];
const blocks: Block[] = [];
const particles: Particle[] = [];

const catImage = new Image();
catImage.src = catImageUrl;

const cupcakeImage = new Image();
cupcakeImage.src = cupcakeImageUrl;

// Cupcake system
let cupcakeCount = 3;
const cupcakeAnimations: Array<{
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  rotationSpeed: number;
  scale: number;
  opacity: number;
  life: number;
}> = [];

// Game state
let gameStarted = false;
let gameOver = false;
let titleAnimationTime = 0;
let score = 0;
let highScore = 0;


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
    x: camera.x + width * 1.5 + Math.random() * 400, // Spawn further ahead
    y: Math.random() * 300 + 50, // Spread vertically more
    radius: baseRadius,
    opacity: Math.random() * 0.4 + 0.3,
    velocityX: -0.2 - Math.random() * 0.3, // More varied parallax speeds
    circles: circles
  });
}

function generateBlock() {
  const balloonColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'];
  const balloonSize = 60; // Fixed balloon size
  const stringLength = 40; // Fixed shorter string length
  const balloonBodyHeight = balloonSize * 1.2; // 72px
  const heightFromGround = Math.random() * 200 + 100; // Much more variety (100-300px from ground)
  
  blocks.push({
    x: camera.x + width * 1.5 + Math.random() * 1500, // Spawn further ahead
    width: balloonSize,
    height: balloonBodyHeight + stringLength, // Balloon body + fixed string
    y: GROUND_Y - heightFromGround,
    velocityX: -1.5,
    color: balloonColors[Math.floor(Math.random() * balloonColors.length)]
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
  const balloonColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'];
  const balloonSize = 60; // Fixed balloon size
  const stringLength = 40; // Fixed shorter string length
  const balloonBodyHeight = balloonSize * 1.2; // 72px
  const heightFromGround = Math.random() * 200 + 100; // Much more variety (100-300px from ground)
  
  blocks.push({
    x: player.x + width + i * 200 + Math.random() * 150,
    width: balloonSize,
    height: balloonBodyHeight + stringLength,
    y: GROUND_Y - heightFromGround,
    velocityX: -1.5,
    color: balloonColors[Math.floor(Math.random() * balloonColors.length)]
  });
}

let jumpPressed = false;
let jumpHoldTime = 0;
const MAX_JUMP_HOLD_TIME = 15;

// Double jump variables
let lastJumpTime = 0;
const DOUBLE_JUMP_WINDOW = 300; // milliseconds to allow double jump

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
  
  // Calculate balloon body dimensions (fixed 60px balloon)
  const balloonBodyHeight = 72; // 60 * 1.2
  const stringLength = 40; // Fixed string length
  const centerX = drawX + block.width / 2;
  const balloonCenterY = drawY + balloonBodyHeight / 2;
  
  // Draw balloon body (oval)
  ctx.fillStyle = block.color;
  ctx.beginPath();
  ctx.ellipse(centerX, balloonCenterY, block.width/2, balloonBodyHeight/2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw tie-off nub at bottom of balloon (small upward triangle into balloon)
  ctx.fillStyle = block.color;
  ctx.beginPath();
  const nubPoint = drawY + balloonBodyHeight - 4; // point goes up into balloon
  const nubBase = drawY + balloonBodyHeight + 2;
  ctx.moveTo(centerX, nubPoint); // top point (in balloon)
  ctx.lineTo(centerX - 3, nubBase); // bottom left
  ctx.lineTo(centerX + 3, nubBase); // bottom right
  ctx.closePath();
  ctx.fill();
  
  // Draw wiggly white string anchored at balloon
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  // String starts fixed at balloon nub base
  const stringStartY = nubBase;
  ctx.moveTo(centerX, stringStartY);
  
  // Create natural hanging wiggle - more wiggle at bottom, less at top
  const segments = 8;
  for (let i = 1; i <= segments; i++) {
    const progress = i / segments; // 0 to 1
    const y = stringStartY + (progress * stringLength);
    const wiggleAmount = progress * 4; // More wiggle towards bottom
    const wiggle = Math.sin(y * 0.1 + Date.now() * 0.002) * wiggleAmount;
    ctx.lineTo(centerX + wiggle, y);
  }
  ctx.stroke();
}

function createExplosion(x: number, y: number, color: string) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x,
      y: y,
      velocityX: (Math.random() - 0.5) * 12,
      velocityY: (Math.random() - 0.5) * 12,
      life: 40 + Math.random() * 20,
      color: color,
      size: Math.random() * 10 + 6, // 6-16px particles
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3
    });
  }
}

function drawParticle(particle: Particle) {
  const drawX = Math.floor(particle.x - camera.x);
  const drawY = Math.floor(particle.y - camera.y);
  
  ctx.save();
  ctx.translate(drawX + particle.size/2, drawY + particle.size/2);
  ctx.rotate(particle.angle);
  ctx.fillStyle = particle.color;
  ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
  ctx.restore();
}

function updatePlayerAnimation() {
  if (player.isGrounded) {
    player.animationTimer++;
    if (player.animationTimer >= 15) { // Slower animation
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
  const paddedFrameWidth = frameWidth + 2; // Account for 1px padding on each side
  const sourceX = player.frameIndex * paddedFrameWidth + 1; // Offset by 1px for left padding
  
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  (ctx as any).webkitImageSmoothingEnabled = false;
  (ctx as any).mozImageSmoothingEnabled = false;
  (ctx as any).msImageSmoothingEnabled = false;

  
  // Always center the sprite for consistent positioning
  const drawX = Math.floor(player.x + player.width/2 - camera.x);
  const drawY = Math.floor(player.y + player.height/2 - camera.y);
  ctx.translate(drawX, drawY);
  ctx.rotate(player.angle); // Always rotate, even if angle is 0
  
  ctx.drawImage(
    catImage,
    sourceX, 1, frameWidth, frameHeight, // Y offset by 1px for top padding
    -(frameWidth * CAT_SCALE)/2, -(frameHeight * CAT_SCALE)/2, frameWidth * CAT_SCALE, frameHeight * CAT_SCALE
  );
  
  ctx.restore();
}

function drawPlayerShadow() {
  // Calculate shadow position with adjustable offsets
  const shadowX = Math.floor(player.x + player.width/2 - camera.x + SHADOW_OFFSET_X);
  const shadowY = Math.floor(GROUND_Y - camera.y + GROUND_HEIGHT/2 + SHADOW_OFFSET_Y); // Position on ground surface
  
  // Shadow gets smaller and more transparent the higher the player is
  const heightFromGround = GROUND_Y - (player.y + player.height);
  const heightRatio = (heightFromGround * SHADOW_SCALE_RATE) / SHADOW_MAX_HEIGHT;
  const shadowScale = Math.max(SHADOW_MIN_SCALE, Math.min(1.2, 1 - heightRatio));
  const shadowOpacity = Math.max(SHADOW_MIN_OPACITY, shadowScale * 0.5);
  
  ctx.save();
  ctx.globalAlpha = shadowOpacity;
  ctx.fillStyle = '#111'; // Darker green shadow on grass
  
  // Draw oval shadow with proper scaling
  ctx.beginPath();
  ctx.ellipse(
    shadowX, 
    shadowY,
    player.width * shadowScale * SHADOW_WIDTH_SCALE, 
    player.height * shadowScale * SHADOW_HEIGHT_SCALE, 
    0, 0, Math.PI * 2
  );
  ctx.fill();
  
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

function checkCollision(rect1: {x: number, y: number, width: number, height: number}, block: {x: number, y: number, width: number, height: number}): boolean {
  // Check collision with balloon body (oval), not the string
  const balloonBodyHeight = 72; // Fixed balloon body height
  const balloonCenterX = block.x + block.width / 2;
  const balloonCenterY = block.y + balloonBodyHeight / 2;
  const balloonRadiusX = block.width / 2;
  const balloonRadiusY = balloonBodyHeight / 2;
  
  // Simple rectangle vs ellipse collision (approximate with expanded rectangle)
  const expandedBlockX = balloonCenterX - balloonRadiusX;
  const expandedBlockY = balloonCenterY - balloonRadiusY;
  const expandedBlockWidth = balloonRadiusX * 2;
  const expandedBlockHeight = balloonRadiusY * 2;
  
  return rect1.x < expandedBlockX + expandedBlockWidth &&
         rect1.x + rect1.width > expandedBlockX &&
         rect1.y < expandedBlockY + expandedBlockHeight &&
         rect1.y + rect1.height > expandedBlockY;
}


function drawGround() {
  ctx.fillStyle = '#27ae60';
  // Extend ground to cover zoom out and rotation
  ctx.fillRect(-width, GROUND_Y - camera.y, width * 3, GROUND_HEIGHT);
}

function drawCupcakeUI() {
  // Draw static cupcakes in top left
  for (let i = 0; i < cupcakeCount; i++) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(30 + i * 40, 30);
    ctx.drawImage(cupcakeImage, -16, -16, 32, 32);
    ctx.restore();
  }
  
  // Draw animating cupcakes
  for (let i = cupcakeAnimations.length - 1; i >= 0; i--) {
    const anim = cupcakeAnimations[i];
    
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = anim.opacity;
    ctx.translate(anim.x, anim.y);
    ctx.rotate(anim.angle);
    ctx.scale(anim.scale, anim.scale);
    ctx.drawImage(cupcakeImage, -16, -16, 32, 32);
    ctx.restore();
    
    // Update animation
    anim.x += anim.velocityX;
    anim.y += anim.velocityY;
    anim.velocityY += 0.3; // gravity
    anim.angle += anim.rotationSpeed;
    anim.opacity *= 0.98;
    anim.life--;
    
    if (anim.life <= 0) {
      cupcakeAnimations.splice(i, 1);
    }
  }
}

function loseCupcake() {
  if (cupcakeCount > 0) {
    // Create animation for the cupcake that's disappearing
    const cupcakeIndex = cupcakeCount - 1;
    cupcakeAnimations.push({
      x: 30 + cupcakeIndex * 40,
      y: 30,
      velocityX: Math.random() * 4 - 2, // random horizontal velocity
      velocityY: -3 - Math.random() * 2, // pop up
      angle: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      scale: 1,
      opacity: 1,
      life: 60
    });
    
    cupcakeCount--;
    
    // Check for game over
    if (cupcakeCount === 0) {
      gameOver = true;
      if (score > highScore) {
        highScore = score;
      }
    }
  }
}

function drawGameOverScreen() {
  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, width, height);
  
  // "Great Job!" with birthday animation
  const title = "Great Job!";
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  
  // Draw each letter with bounce animation
  let xOffset = width / 2 - (title.length * 32) / 2;
  for (let i = 0; i < title.length; i++) {
    const letter = title[i];
    const bounce = Math.sin(titleAnimationTime * 0.003 + i * 0.3) * 15;
    
    // Rainbow colors for fun birthday effect
    const hue = (i * 40 + titleAnimationTime * 0.1) % 360;
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    
    ctx.save();
    ctx.translate(xOffset + i * 32, height / 3 + bounce);
    
    // Draw text with black outline
    ctx.strokeText(letter, 0, 0);
    ctx.fillText(letter, 0, 0);
    
    ctx.restore();
  }
  
  // Score display area (placeholder for now - will be filled in later)
  ctx.font = '32px monospace';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.textAlign = 'center';
  
  // Leave space here for score display
  const scoreText = `Score: ${score}`;
  ctx.strokeText(scoreText, width / 2, height / 2 + 20);
  ctx.fillText(scoreText, width / 2, height / 2 + 20);
  
  const highScoreText = `High Score: ${highScore}`;
  ctx.strokeText(highScoreText, width / 2, height / 2 + 60);
  ctx.fillText(highScoreText, width / 2, height / 2 + 60);
  
  // Play again prompt
  const playAgainText = "- Press any key to play again -";
  const pulseScale = 1 + Math.sin(titleAnimationTime * 0.005) * 0.1;
  ctx.font = `${24 * pulseScale}px monospace`;
  ctx.fillStyle = '#ffff00';
  ctx.strokeText(playAgainText, width / 2, height - 100);
  ctx.fillText(playAgainText, width / 2, height - 100);
}

function drawTitleScreen() {
  // Animated title letters
  const title = "Happy Birthday, Jerry!";
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  
  // Draw each letter with bounce animation
  let xOffset = width / 2 - (title.length * 24) / 2;
  for (let i = 0; i < title.length; i++) {
    const letter = title[i];
    const bounce = Math.sin(titleAnimationTime * 0.003 + i * 0.3) * 10;
    
    // Rainbow colors for fun birthday effect
    const hue = (i * 20 + titleAnimationTime * 0.1) % 360;
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    
    ctx.save();
    ctx.translate(xOffset + i * 24, height / 3 + bounce);
    
    // Draw text with black outline
    ctx.strokeText(letter, 0, 0);
    ctx.fillText(letter, 0, 0);
    
    ctx.restore();
  }
  
  // Instructions
  ctx.font = '24px monospace';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.textAlign = 'center';
  
  const instruction1 = "Press space, tap, or click to jump";
  ctx.strokeText(instruction1, width / 2, height / 2 + 40);
  ctx.fillText(instruction1, width / 2, height / 2 + 40);
  
  const instruction2 = "Hold jump to dive";
  ctx.strokeText(instruction2, width / 2, height / 2 + 80);
  ctx.fillText(instruction2, width / 2, height / 2 + 80);
  
  const instruction3 = "Press jump twice to double jump (one time per jump)";
  ctx.strokeText(instruction3, width / 2, height / 2 + 120);
  ctx.fillText(instruction3, width / 2, height / 2 + 120);
  
  // Warning instruction in different color
  ctx.fillStyle = '#ff6b6b'; // Red/pink color for warning
  const warning = "If you hit the ground, you lose a cupcake!";
  ctx.strokeText(warning, width / 2, height / 2 + 160);
  ctx.fillText(warning, width / 2, height / 2 + 160);
  
  // Start prompt
  const startText = "- Press any key to start -";
  const pulseScale = 1 + Math.sin(titleAnimationTime * 0.005) * 0.1;
  ctx.font = `${20 * pulseScale}px monospace`;
  ctx.fillStyle = '#ffff00';
  ctx.strokeText(startText, width / 2, height - 100);
  ctx.fillText(startText, width / 2, height - 100);
}

// Fixed timestep variables
let lastTime = 0;
let accumulator = 0;
const FIXED_TIMESTEP = 1000 / 60; // 60fps in milliseconds

function tick(currentTime = 0) {
  requestAnimationFrame(tick);
  
  // Calculate delta time and accumulate
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  accumulator += deltaTime;
  
  // Skip frame if not enough time has passed
  if (accumulator < FIXED_TIMESTEP) {
    return;
  }
  
  // Process one fixed update step
  accumulator -= FIXED_TIMESTEP;
  
  // Update title animation time
  titleAnimationTime++;
  
  ctx.save();
  
  // Apply camera rotation and zoom
  ctx.translate(width / 2, height / 2);
  ctx.scale(cameraZoom, cameraZoom);
  if (Math.abs(cameraAngle) > 0.01) {
    ctx.rotate(cameraAngle);
  }
  ctx.translate(-width / 2, -height / 2);
  
  // Make background much larger to cover zoom out and rotation
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(-width, -height, width * 3, height * 3);
  
  // Fill bottom area with grass color to match ground
  ctx.fillStyle = '#27ae60';
  ctx.fillRect(-width, GROUND_Y - camera.y, width * 3, height * 3);
  
  for (let i = clouds.length - 1; i >= 0; i--) {
    const cloud = clouds[i];
    cloud.x += cloud.velocityX;
    if (cloud.x < camera.x - width * 0.5) { // Despawn further offscreen
      clouds.splice(i, 1);
    } else {
      drawCloud(cloud);
    }
  }
  
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    block.x += block.velocityX;
    if (block.x < camera.x - width * 0.5) { // Despawn further offscreen
      blocks.splice(i, 1);
    } else {
      if (checkCollision(player, block)) {
        createExplosion(block.x + block.width/2, block.y + block.height/2, block.color);
        
        // Only bounce if hitting from above (falling down)
        if (player.velocityY > 0) {
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
        }
        // If hitting from below (going up), just pop the balloon without affecting movement
        
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
    particle.angle += particle.rotationSpeed;
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
      // Don't set angle instantly - let the else block handle interpolation
    }
  } else {
    if (player.isDiving) {
      player.targetAngle = Math.PI / 4;
    } else {
      player.targetAngle = 0;
    }
    
    // Find the shortest rotation direction
    let angleDiff = player.targetAngle - player.angle;
    
    // Normalize angle difference to [-π, π]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    player.angle += angleDiff * 0.1; // Much slower rotation interpolation
  }

  // Only update player physics if game is active
  if (!gameOver) {
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
  }
  
  // Smooth camera offset for diving - look ahead horizontally
  const targetOffsetX = player.isDiving ? 100 : 0; // Look ahead when diving
  cameraOffsetX += (targetOffsetX - cameraOffsetX) * CAMERA_OFFSET_SPEED;
  
  // Camera tilt only during controlled diving, not spinning
  let targetCameraAngle = 0;
  if (player.isDiving && !player.isSpinning) {
    // Clamp the angle to reasonable range for camera tilt
    let clampedAngle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, player.angle));
    targetCameraAngle = clampedAngle * CAMERA_TILT_MULTIPLIER;
  }
  cameraAngle += (targetCameraAngle - cameraAngle) * CAMERA_ROTATION_SPEED;
  
  // Zoom out when jumping, zoom out more when diving
  let targetZoom = 1.0; // Normal zoom when on ground
  if (!player.isGrounded) {
    targetZoom = player.isDiving ? DIVE_ZOOM_OUT : JUMP_ZOOM_OUT; // More zoom out when diving, less when just jumping
  }
  cameraZoom += (targetZoom - cameraZoom) * CAMERA_ZOOM_SPEED;
  
  // Bias camera up when zooming out to show more sky
  let targetOffsetY = 0; // Normal position when on ground
  if (!player.isGrounded) {
    targetOffsetY = player.isDiving ? -60 : -30; // More offset when diving, less when jumping
  }
  cameraOffsetY += (targetOffsetY - cameraOffsetY) * CAMERA_ZOOM_SPEED;
  
  camera.x = player.x - width / 5 + cameraOffsetX;
  camera.y = GROUND_Y - height + GROUND_HEIGHT + cameraOffsetY;
  
  //debug
  if (bottomOfPlayer(player) >= GROUND_Y) {
    // Check if we were previously in the air (to only trigger once per landing)
    if (!player.isGrounded && gameStarted) {
      loseCupcake(); // Lose a cupcake when landing (only during gameplay)
    }
    
    player.y = GROUND_Y - player.height;
    player.velocityY = 0;
    player.isGrounded = true;
    player.isDiving = false;
    player.isSpinning = false;
    player.spinVelocity = 0;
    player.hasDoubleJumped = false; // Reset double jump when landing
    jumpHoldTime = 0;
  } else {
    player.isGrounded = false;
  }
  
  drawPlayerShadow();
  drawPlayer();
  
  ctx.restore(); // Restore camera rotation
  
  // Draw UI elements (after camera restore so they're not affected by camera)
  if (gameStarted && !gameOver) {
    drawCupcakeUI();
  }
  
  // Draw title screen overlay
  if (!gameStarted) {
    drawTitleScreen();
  }
  
  // Draw game over screen
  if (gameOver) {
    drawGameOverScreen();
  }
}

requestAnimationFrame(tick);

function handleJumpStart() {
  // Start the game on first input
  if (!gameStarted) {
    gameStarted = true;
    cupcakeCount = 3; // Reset cupcakes
    return;
  }
  
  // Restart game if game over
  if (gameOver) {
    gameOver = false;
    gameStarted = true;
    cupcakeCount = 3;
    score = 0;
    // Reset player position
    player.x = 50;
    player.y = GROUND_Y;
    player.velocityX = 0;
    player.velocityY = 0;
    player.isGrounded = true;
    player.isDiving = false;
    player.angle = 0;
    player.hasDoubleJumped = false;
    return;
  }
  
  if (!jumpPressed && !gameOver) {
    jumpPressed = true;
    const currentTime = performance.now();
    
    if (player.isGrounded) {
      // Regular jump from ground
      player.velocityY = JUMP_FORCE;
      player.isGrounded = false;
      player.hasDoubleJumped = false;
      lastJumpTime = currentTime;
    } else {
      // Check for double jump (quick succession taps while in air)
      const timeSinceLastJump = currentTime - lastJumpTime;
      if (timeSinceLastJump < DOUBLE_JUMP_WINDOW && !player.hasDoubleJumped && !player.isDiving) {
        // Double jump!
        player.velocityY = DOUBLE_JUMP_FORCE;
        player.hasDoubleJumped = true;
        player.isSpinning = true;
        player.spinVelocity = 0.3;
        lastJumpTime = currentTime;
      } else {
        // Regular dive toggle logic
        if (player.isDiving) {
          player.isDiving = false;
        } else {
          player.isDiving = true;
          player.velocityY = Math.max(player.velocityY, 2);
          player.velocityX = DIVE_SPEED;
        }
        lastJumpTime = currentTime;
      }
    }
  }
}

function handleJumpEnd() {
  jumpPressed = false;
  jumpHoldTime = 0;
  if (!player.isGrounded && player.isDiving) {
    player.isDiving = false;
  }
}

// Keyboard controls
window.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === " ") {
    e.preventDefault();
    handleJumpStart();
  }
});

window.addEventListener("keyup", (e: KeyboardEvent) => {
  if (e.key === " ") {
    e.preventDefault();
    handleJumpEnd();
  }
});

// Mouse controls
window.addEventListener("mousedown", (e: MouseEvent) => {
  e.preventDefault();
  handleJumpStart();
});

window.addEventListener("mouseup", (e: MouseEvent) => {
  e.preventDefault();
  handleJumpEnd();
});

// Touch controls
window.addEventListener("touchstart", (e: TouchEvent) => {
  e.preventDefault();
  handleJumpStart();
}, { passive: false });

window.addEventListener("touchend", (e: TouchEvent) => {
  e.preventDefault();
  handleJumpEnd();
}, { passive: false });

window.addEventListener("touchcancel", (e: TouchEvent) => {
  e.preventDefault();
  handleJumpEnd();
}, { passive: false });

// Prevent context menu and other gestures
window.addEventListener("contextmenu", (e: Event) => {
  e.preventDefault();
});

window.addEventListener("selectstart", (e: Event) => {
  e.preventDefault();
});

window.addEventListener("dragstart", (e: Event) => {
  e.preventDefault();
});
