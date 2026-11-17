import type { Preferences } from "./preferences";

export type VisualizerState = {
  rings: { born: number; strength: number; hue: number }[];
  lastRing: number;
};
export const createVisualizerState = (): VisualizerState => ({
  rings: [],
  lastRing: -1000,
});
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
  palette?: Preferences["palette"];
  intensity?: number;
  state?: VisualizerState;
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
    sensitivity,
    mode,
  } = frame;
  if (width <= 0 || height <= 0) return;
  const intensity = frame.intensity ?? 1.3;
  const palette = frame.palette ?? "aurora";
  const base = { aurora: 145, fire: 5, candy: 280, rainbow: 0, ice: 185 }[
    palette
  ];
  const span = { aurora: 170, fire: 65, candy: 150, rainbow: 360, ice: 65 }[
    palette
  ];
  const motion = reducedMotion
    ? 0
    : palette === "rainbow"
      ? time * 0.012
      : Math.sin(time * 0.00025) * 12;
  const color = (position: number, alpha = 1) =>
    `hsla(${base + position * span + motion}, 95%, 65%, ${Math.max(0, Math.min(1, alpha))})`;
  const energy =
    frequencies.reduce((sum, value) => sum + value, 0) /
    Math.max(1, frequencies.length * 255);
  const drive = Math.min(1, energy * sensitivity * intensity);
  const centerX = width / 2,
    centerY = height / 2;
  const radius = Math.min(width, height) * 0.18;
  const clock = reducedMotion ? 0 : time / 1000;
  ctx.fillStyle = "#050711";
  ctx.fillRect(0, 0, width, height);

  // Deterministic star positions keep motion continuous and memory bounded.
  for (let index = 0; index < 55; index++) {
    const x =
      (((index * 127.17 + clock * (3 + drive * 15)) % width) + width) % width;
    const y =
      (((index * 79.31 + Math.sin(index) * 65) % height) + height) % height;
    ctx.fillStyle = color(index / 55, 0.15 + drive * 0.4);
    ctx.fillRect(x, y, 1 + drive * 2, 1 + drive * 2);
  }
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    Math.max(width, height) * 0.6,
  );
  gradient.addColorStop(0, color(0.5, 0.06 + drive * 0.15));
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (mode === "waveform") {
    for (let layer = 0; layer < 4; layer++) {
      for (let segment = 0; segment < 32; segment++) {
        ctx.beginPath();
        const start = Math.floor((segment / 32) * waveform.length);
        const end = Math.min(
          waveform.length - 1,
          Math.ceil(((segment + 1) / 32) * waveform.length),
        );
        for (let index = start; index <= end; index++) {
          const x = (index / (waveform.length - 1)) * width;
          const amplitude = (waveform[index] - 128) / 128;
          const offset =
            Math.sin(index / 35 + clock * (layer + 1)) * drive * 18;
          const y =
            centerY +
            amplitude * height * (0.16 + layer * 0.055) * sensitivity +
            (layer - 1.5) * (12 + drive * 20) +
            offset;
          if (index === start) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color(
          segment / 32 + layer * 0.12,
          0.95 - layer * 0.12,
        );
        ctx.lineWidth = 2 + (3 - layer) * drive;
        ctx.stroke();
      }
    }
    return;
  }
  if (mode === "ripple") {
    const state = frame.state ?? createVisualizerState();
    if (
      drive > 0.025 &&
      time - state.lastRing > Math.max(180, 650 - drive * 450)
    ) {
      state.rings.push({
        born: time,
        strength: drive + pulse * 0.4,
        hue: (time % 4000) / 4000,
      });
      state.lastRing = time;
    }
    state.rings = state.rings
      .filter((ring) => time - ring.born < 3000)
      .slice(-18);
    for (const ring of state.rings) {
      const age = reducedMotion ? 0.5 : (time - ring.born) / 3000;
      const reach = 10 + age * Math.hypot(width, height) * 0.65;
      ctx.beginPath();
      for (let point = 0; point <= 96; point++) {
        const angle = (point / 96) * Math.PI * 2;
        const distortion = Math.sin(angle * 9 + clock * 3) * ring.strength * 12;
        const x = centerX + Math.cos(angle) * (reach + distortion);
        const y = centerY + Math.sin(angle) * (reach + distortion) * 0.8;
        if (!point) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color(ring.hue + age * 0.2, (1 - age) * 0.95);
      ctx.lineWidth = 2 + ring.strength * 6 * (1 - age);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8 + drive * 22, 0, Math.PI * 2);
    ctx.fillStyle = color(0.1, 0.7);
    ctx.fill();
    return;
  }
  if (mode === "orbit" || mode === "pulse") {
    const core = radius * (1 + (reducedMotion ? 0 : drive * 0.3 + pulse * 0.2));
    for (let index = 0; index < 96; index++) {
      const angle = (index / 96) * Math.PI * 2 + clock * 0.15;
      const bin = Math.floor((index / 96) * Math.min(128, frequencies.length));
      const length = 3 + (frequencies[bin] / 255) * radius * 0.9 * intensity;
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * core,
        centerY + Math.sin(angle) * core,
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * (core + length),
        centerY + Math.sin(angle) * (core + length),
      );
      ctx.strokeStyle = color(index / 96);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    for (let orbit = 0; orbit < 3; orbit++) {
      ctx.beginPath();
      const rotation = clock * (orbit % 2 ? -0.4 : 0.35) + orbit;
      ctx.ellipse(
        centerX,
        centerY,
        core * (1.2 + orbit * 0.18),
        core * 0.55,
        rotation,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = color(orbit * 0.35, 0.35 + drive * 0.5);
      ctx.lineWidth = 1.5 + pulse * 3;
      ctx.stroke();
    }
    const coreGlow = ctx.createRadialGradient(
      centerX,
      centerY,
      1,
      centerX,
      centerY,
      core,
    );
    coreGlow.addColorStop(0, color(0.1, 0.5 + drive * 0.4));
    coreGlow.addColorStop(1, color(0.8, 0.02));
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, core * 0.9, 0, Math.PI * 2);
    ctx.fill();
    if (mode === "orbit") return;
  }
  const bars = 80;
  for (let index = 0; index < bars; index++) {
    const bin = Math.floor((index / bars) * Math.min(160, frequencies.length));
    const amplitude = Math.min(
      1,
      (frequencies[bin] / 255) * sensitivity * intensity,
    );
    const barHeight = Math.max(
      2,
      amplitude * height * (mode === "spectrum" ? 0.65 : 0.18),
    );
    const gap = width / bars;
    ctx.fillStyle = color(index / bars);
    ctx.fillRect(
      index * gap + 1,
      height - 14 - barHeight,
      Math.max(1, gap - 3),
      barHeight,
    );
    if (mode === "spectrum") {
      ctx.fillStyle = color(index / bars, 0.18);
      ctx.fillRect(
        index * gap + 1,
        height - 12,
        Math.max(1, gap - 3),
        barHeight * 0.18,
      );
      ctx.fillStyle = "#ffffffcc";
      ctx.fillRect(
        index * gap + 1,
        height - 18 - barHeight,
        Math.max(1, gap - 3),
        2,
      );
    }
  }
}
