
import React, { useState, useEffect, useRef } from 'react';
import { Runner, RaceStatus } from './types';
import RaceScene from './components/RaceScene';
import { getRaceCommentary } from './services/geminiService';

const COLORS = [
  '#ff4d4d', '#ff944d', '#ffdb4d', '#4dff4d', '#4dffff', 
  '#4d94ff', '#944dff', '#db4dff', '#ff4db8', '#ff4d4d',
  '#c0c0c0', '#ffd700', '#cd7f32', '#00ff7f', '#00bfff'
];

const App: React.FC = () => {
  const [participantCount, setParticipantCount] = useState<number>(40);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [status, setStatus] = useState<RaceStatus>(RaceStatus.IDLE);
  const [commentary, setCommentary] = useState<string>("그랜드 스타디움에 오신 것을 환영합니다!");
  const finishOrderRef = useRef<number[]>([]);
  const raceStartTimeRef = useRef<number>(0);
  
  const runnersRef = useRef<Runner[]>([]);
  useEffect(() => {
    runnersRef.current = runners;
  }, [runners]);

  const initRace = () => {
    const newRunners: Runner[] = Array.from({ length: participantCount }, (_, i) => {
      const baseSpeed = 0.0007 + (Math.random() * 0.00035); // 속도 편차를 약간 늘려 드라마틱하게

      return {
        id: i + 1,
        color: COLORS[i % COLORS.length],
        progress: 0,
        lane: i % 10,
        laneOffset: (Math.random() - 0.5) * 0.8,
        speed: 0,
        baseSpeed: baseSpeed,
        finished: false,
        isResting: false,
        stopProgress: 1.01 + (Math.random() * 0.05),
        bobOffset: Math.random() * Math.PI * 2,
        boosterEndTime: 0
      };
    });
    setRunners(newRunners);
    setStatus(RaceStatus.IDLE);
    setCommentary("선수들 출발선에 정렬했습니다. 무작위 대진표가 확정되었습니다!");
    finishOrderRef.current = [];
  };

  useEffect(() => {
    initRace();
  }, [participantCount]);

  const startRace = () => {
    if (status === RaceStatus.RACING) return;
    const now = Date.now();
    raceStartTimeRef.current = now;
    setRunners(prev => prev.map(r => ({ 
      ...r, 
      progress: 0, 
      finished: false, 
      isResting: false,
      rank: undefined, 
      finishTime: undefined,
      speed: r.baseSpeed,
      boosterEndTime: 0
    })));
    finishOrderRef.current = [];
    setStatus(RaceStatus.RACING);
    setCommentary("출발! 영광을 향한 질주가 시작되었습니다!");
  };

  useEffect(() => {
    let interval: number;
    let commentaryInterval: number;

    if (status === RaceStatus.RACING) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const elapsed = now - raceStartTimeRef.current;

        setRunners(prev => {
          const allResting = prev.every(r => r.isResting);
          if (allResting) {
            setStatus(RaceStatus.FINISHED);
            clearInterval(interval);
            clearInterval(commentaryInterval);
            return prev;
          }

          return prev.map((runner) => {
            if (runner.isResting) return runner;

            let currentSpeed = runner.baseSpeed + (Math.sin(now * 0.0012 + runner.id) * 0.00005);
            let nextLane = runner.lane;
            let nextLaneOffset = runner.laneOffset;

            // 중반 레이스 전략 (4초 후)
            if (elapsed > 4000 && !runner.finished) {
              const isBoosterActive = runner.boosterEndTime && runner.boosterEndTime > now;

              if (isBoosterActive) {
                currentSpeed *= 1.85; 
                const targetLane = 1.2; 
                nextLane = nextLane * 0.9 + targetLane * 0.1;
                nextLaneOffset = nextLaneOffset * 0.9 + 0.1 * 0.1;
              } else {
                const targetLane = 0;
                nextLane = nextLane * 0.94 + targetLane * 0.06;
                const lineOrderOffset = ((runner.id * 7) % 100 / 100 - 0.5) * 0.2;
                nextLaneOffset = nextLaneOffset * 0.94 + lineOrderOffset * 0.06;

                if (Math.random() < 0.007) { // 부스터 확률 소폭 상승
                  runner.boosterEndTime = now + 5000;
                }
              }
            } else if (runner.finished) {
              currentSpeed *= 0.92;
            }

            nextLane = Math.max(0, Math.min(9, nextLane));
            const newProgress = Math.min(runner.stopProgress || 1.1, runner.progress + currentSpeed);
            
            let finished = runner.finished;
            let isResting = runner.isResting;
            let rank = runner.rank;
            let finishTime = runner.finishTime;

            if (newProgress >= 1.0 && !finished) {
              finished = true;
              finishOrderRef.current.push(runner.id);
              rank = finishOrderRef.current.length;
              finishTime = Date.now();
            }

            if (finished && (newProgress >= (runner.stopProgress || 1.05) || currentSpeed < 0.00004)) {
              isResting = true;
            }

            return {
              ...runner,
              progress: newProgress,
              speed: currentSpeed,
              lane: nextLane,
              laneOffset: nextLaneOffset,
              finished,
              isResting,
              rank,
              finishTime,
              boosterEndTime: runner.boosterEndTime
            };
          });
        });
      }, 30);

      // 코멘터리 간격 10초
      commentaryInterval = window.setInterval(async () => {
        if (runnersRef.current.length > 0) {
          const text = await getRaceCommentary(runnersRef.current, RaceStatus.RACING);
          setCommentary(text);
        }
      }, 10000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(commentaryInterval);
    };
  }, [status]);

  const allResults = [...runners]
    .filter(r => r.rank !== undefined)
    .sort((a, b) => (a.rank || 0) - (b.rank || 0));

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505] text-white select-none font-sans">
      <RaceScene runners={runners} status={status} />

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-20">
        <div className="p-6 flex justify-between items-start">
          <div className="pointer-events-auto flex gap-3 drop-shadow-2xl">
            <div className="bg-[#cc0000] px-6 py-3 rounded-l-2xl border-r-2 border-white/20 flex flex-col justify-center items-center">
              <span className="text-white font-black italic text-3xl leading-none">LIVE</span>
            </div>
            <div className="bg-black/90 backdrop-blur-xl px-8 py-3 rounded-r-2xl border border-white/10">
              <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
                3D <span className="text-yellow-400">FINISH CAM</span>
              </h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Stadium Simulator</span>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-4">
             <div className="bg-black/90 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 flex items-center gap-6 shadow-2xl">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Runners</span>
                  <input 
                    type="number"
                    min="1" max="100"
                    value={participantCount}
                    disabled={status === RaceStatus.RACING}
                    onChange={(e) => setParticipantCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white w-24 text-center text-xl font-black focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>
                <button 
                  onClick={startRace}
                  disabled={status === RaceStatus.RACING}
                  className={`px-10 py-4 rounded-xl font-black uppercase transition-all transform active:scale-95 ${
                    status === RaceStatus.RACING
                      ? 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                      : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                  }`}
                >
                  START RACE
                </button>
             </div>
          </div>
        </div>

        <div className="p-6 flex flex-col md:flex-row gap-6 items-end justify-between">
          <div className="pointer-events-auto w-full md:w-[600px] bg-yellow-400 text-slate-950 p-5 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="bg-slate-950 text-white px-3 py-1 rounded-lg font-black text-xs italic tracking-tighter uppercase shrink-0">Broadcast</div>
            <p className="text-xl font-black italic uppercase tracking-tight flex-1 truncate">{commentary}</p>
          </div>

          {status === RaceStatus.FINISHED && (
            <div className="pointer-events-auto w-full max-w-xl bg-black/95 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col max-h-[75vh]">
              <div className="text-center mb-6">
                <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter">FINAL <span className="text-yellow-400">WINNERS</span></h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Multi-angle Replay Complete</p>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {allResults.map((runner, i) => (
                  <div key={runner.id} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${i === 0 ? 'bg-yellow-400 text-slate-950 border-white scale-105 shadow-lg' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black italic">#{i + 1}</span>
                      <span className="text-xl font-black uppercase italic">ATHLETE {runner.id}</span>
                    </div>
                    <div className="w-10 h-10 rounded-lg shadow-inner border border-black/10" style={{ backgroundColor: runner.color }} />
                  </div>
                ))}
              </div>
              <button onClick={initRace} className="mt-6 w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-yellow-400 transition-all uppercase text-xl shadow-xl">Reset Stadium</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
