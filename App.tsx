import React, { useState, useEffect, useRef } from 'react';
import { Runner, RaceStatus } from './types';
import RaceScene from './components/RaceScene';
import { getRaceCommentary } from './services/geminiService';

const COLORS = [
  '#ff4d4d', '#ff944d', '#ffdb4d', '#4dff4d', '#4dffff', 
  '#4d94ff', '#944dff', '#db4dff', '#ff4db8', '#ff4d4d',
  '#c0c0c0', '#ffd700', '#cd7f32', '#00ff7f', '#00bfff'
];

export const getLottoColor = (num: number) => {
  if (num <= 10) return { bg: '#f59e0b', border: '#d97706', text: '#ffffff' };
  if (num <= 20) return { bg: '#2563eb', border: '#1d4ed8', text: '#ffffff' };
  if (num <= 30) return { bg: '#dc2626', border: '#b91c1c', text: '#ffffff' };
  if (num <= 40) return { bg: '#4b5563', border: '#374151', text: '#ffffff' };
  return { bg: '#16a34a', border: '#15803d', text: '#ffffff' };
};

const SAMPLE_NAMES = [
  '불꽃질주', '총알탄사나이', '바람의아들', '질주본능', '폭풍러너', '우사인볼트',
  '번개발', '스피드킹', '달려라하니', '치타맨', '날쌘돌이', '태풍스프린터',
  '엔진풀가동', '지구력마스터', '황금다리', '돌격대장', '초음속러너', '터보스프린트'
];

const triggerConfetti = () => {
  if (typeof window !== 'undefined' && (window as any).confetti) {
    (window as any).confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      (window as any).confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      (window as any).confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 400);
  }
};

const App: React.FC = () => {
  const [participantCount, setParticipantCount] = useState<number>(45);
  const [isLottoMode, setIsLottoMode] = useState<boolean>(true);
  const [runnerNames, setRunnerNames] = useState<string[]>(Array.from({ length: 45 }, (_, i) => `${i + 1}번`));
  const [runners, setRunners] = useState<Runner[]>([]);
  const [status, setStatus] = useState<RaceStatus>(RaceStatus.IDLE);
  const [commentary, setCommentary] = useState<string>("그랜드 스타디움에 오신 것을 환영합니다!");
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'individual' | 'batch'>('individual');
  const [batchText, setBatchText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const finishOrderRef = useRef<number[]>([]);
  const raceStartTimeRef = useRef<number>(0);

  const updateCommentary = (text: string) => {
    setCommentary(text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.25;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };
  
  const runnersRef = useRef<Runner[]>([]);
  useEffect(() => {
    runnersRef.current = runners;
  }, [runners]);

  const initRace = () => {
    const newRunners: Runner[] = Array.from({ length: participantCount }, (_, i) => {
      const baseSpeed = 0.00065 + (Math.random() * 0.00035);
      const name = runnerNames[i] || `${i + 1}번`;

      let color = COLORS[i % COLORS.length];
      if (isLottoMode || participantCount === 45) {
        color = getLottoColor(i + 1).bg;
      }

      return {
        id: i + 1,
        name: name,
        color: color,
        progress: 0,
        lane: i % 10,
        laneOffset: (Math.random() - 0.5) * 0.8,
        speed: 0,
        baseSpeed: baseSpeed,
        finished: false,
        isResting: false,
        isFallen: false,
        stopProgress: 1.01 + (Math.random() * 0.05),
        bobOffset: Math.random() * Math.PI * 2,
        boosterEndTime: 0
      };
    });
    setRunners(newRunners);
    setStatus(RaceStatus.IDLE);
    updateCommentary(
      isLottoMode || participantCount === 45
        ? "45인의 로또 스프린트 레이스가 준비되었습니다. 6명만 완주합니다!"
        : "선수들이 출발선에 정렬했습니다."
    );
    finishOrderRef.current = [];
  };

  useEffect(() => {
    initRace();
  }, [participantCount, isLottoMode, runnerNames]);

  const handleLaneChange = (count: number) => {
    const clamped = Math.max(2, Math.min(60, count));
    setParticipantCount(clamped);
    if (clamped !== 45) {
      setIsLottoMode(false);
    }
    setRunnerNames(prev => {
      const next = [...prev];
      if (clamped > prev.length) {
        return [...next, ...Array(clamped - prev.length).fill('').map((_, i) => `${prev.length + i + 1}번`)];
      }
      return next.slice(0, clamped);
    });
  };

  const handleSelectLotto = () => {
    setIsLottoMode(true);
    setParticipantCount(45);
    setRunnerNames(Array.from({ length: 45 }, (_, i) => `${i + 1}번`));
  };

  const handleOpenNameModal = () => {
    setBatchText(runnerNames.slice(0, participantCount).map((n, i) => n || `${i + 1}번`).join(', '));
    setShowNameModal(true);
  };

  const handleApplyBatchText = () => {
    const rawNames = batchText
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (rawNames.length > 0) {
      const newNames = Array(participantCount).fill('').map((_, i) => rawNames[i] || `${i + 1}번`);
      setRunnerNames(newNames);
    }
    setShowNameModal(false);
  };

  const handleAutoFillNumbers = () => {
    const names = Array(participantCount).fill('').map((_, i) => `${i + 1}번`);
    setRunnerNames(names);
  };

  const handleRandomizeNames = () => {
    const shuffled = [...SAMPLE_NAMES].sort(() => 0.5 - Math.random());
    const names = Array(participantCount).fill('').map((_, i) => shuffled[i % shuffled.length] + ` ${i + 1}`);
    setRunnerNames(names);
  };

  const startRace = () => {
    if (status === RaceStatus.RACING) return;
    const now = Date.now();
    raceStartTimeRef.current = now;
    setRunners(prev => prev.map(r => ({ 
      ...r, 
      progress: 0, 
      finished: false, 
      isResting: false,
      isFallen: false,
      rank: undefined, 
      finishTime: undefined,
      speed: r.baseSpeed,
      boosterEndTime: 0
    })));
    finishOrderRef.current = [];
    setStatus(RaceStatus.RACING);
    updateCommentary("출발! 6개의 당첨 번호를 향한 전력 질주가 시작되었습니다!");
  };

  useEffect(() => {
    let interval: number;
    let commentaryInterval: number;

    if (status === RaceStatus.RACING) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const elapsed = now - raceStartTimeRef.current;

        setRunners(prev => {
          const targetWinners = (isLottoMode || participantCount === 45) ? 6 : participantCount;

          if (finishOrderRef.current.length >= targetWinners) {
            const finishedState = prev.map(r => {
              const isWinner = finishOrderRef.current.includes(r.id);
              return isWinner ? { ...r, speed: 0, isResting: true } : { ...r, speed: 0, isFallen: true };
            });
            setStatus(RaceStatus.FINISHED);
            clearInterval(interval);
            clearInterval(commentaryInterval);
            triggerConfetti();
            updateCommentary("6명의 우승자가 모두 도착했습니다! 나머지 39명의 선수는 달리던 자리에서 장렬히 쓰러졌습니다!");
            return finishedState;
          }

          const allResting = prev.every(r => r.isResting || r.isFallen);
          if (allResting) {
            setStatus(RaceStatus.FINISHED);
            clearInterval(interval);
            clearInterval(commentaryInterval);
            triggerConfetti();
            return prev;
          }

          return prev.map((runner) => {
            if (runner.isResting || runner.isFallen) return runner;

            let currentSpeed = runner.baseSpeed + (Math.sin(now * 0.0012 + runner.id) * 0.00005);
            let nextLane = runner.lane;
            let nextLaneOffset = runner.laneOffset;

            if (elapsed > 3500 && !runner.finished) {
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

                if (Math.random() < 0.008) {
                  runner.boosterEndTime = now + 4500;
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

      commentaryInterval = window.setInterval(async () => {
        if (runnersRef.current.length > 0) {
          const text = await getRaceCommentary(runnersRef.current, RaceStatus.RACING);
          updateCommentary(text);
        }
      }, 10000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(commentaryInterval);
    };
  }, [status, isLottoMode, participantCount]);

  const allResults = [...runners]
    .filter(r => r.rank !== undefined)
    .sort((a, b) => (a.rank || 0) - (b.rank || 0));

  const sortedWinningNumbers = allResults.slice(0, 6).map(r => r.id).sort((a, b) => a - b);

  const handleCopyNumbers = () => {
    navigator.clipboard.writeText(sortedWinningNumbers.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505] text-white select-none font-sans">
      <RaceScene runners={runners} status={status} />

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-20 p-4 md:p-6">
        
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto flex gap-3 drop-shadow-2xl">
            <div className="bg-[#cc0000] px-5 py-2.5 rounded-l-2xl border-r-2 border-white/20 flex flex-col justify-center items-center">
              <span className="text-white font-black italic text-2xl leading-none">LIVE</span>
            </div>
            <div className="bg-black/90 backdrop-blur-xl px-6 py-2.5 rounded-r-2xl border border-white/10">
              <h1 className="text-xl font-black italic tracking-tighter text-white uppercase leading-none">
                3D <span className="text-yellow-400">LOTTO SPRINT</span>
              </h1>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                {isLottoMode || participantCount === 45 ? '45인 레이스 \u2022 6인 생존 추첨' : '트랙 레이스 시뮬레이터'}
              </span>
            </div>
          </div>

          {/* Top Controls */}
          <div className="pointer-events-auto flex items-center gap-3">
             <div className="bg-black/90 backdrop-blur-xl p-3 rounded-[2rem] border border-white/10 flex items-center gap-3.5 shadow-2xl">
                
                <button
                  onClick={handleSelectLotto}
                  disabled={status === RaceStatus.RACING}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md ${
                    isLottoMode || participantCount === 45
                      ? 'bg-yellow-400 text-slate-950 ring-2 ring-yellow-300'
                      : 'bg-white/10 text-yellow-400 hover:bg-white/20'
                  }`}
                >
                  <span>{'\uD83C\uDFB1'}</span>
                  <span>로또 (45인)</span>
                </button>

                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">인원</span>
                  <input 
                    type="number"
                    min="2" max="60"
                    value={participantCount}
                    disabled={status === RaceStatus.RACING}
                    onChange={(e) => handleLaneChange(parseInt(e.target.value) || 2)}
                    className="bg-transparent text-white w-12 text-center text-base font-black focus:outline-none focus:text-yellow-400 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">명</span>
                </div>

                <button
                  onClick={handleOpenNameModal}
                  disabled={status === RaceStatus.RACING}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-lg shadow-cyan-500/30 active:scale-95 transition-all flex items-center gap-1.5 border border-cyan-300/40"
                >
                  <span>{'\u270D\uFE0F'}</span>
                  <span>이름쓰기 ({participantCount}명)</span>
                </button>

                <button 
                  onClick={startRace}
                  disabled={status === RaceStatus.RACING}
                  className={`px-6 py-2.5 rounded-xl font-black uppercase text-sm transition-all transform active:scale-95 ${
                    status === RaceStatus.RACING
                      ? 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                      : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                  }`}
                >
                  달리기 시작! (GO)
                </button>
             </div>
          </div>
        </div>

        {/* Bottom Commentary & Finished Screen */}
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="pointer-events-auto w-full md:w-[540px] bg-yellow-400 text-slate-950 p-4 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-yellow-300">
            <div className="bg-slate-950 text-white px-2.5 py-1 rounded-lg font-black text-[10px] italic tracking-tighter uppercase shrink-0">중계석</div>
            <p className="text-base font-black italic uppercase tracking-tight flex-1 truncate">{commentary}</p>
          </div>

          {status === RaceStatus.FINISHED && (
            <div className="pointer-events-auto w-full max-w-lg bg-black/95 backdrop-blur-2xl p-6 md:p-7 rounded-[2.5rem] border border-yellow-400/50 shadow-[0_0_80px_rgba(250,204,21,0.3)] flex flex-col max-h-[75vh]">
              
              <div className="text-center mb-4 pb-3 border-b border-white/10">
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">
                  {isLottoMode || participantCount === 45 ? '\uD83C\uDF89 로또 6/45 당첨 번호' : '\uD83C\uDFC6 최종 완주 결과'}
                </h2>
                <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mt-1">
                  {isLottoMode || participantCount === 45 ? '완주 성공 6인 \u2022 행운의 당첨 번호' : '공식 경기 기록'}
                </p>
              </div>

              {(isLottoMode || participantCount === 45) && (
                <div className="mb-4 bg-white/5 p-3.5 rounded-2xl border border-yellow-400/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-black text-yellow-400 uppercase tracking-wider">당첨 번호 6개 (오름차순)</span>
                    <button 
                      onClick={handleCopyNumbers}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold px-2.5 py-1 rounded-md transition-all border border-slate-700"
                    >
                      {copied ? '\u2705 복사 완료' : '\uD83D\uDCCB 번호 복사'}
                    </button>
                  </div>
                  <div className="flex justify-center gap-2">
                    {sortedWinningNumbers.map((num, i) => {
                      const lotto = getLottoColor(num);
                      return (
                        <div 
                          key={i} 
                          style={{ backgroundColor: lotto.bg }}
                          className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-base shadow-lg shadow-black/60 border-2 border-white/50"
                        >
                          {num}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-2.5 max-h-[240px]">
                {allResults.slice(0, (isLottoMode || participantCount === 45) ? 6 : allResults.length).map((runner, i) => {
                  const lotto = getLottoColor(runner.id);
                  return (
                    <div 
                      key={runner.id} 
                      className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${
                        i === 0 
                          ? 'bg-yellow-400 text-slate-950 border-white scale-[1.02] shadow-lg' 
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div 
                          style={{ backgroundColor: lotto.bg }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md border border-white/30 shrink-0"
                        >
                          {runner.id}
                        </div>
                        <div>
                          <span className="font-black uppercase italic text-sm">{runner.name || `${runner.id}번 선수`}</span>
                          <p className={`text-[10px] font-bold ${i === 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                            {i + 1}위 골인
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${i === 0 ? 'bg-slate-950 text-yellow-400' : 'bg-white/10 text-white'}`}>
                        {i === 0 ? '\uD83E\uDD47 1등' : i === 1 ? '\uD83E\uDD48 2등' : i === 2 ? '\uD83E\uDD49 3등' : `${i + 1}등`}
                      </span>
                    </div>
                  );
                })}

                {(isLottoMode || participantCount === 45) && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl text-center">
                    <p className="text-xs font-bold text-red-400">
                      {'\uD83D\uDC80'} 나머지 39명의 선수는 달리던 자리에서 쓰러졌습니다.
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={initRace} 
                className="mt-4 w-full py-4 bg-yellow-400 text-slate-950 font-black rounded-2xl hover:bg-yellow-300 transition-all uppercase text-base shadow-xl active:scale-95"
              >
                새 경기 준비하기 (Next)
              </button>
            </div>
          )}
        </div>
      </div>

      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto">
          <div className="bg-slate-900 border border-yellow-400/40 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-6 md:p-7 flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-white font-black text-xl flex items-center gap-2">
                  <span>{'\u270D\uFE0F'}</span>
                  <span>선수 이름 쓰기 (총 {participantCount}명)</span>
                </h3>
                <p className="text-slate-400 text-xs font-medium mt-1">
                  참가 선수들의 이름을 직접 입력하거나 명단을 한 번에 붙여넣으세요.
                </p>
              </div>
              <button 
                onClick={() => setShowNameModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                {'\u2715'}
              </button>
            </div>

            <div className="flex gap-2 mb-4 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setModalTab('individual')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                  modalTab === 'individual' 
                    ? 'bg-yellow-400 text-slate-950 shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                직접 하나씩 입력
              </button>
              <button
                onClick={() => setModalTab('batch')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                  modalTab === 'batch' 
                    ? 'bg-yellow-400 text-slate-950 shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                일괄 붙여넣기 (쉼표/엔터)
              </button>
            </div>

            {modalTab === 'individual' && (
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar min-h-[220px]">
                {runnerNames.slice(0, participantCount).map((name, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/20 text-yellow-300 font-black text-xs flex items-center justify-center border border-yellow-500/40 shrink-0">
                      {idx + 1}
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        const updated = [...runnerNames];
                        updated[idx] = e.target.value;
                        setRunnerNames(updated);
                      }}
                      placeholder={`${idx + 1}번 선수 이름 입력...`}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-yellow-400 px-3.5 py-2 rounded-xl text-white text-xs font-bold outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>
                ))}
              </div>
            )}

            {modalTab === 'batch' && (
              <div className="flex-1 flex flex-col min-h-[220px]">
                <p className="text-slate-400 text-xs mb-2">
                  쉼표(,), 줄바꿈 등으로 구분된 이름을 붙여넣으세요:
                </p>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder="예: 홍길동, 이순신, 강감찬, 유관순, 김유신, 장보고..."
                  rows={7}
                  className="w-full flex-1 bg-slate-950 border border-slate-700 focus:border-yellow-400 p-3.5 rounded-2xl text-white text-xs font-medium outline-none transition-all placeholder:text-slate-600 resize-none"
                />
                <button
                  onClick={handleApplyBatchText}
                  className="mt-3 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md"
                >
                  명단 파싱하여 적용하기
                </button>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap justify-between items-center gap-2">
              <div className="flex gap-2">
                <button
                  onClick={handleAutoFillNumbers}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition-all"
                >
                  1~{participantCount}번 번호채우기
                </button>
                <button
                  onClick={handleRandomizeNames}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition-all"
                >
                  {'\uD83C\uDFB2'} 랜덤 닉네임
                </button>
              </div>

              <button
                onClick={() => setShowNameModal(false)}
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-yellow-400/20 active:scale-95 transition-all"
              >
                저장 및 닫기
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #eab308; border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ca8a04; }
      `}</style>
    </div>
  );
};

export default App;
