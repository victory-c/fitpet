// The pluggable fitness-source adapter. The pet never knows where data came from.
// V1 ships a ManualSource (hand-testing) and, in Phase 4, a GarminSource. Later
// HTTP/OAuth sources (e.g. WHOOP) would add a networked variant of this interface.

export interface Activity {
  date: string; // ISO
  durationMin: number;
  sport: string;
  effort?: number; // optional native per-activity training load
}

export interface FitnessSnapshot {
  activities: Activity[];
  windowDays: number;
  // Optional native rolling-window training load (e.g. Garmin ATL). When present it is
  // used directly as the window load, avoiding per-activity math.
  windowLoad?: number;
}

export interface FitnessSource {
  id: string;
  loadGoal: number; // window load that maps to a full 100 score (calibrated per source)
  normalize(raw: unknown): FitnessSnapshot;
}
