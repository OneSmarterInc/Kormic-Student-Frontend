export function durationForMotion(ms: number, reduceMotion: boolean): number {
  return reduceMotion ? 0 : ms;
}
