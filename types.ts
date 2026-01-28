
export interface Runner {
  id: number;
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
  stopProgress?: number;
  boosterEndTime?: number; // 부스터가 종료될 타임스탬프
}

export enum RaceStatus {
  IDLE = 'IDLE',
  PREPARING = 'PREPARING',
  RACING = 'RACING',
  FINISHED = 'FINISHED'
}
