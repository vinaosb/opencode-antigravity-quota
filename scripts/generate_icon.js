const PImage = require('pureimage');
const fs = require('fs');

const width = 128;
const height = 128;
const outPath = 'icon.png';

async function draw() {
  const img = PImage.make(width, height);
  const ctx = img.getContext('2d');

  // Transparent background
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = 60; // leave padding for 3px stroke
  const strokeWidth = 3;

  const segments = [0.4, 0.3, 0.3];
  const colors = ['#007ACC', '#4FC1FF', '#007ACC'];

  let start = -Math.PI / 2; // start at top to match SVG
  for (let i = 0; i < segments.length; i++) {
    const ang = segments[i] * 2 * Math.PI;
    const end = start + ang;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end, false);
    ctx.closePath();

    ctx.fillStyle = colors[i];
    ctx.fill();

    ctx.strokeStyle = colors[i];
    ctx.lineWidth = strokeWidth;
    ctx.stroke();

    start = end;
  }

  // Center circle (donut look) as in SVG
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.fillStyle = '#007ACC';
  ctx.fill();
  ctx.strokeStyle = '#007ACC';
  ctx.lineWidth = 2;
  ctx.stroke();

  await PImage.encodePNGToStream(img, fs.createWriteStream(outPath));
  console.log('Wrote', outPath);
}

draw().catch(err => {
  console.error(err);
  process.exit(1);
});
