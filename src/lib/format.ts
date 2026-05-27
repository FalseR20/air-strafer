export const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
};

export const formatSeconds = (milliseconds: number) =>
  `${(Math.max(0, milliseconds) / 1000).toFixed(2)}s`;
