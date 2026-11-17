export function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

export async function captureDisplayAudio(
  devices: Pick<MediaDevices, "getDisplayMedia"> | undefined,
) {
  if (!devices?.getDisplayMedia)
    throw Error(
      "Shared device audio is unavailable in this browser. Try desktop Chrome or Edge, or use an audio file or microphone.",
    );
  const options: DisplayMediaStreamOptions & {
    systemAudio: "include";
    selfBrowserSurface: "exclude";
  } = {
    video: true,
    audio: true,
    systemAudio: "include",
    selfBrowserSurface: "exclude",
  };
  const stream = await devices.getDisplayMedia(options);
  if (!stream.getAudioTracks().some((track) => track.readyState === "live")) {
    stopStream(stream);
    throw Error(
      "The selected source supplied no audio. Share a playing browser tab and enable Share audio, or choose an audio file or microphone.",
    );
  }
  return stream;
}
