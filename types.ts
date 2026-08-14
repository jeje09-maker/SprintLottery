export interface Runner {
  id: number;
  name?: string;
  color: string;
  progress: number; // 0 to 1
  lane: number;
  laneOffset: number; 
  speed: number;
  baseSpeed: number;
  finished: boolean;
  finishTime?: number;
  rank?: number;
  bobOffset: number; 
  isResting?: boolean;
  isFallen?: boolean; // 달리던 자리에서 쓰러짐
  stopProgress?: number;
  boosterEndTime?: number;
}

export enum RaceStatus {
  IDLE = 'IDLE',
  PREPARING = 'PREPARING',
  RACING = 'RACING',
  FINISHED = 'FINISHED'
}
