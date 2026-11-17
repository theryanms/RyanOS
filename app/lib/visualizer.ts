import type { Preferences } from "./preferences";

export type VisualizerFrame = {
  width: number;
  height: number;
  frequencies: Uint8Array;
  waveform: Uint8Array;
  pulse: number;
  time: number;
  reducedMotion: boolean;
  hue: number;
  sensitivity: number;
  mode: Preferences["visualizer"];
};

export function drawVisualizer(
  ctx: CanvasRenderingContext2D,
  frame: VisualizerFrame,
) {
  const {
    width,
    height,
    frequencies,
    waveform,
    pulse,
    time,
    reducedMotion,
    hue,
    sensitivity,
    mode,
  } = frame;
  if (width <= 0 || height <= 0) return;
  ctx.fillStyle = "#080b18";
  ctx.fillRect(0, 0, width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.18;

  if (mode === "waveform") {
    ctx.beginPath();
    for (let index = 0; index < waveform.length; index++) {
      const x = (index / (waveform.length - 1)) * width;
      const amplitude = (waveform[index] - 128) / 128;
      const y =
        centerY +
        Math.max(-1, Math.min(1, amplitude * sensitivity)) * height * 0.4;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsl(${hue}, 85%, 72%)`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    return;
  }

  if (mode === "orbit") {
    const rotation = reducedMotion ? 0 : time * 0.00015;
    for (let index = 0; index < 64; index++) {
      const angle = (index / 64) * Math.PI * 2 + rotation;
      const energy = frequencies[index] / 255;
      const length = 3 + Math.min(1, energy * sensitivity) * radius * 0.9;
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * (radius + length),
        centerY + Math.sin(angle) * (radius + length),
      );
      ctx.strokeStyle = `hsl(${hue + index}, 85%, 65%)`;
      ctx.lineWidth = Math.max(2, width / 180);
      ctx.stroke();
    }
    return;
  }

  if (mode === "ripple") {
    for (let index = 1; index <= 6; index++) {
      const expansion = reducedMotion ? 0 : pulse * 15 * index;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        radius * index * 0.5 + expansion,
        radius * index * 0.35 + expansion,
        0,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = `hsla(${hue + index * 10}, 85%, 70%, ${0.75 - index * 0.09 + pulse * 0.2})`;
      ctx.lineWidth = 2 + pulse * 2;
      ctx.stroke();
    }
    return;
  }

  if (mode === "pulse") {
    const reactiveRadius = radius * (1 + (reducedMotion ? 0 : pulse * 0.4));
    const glow = ctx.createRadialGradient(
      centerX,
      centerY,
      reactiveRadius * 0.2,
      centerX,
      centerY,
      reactiveRadius * 2.5,
    );
    glow.addColorStop(0, `hsla(${hue}, 85%, 65%, ${0.2 + pulse * 0.4})`);
    glow.addColorStop(1, `hsla(${hue + 60}, 85%, 65%, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(centerX, centerY, reactiveRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 90%, 78%, ${0.4 + pulse * 0.6})`;
    ctx.lineWidth = 3 + pulse * 5;
    ctx.stroke();
  }

  const bars = 64;
  const gap = width / bars;
  for (let index = 0; index < bars; index++) {
    const energy = Math.min(1, (frequencies[index] / 255) * sensitivity);
    const barHeight = Math.max(
      2,
      energy * height * (mode === "spectrum" ? 0.8 : 0.3),
    );
    ctx.fillStyle = `hsl(${hue + index}, 80%, ${45 + energy * 25}%)`;
    ctx.fillRect(
      index * gap + 1,
      height - 12 - barHeight,
      Math.max(1, gap - 3),
      barHeight,
    );
  }
}
