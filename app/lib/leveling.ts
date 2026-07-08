export function calculateLevel(totalXP: number): number {
  return Math.floor(totalXP / 100) + 1;
}

export function xpForCurrentLevel(level: number): number {
  return (level - 1) * 100;
}

export function xpForNextLevel(level: number): number {
  return level * 100;
}

export function currentLevelXP(totalXP: number): number {
  return totalXP % 100;
}