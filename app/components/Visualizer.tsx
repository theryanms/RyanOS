"use client";

import { useEffect, useRef, useState } from "react";
import { themes, visualizerModes, type Preferences } from "../lib/preferences";
import { drawVisualizer } from "../lib/visualizer";

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
    mic?: MediaStreamAudioSourceNode;
    stream?: MediaStream;
  } | null>(null);
  const objectURL = useRef("");
  const request = useRef(0);
  const [source, setSource] = useState("");
  const [filename, setFilename] = useState("");
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
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      engine.current = { context, analyser };
    }
    return engine.current;
  }
  function stopMicrophone() {
    request.current++;
    engine.current?.stream?.getTracks().forEach((t) => t.stop());
    engine.current?.mic?.disconnect();
    if (engine.current) {
      engine.current.stream = undefined;
      engine.current.mic = undefined;
    }
    setSource("");
  }
  function loadFile(file: File) {
    stopMicrophone();
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
      setSource("file");
      setMessage("Reacting to the bass and energy of your audio.");
    } catch {
      setMessage(
        "Audio analysis could not start. Try a supported browser and another audio file.",
      );
    }
  }
  async function startMicrophone() {
    stopMicrophone();
    audioRef.current?.pause();
    engine.current?.file?.disconnect();
    const token = request.current;
    try {
      const current = getEngine();
      await current.context.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
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
      current.stream = stream;
      current.mic = current.context.createMediaStreamSource(stream);
      current.mic.connect(current.analyser);
      setSource("mic");
      setMessage(
        "Microphone active. Play music nearby. Stop releases the microphone.",
      );
    } catch {
      if (request.current === token)
        setMessage(
          "Microphone access failed. Allow access in your browser, or choose an audio file.",
        );
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
    const bins = new Uint8Array(128);
    const waveform = new Uint8Array(256);
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
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const current = engine.current;
      bins.fill(0);
      waveform.fill(128);
      if (current) {
        current.analyser.getByteFrequencyData(bins);
        current.analyser.getByteTimeDomainData(waveform);
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
        reducedMotion: reduced.matches,
        hue: themes[settings.current.theme].hue,
        sensitivity: settings.current.sensitivity,
        mode: settings.current.visualizer,
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
    <section className="panel space-y-5">
      <div>
        <h2>Music Visualizer</h2>
        <p className="muted">
          Choose a style. Switch while your music keeps playing.
        </p>
      </div>
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
        className="h-80 w-full rounded-2xl border border-cyan-300/20"
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
          stopMicrophone();
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
          disabled={source === "mic"}
          onClick={() => void startMicrophone()}
        >
          Use microphone
        </button>
        <button
          className="action"
          onClick={() => {
            stopMicrophone();
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
      <p className="notice" role="status">
        {message}
      </p>
    </section>
  );
}
