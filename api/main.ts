import { createCanvas, loadImage } from 'canvas';
import type { CanvasRenderingContext2D } from 'canvas';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const username = searchParams.get('username');
    if (!username) {
      return new Response('Username not provided!', {
        status: 400,
      });
    }

    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&period=7days&api_key=${Bun.env.API_KEY}&format=json`,
    );

    const json = await res.json();

    const albums = json.topalbums.album.map((album) => {
      return {
        name: album.name,
        image: album.image[2]['#text'],
      };
    });

    const albumSize = 200;
    const albumsPerRow = 10;
    const albumsPerCol = 5;

    const width = 2560;
    const height = 1664;
    const cornerRadius = 25; // Adjust as needed for the roundness

    const xOffset = (width - albumsPerRow * albumSize) / 2;
    const yOffset = (height - albumsPerCol * albumSize) / 2;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Define the rounded rectangle for the entire album area
    drawRoundedRect(
      ctx,
      xOffset,
      yOffset,
      albumsPerRow * albumSize,
      albumsPerCol * albumSize,
      cornerRadius,
    );

    // Clip the canvas to the rounded rectangle
    ctx.clip();

    let currentX = xOffset;
    let currentY = yOffset;

    const notFetched: string[] = [];

    for (const album of albums) {
      try {
        const imageRes = await fetch(album.image);
        const buffer = Buffer.from(await imageRes.arrayBuffer());
        const img = await loadImage(buffer);

        ctx.drawImage(img, currentX, currentY, albumSize, albumSize);
      } catch (e) {
        notFetched.push(album.name);
      }

      currentX += albumSize;

      if (currentX >= xOffset + albumsPerRow * albumSize) {
        currentX = xOffset;
        currentY += albumSize;
      }
    }

    const outBuffer = canvas.toBuffer('image/png');

    // return the image as a PNG
    return new Response(outBuffer, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  },
});
