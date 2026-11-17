"use client";

import { useEffect, useRef, useState } from "react";
import {
  palettes,
  visualizerModes,
  type Preferences,
} from "../lib/preferences";
import { createVisualizerState, drawVisualizer } from "../lib/visualizer";
import { captureDisplayAudio, stopStream } from "../lib/audio-capture";

export default function Visualizer({
  preferences,
  onChange,
}: {
  preferences: Preferences;
  onChange: (value: Preferences) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const engine = useRef<{
    context: AudioContext;
    analyser: AnalyserNode;
    file?: MediaElementAudioSourceNode;
    input?: MediaStreamAudioSourceNode;
    stream?: MediaStream;
  } | null>(null);
  const objectURL = useRef("");
  const request = useRef(0);
  const [source, setSource] = useState("");
  const [filename, setFilename] = useState("");
  const [demo, setDemo] = useState(false);
  const demoRef = useRef(false);
  const stageRef = useRef<HTMLElement>(null);
  const [message, setMessage] = useState(
    "Choose an audio file or enable your microphone to begin.",
  );
  const settings = useRef(preferences);
  useEffect(() => {
    settings.current = preferences;
  }, [preferences]);

  function getEngine() {
    if (!engine.current) {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      engine.current = { context, analyser };
    }
    return engine.current;
  }
  function stopCapture() {
    request.current++;
    engine.current?.stream?.getTracks().forEach((t) => t.stop());
    engine.current?.input?.disconnect();
    if (engine.current) {
      engine.current.stream = undefined;
      engine.current.input = undefined;
    }
    setSource("");
  }
  function attachLiveInput(
    current: NonNullable<typeof engine.current>,
    stream: MediaStream,
    token: number,
    kind: "mic" | "shared",
  ) {
    current.stream = stream;
    current.input = current.context.createMediaStreamSource(
      new MediaStream(stream.getAudioTracks()),
    );
    current.input.connect(current.analyser);
    demoRef.current = false;
    setDemo(false);
    setSource(kind);
    stream.getTracks().forEach((track) =>
      track.addEventListener("ended", () => {
        if (request.current !== token || engine.current?.stream !== stream)
          return;
        stopCapture();
        setMessage(
          kind === "shared"
            ? "Audio sharing ended. Choose an input to continue."
            : "Microphone input ended. Reconnect it or choose another input.",
        );
      }),
    );
  }
  function loadFile(file: File) {
    stopCapture();
    audioRef.current?.pause();
    if (objectURL.current) URL.revokeObjectURL(objectURL.current);
    objectURL.current = URL.createObjectURL(file);
    setFilename(file.name);
    if (audioRef.current) {
      audioRef.current.src = objectURL.current;
      audioRef.current.load();
    }
    setMessage(
      "Press play to animate to your audio. Files stay on your device.",
    );
  }
  async function playFile() {
    try {
      const current = getEngine();
      await current.context.resume();
      if (!current.file && audioRef.current)
        current.file = current.context.createMediaElementSource(
          audioRef.current,
        );
      current.file?.disconnect();
      current.file?.connect(current.analyser);
      current.file?.connect(current.context.destination);
      demoRef.current = false;
      setDemo(false);
      setSource("file");
      setMessage("Reacting to the bass and energy of your audio.");
    } catch {
      setMessage(
        "Audio analysis could not start. Try a supported browser and another audio file.",
      );
    }
  }
  async function startMicrophone() {
    stopCapture();
    audioRef.current?.pause();
    engine.current?.file?.disconnect();
    const token = request.current;
    let stream: MediaStream | undefined;
    try {
      const current = getEngine();
      await current.context.resume();
      if (request.current !== token) return;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (request.current !== token) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      attachLiveInput(current, stream, token, "mic");
      setMessage(
        "Microphone active. Play music nearby. Stop releases the microphone.",
      );
    } catch {
      if (stream) stopStream(stream);
      if (request.current === token) {
        stopCapture();
        setMessage(
          "Microphone access failed. Allow access in your browser, or choose an audio file.",
        );
      }
    }
  }
  async function startSharedAudio() {
    stopCapture();
    audioRef.current?.pause();
    engine.current?.file?.disconnect();
    const token = request.current;
    let stream: MediaStream | undefined;
    try {
      const current = getEngine();
      // Both requests begin in the click handler to retain browser user activation.
      const [capture, resume] = await Promise.allSettled([
        captureDisplayAudio(navigator.mediaDevices),
        current.context.resume(),
      ]);
      if (capture.status === "rejected") throw capture.reason;
      stream = capture.value;
      if (resume.status === "rejected") throw resume.reason;
      if (request.current !== token) {
        stopStream(stream);
        return;
      }
      attachLiveInput(current, stream, token, "shared");
      setMessage(
        "Listening to shared audio. The browser sharing indicator stays active until you press Stop or stop sharing.",
      );
    } catch (error) {
      if (stream) stopStream(stream);
      if (request.current === token) {
        stopCapture();
        setMessage(
          error instanceof Error &&
            error.name !== "NotAllowedError" &&
            error.name !== "AbortError"
            ? error.message
            : "Audio sharing was cancelled or blocked. Try again and enable Share audio, or use a file or microphone.",
        );
      }
    }
  }
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let pulse = 0;
    let average = 0;
    let lastBeat = 0;
    let disabledDrawn = false;
    const bins = new Uint8Array(256);
    const waveform = new Uint8Array(512);
    const animation = createVisualizerState();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function draw(time: number) {
      if (!canvas || !ctx) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      if (
        canvas.width !== Math.round(width * ratio) ||
        canvas.height !== Math.round(height * ratio)
      ) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        disabledDrawn = false;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!settings.current.effectsEnabled && disabledDrawn) {
        frame = requestAnimationFrame(draw);
        return;
      }
      disabledDrawn = !settings.current.effectsEnabled;
      const current = engine.current;
      bins.fill(0);
      waveform.fill(128);
      if (current) {
        current.analyser.getByteFrequencyData(bins);
        current.analyser.getByteTimeDomainData(waveform);
      }
      if (demoRef.current) {
        for (let index = 0; index < bins.length; index++)
          bins[index] = Math.max(
            0,
            Math.min(
              255,
              (Math.sin(time / 220 + index * 0.1) * 0.5 + 0.5) *
                190 *
                Math.exp(-index / 160) +
                Math.pow(Math.sin(time / 330), 8) * 55,
            ),
          );
        for (let index = 0; index < waveform.length; index++)
          waveform[index] =
            128 +
            Math.sin(index / 12 + time / 150) *
              (25 + Math.pow(Math.sin(time / 330), 8) * 75);
      }
      if (!settings.current.effectsEnabled) {
        bins.fill(0);
        waveform.fill(128);
        pulse = 0;
      }
      const bass = bins.slice(1, 12).reduce((a, b) => a + b, 0) / (11 * 255);
      average = average * 0.94 + bass * 0.06;
      if (bass > Math.max(0.12, average * 1.12) && time - lastBeat > 220) {
        pulse = Math.min(1, bass * settings.current.sensitivity);
        lastBeat = time;
      }
      pulse *= 0.94;
      drawVisualizer(ctx, {
        width,
        height,
        frequencies: bins,
        waveform,
        pulse,
        time,
        reducedMotion:
          reduced.matches ||
          settings.current.reducedMotion ||
          !settings.current.effectsEnabled,
        hue: 0,
        sensitivity: settings.current.sensitivity,
        mode: settings.current.visualizer,
        palette: settings.current.palette,
        intensity: settings.current.intensity,
        state: animation,
      });
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      // This counter invalidates microphone requests still awaiting permission.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      request.current++;
      engine.current?.stream?.getTracks().forEach((t) => t.stop());
      void engine.current?.context.close();
      engine.current = null;
      if (objectURL.current) URL.revokeObjectURL(objectURL.current);
    };
  }, []);
  return (
    <section ref={stageRef} className="panel visualizer-stage space-y-5">
      <div>
        <h2>Music Visualizer</h2>
        <p className="muted">
          Choose a style. Switch while your music keeps playing.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-40 flex-1">
          Palette
          <select
            value={preferences.palette}
            onChange={(e) =>
              onChange({
                ...preferences,
                palette: e.target.value as Preferences["palette"],
              })
            }
          >
            {Object.entries(palettes).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="action"
          aria-pressed={demo}
          onClick={() => {
            demoRef.current = !demo;
            setDemo(!demo);
          }}
        >
          {demo ? "Stop demo" : "Preview with demo audio"}
        </button>
        <button
          className="action"
          onClick={() => {
            const stage = stageRef.current;
            if (document.fullscreenElement) void document.exitFullscreen();
            else if (stage?.requestFullscreen)
              void stage
                .requestFullscreen()
                .catch(() =>
                  setMessage("Full screen is unavailable in this browser."),
                );
          }}
        >
          Full screen
        </button>
      </div>
      {demo && (
        <p className="notice">
          Demo signal active. Disable demo to watch your audio input.
        </p>
      )}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Visualizer style"
      >
        {Object.entries(visualizerModes).map(([id, label]) => (
          <button
            className={`tab ${preferences.visualizer === id ? "selected" : ""}`}
            aria-pressed={preferences.visualizer === id}
            key={id}
            onClick={() =>
              onChange({
                ...preferences,
                visualizer: id as Preferences["visualizer"],
              })
            }
          >
            {label}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="visualizer-canvas w-full rounded-2xl border border-cyan-300/20"
        aria-label={`${visualizerModes[preferences.visualizer]} audio-reactive visualization`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Audio file
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadFile(file);
            }}
          />
        </label>
        <label>
          Beat sensitivity · {preferences.sensitivity.toFixed(1)}×
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={preferences.sensitivity}
            onChange={(e) => {
              const value = Number(e.target.value);
              onChange({ ...preferences, sensitivity: value });
            }}
          />
        </label>
      </div>
      {filename && <p className="text-sm break-all">{filename}</p>}
      <audio
        ref={audioRef}
        controls
        className="w-full"
        onPlay={() => {
          stopCapture();
          void playFile();
        }}
        onError={() =>
          setMessage(
            "This file could not be played. Try MP3, WAV, or another browser-supported format.",
          )
        }
      />
      <div className="flex flex-wrap gap-3">
        <button
          className="action"
          disabled={source === "shared"}
          onClick={() => void startSharedAudio()}
        >
          Use tab / system audio
        </button>
        <button
          className="action"
          disabled={source === "mic"}
          onClick={() => void startMicrophone()}
        >
          Use microphone
        </button>
        <button
          className="action"
          onClick={() => {
            stopCapture();
            audioRef.current?.pause();
            engine.current?.file?.disconnect();
            setMessage(
              "Stopped. Press play or enable the microphone to resume.",
            );
          }}
        >
          Stop
        </button>
      </div>
      <p className="muted">
        For audio already playing on this computer, choose a playing tab or
        screen and enable Share audio. Availability depends on your browser and
        operating system. The browser supplies a screen-sharing stream, and only
        its audio feeds the visualizer. Input stays on this device. On phones,
        use a file or microphone when shared audio is unavailable.
      </p>
      <p className="notice" role="status">
        {message}
      </p>
    </section>
  );
}
