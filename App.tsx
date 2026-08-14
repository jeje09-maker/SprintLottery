import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  '\uBD88\uAF43\uC9C8\uC8FC', '\uCD1D\uC54C\uD0C4\uC0AC\uB098\uC774', '\uBC14\uB78C\uC758\uC544\uB4E4', '\uC9C8\uC8FC\uBCF8\uB2A5', '\uD3ED\uD48D\uB7EC\uB108', '\uC6B0\uC0AC\uC778\uBCFC\uD2B8',
  '\uBC88\uAC1C\uBC1C', '\uC2A4\uD53C\uB4DC\uD0B9', '\uB2EC\uB824\uB77C\uD558\uB2C8', '\uCE58\uD0C0\uB9E8', '\uB0A0\uC308\uB3CC\uC774', '\uD0DC\uD48D\uC2A4\uD504\uB9B0\uD130',
  '\uC5D4\uC9C4\uD480\uAC00\uB3D9', '\uC9C0\uAD6C\uB825\uB9C8\uC2A4\uD130', '\uD669\uAE08\uB2E4\uB9AC', '\uB3CC\uACA9\uB300\uC7A5', '\uCD08\uC74C\uC18D\uB7EC\uB108', '\uD130\uBCF4\uC2A4\uD504\uB9B0\uD2B8'
];

const triggerConfetti = () => {
  if (typeof window !== 'undefined' && (window as any).confetti) {
    (window as any).confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => {
      (window as any).confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } });
      (window as any).confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } });
    }, 400);
  }
};

// ============ Enhanced TTS Voice Engine ============
// Select the most natural-sounding Korean voice available
const getBestKoreanVoice = (): SpeechSynthesisVoice | null => {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  
  // Priority order: Google > Microsoft > Apple > any Korean voice
  const priorities = [
    (v: SpeechSynthesisVoice) => v.lang.startsWith('ko') && v.name.toLowerCase().includes('google'),
    (v: SpeechSynthesisVoice) => v.lang.startsWith('ko') && v.name.toLowerCase().includes('microsoft') && v.name.toLowerCase().includes('online'),
    (v: SpeechSynthesisVoice) => v.lang.startsWith('ko') && v.name.toLowerCase().includes('microsoft'),
    (v: SpeechSynthesisVoice) => v.lang.startsWith('ko') && !v.localService,
    (v: SpeechSynthesisVoice) => v.lang.startsWith('ko'),
  ];

  for (const check of priorities) {
    const found = voices.find(check);
    if (found) return found;
  }
  return null;
};

const App: React.FC = () => {
  const [participantCount, setParticipantCount] = useState<number>(45);
  const [isLottoMode, setIsLottoMode] = useState<boolean>(true);
  const [runnerNames, setRunnerNames] = useState<string[]>(Array.from({ length: 45 }, (_, i) => `${i + 1}\uBC88`));
  const [runners, setRunners] = useState<Runner[]>([]);
  const [status, setStatus] = useState<RaceStatus>(RaceStatus.IDLE);
  const [commentary, setCommentary] = useState<string>("\uADF8\uB79C\uB4DC \uC2A4\uD0C0\uB514\uC6C0\uC5D0 \uC624\uC2E0 \uAC83\uC744 \uD658\uC601\uD569\uB2C8\uB2E4!");
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'individual' | 'batch'>('individual');
  const [batchText, setBatchText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [voiceName, setVoiceName] = useState<string>('');

  const finishOrderRef = useRef<number[]>([]);
  const raceStartTimeRef = useRef<number>(0);
  const koreanVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices (they load async in some browsers)
  useEffect(() => {
    const loadVoices = () => {
      const voice = getBestKoreanVoice();
      koreanVoiceRef.current = voice;
      if (voice) {
        setVoiceName(voice.name);
      }
    };
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const updateCommentary = useCallback((text: string) => {
    setCommentary(text);
    if (!ttsEnabled) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      
      // Use best available Korean voice
      if (koreanVoiceRef.current) {
        utterance.voice = koreanVoiceRef.current;
      }
      
      // Caster-like tuning: slightly faster, natural pitch
      utterance.rate = 1.15;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [ttsEnabled]);
  
  const runnersRef = useRef<Runner[]>([]);
  useEffect(() => {
    runnersRef.current = runners;
  }, [runners]);

  const initRace = () => {
    const newRunners: Runner[] = Array.from({ length: participantCount }, (_, i) => {
      const baseSpeed = 0.00065 + (Math.random() * 0.00035);
      const name = runnerNames[i] || `${i + 1}\uBC88`;
      let color = COLORS[i % COLORS.length];
      if (isLottoMode || participantCount === 45) {
        color = getLottoColor(i + 1).bg;
      }
      return {
        id: i + 1, name, color, progress: 0,
        lane: i % 10, laneOffset: (Math.random() - 0.5) * 0.8,
        speed: 0, baseSpeed, finished: false, isResting: false, isFallen: false,
        stopProgress: 1.01 + (Math.random() * 0.05),
        bobOffset: Math.random() * Math.PI * 2, boosterEndTime: 0
      };
    });
    setRunners(newRunners);
    setStatus(RaceStatus.IDLE);
    updateCommentary(
      isLottoMode || participantCount === 45
        ? "45\uC778\uC758 \uB85C\uB610 \uC2A4\uD504\uB9B0\uD2B8 \uB808\uC774\uC2A4\uAC00 \uC900\uBE44\uB418\uC5C8\uC2B5\uB2C8\uB2E4. 6\uBA85\uB9CC \uC644\uC8FC\uD569\uB2C8\uB2E4!"
        : "\uC120\uC218\uB4E4\uC774 \uCD9C\uBC1C\uC120\uC5D0 \uC815\uB82C\uD588\uC2B5\uB2C8\uB2E4."
    );
    finishOrderRef.current = [];
  };

  useEffect(() => { initRace(); }, [participantCount, isLottoMode, runnerNames]);

  const handleLaneChange = (count: number) => {
    const clamped = Math.max(2, Math.min(60, count));
    setParticipantCount(clamped);
    if (clamped !== 45) setIsLottoMode(false);
    setRunnerNames(prev => {
      const next = [...prev];
      if (clamped > prev.length) {
        return [...next, ...Array(clamped - prev.length).fill('').map((_, i) => `${prev.length + i + 1}\uBC88`)];
      }
      return next.slice(0, clamped);
    });
  };

  const handleSelectLotto = () => {
    setIsLottoMode(true);
    setParticipantCount(45);
    setRunnerNames(Array.from({ length: 45 }, (_, i) => `${i + 1}\uBC88`));
  };

  const handleOpenNameModal = () => {
    setBatchText(runnerNames.slice(0, participantCount).map((n, i) => n || `${i + 1}\uBC88`).join(', '));
    setShowNameModal(true);
  };

  const handleApplyBatchText = () => {
    const rawNames = batchText.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 0);
    if (rawNames.length > 0) {
      const newNames = Array(participantCount).fill('').map((_, i) => rawNames[i] || `${i + 1}\uBC88`);
      setRunnerNames(newNames);
    }
    setShowNameModal(false);
  };

  const handleAutoFillNumbers = () => {
    setRunnerNames(Array(participantCount).fill('').map((_, i) => `${i + 1}\uBC88`));
  };

  const handleRandomizeNames = () => {
    const shuffled = [...SAMPLE_NAMES].sort(() => 0.5 - Math.random());
    setRunnerNames(Array(participantCount).fill('').map((_, i) => shuffled[i % shuffled.length] + ` ${i + 1}`));
  };

  const startRace = () => {
    if (status === RaceStatus.RACING) return;
    raceStartTimeRef.current = Date.now();
    setRunners(prev => prev.map(r => ({ 
      ...r, progress: 0, finished: false, isResting: false, isFallen: false,
      rank: undefined, finishTime: undefined, speed: r.baseSpeed, boosterEndTime: 0
    })));
    finishOrderRef.current = [];
    setStatus(RaceStatus.RACING);
    updateCommentary("\uCD9C\uBC1C! 6\uAC1C\uC758 \uB2F9\uCCA8 \uBC88\uD638\uB97C \uD5A5\uD55C \uC804\uB825 \uC9C8\uC8FC\uAC00 \uC2DC\uC791\uB418\uC5C8\uC2B5\uB2C8\uB2E4!");
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
            updateCommentary("6\uBA85\uC758 \uC6B0\uC2B9\uC790\uAC00 \uBAA8\uB450 \uB3C4\uCC29\uD588\uC2B5\uB2C8\uB2E4! \uB098\uBA38\uC9C0 39\uBA85\uC758 \uC120\uC218\uB294 \uB2EC\uB9AC\uB358 \uC790\uB9AC\uC5D0\uC11C \uC7A5\uB82C\uD788 \uC4F0\uB7EC\uC84C\uC2B5\uB2C8\uB2E4!");
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
                nextLane = nextLane * 0.9 + 1.2 * 0.1;
                nextLaneOffset = nextLaneOffset * 0.9 + 0.01;
              } else {
                nextLane = nextLane * 0.94;
                const lineOrderOffset = ((runner.id * 7) % 100 / 100 - 0.5) * 0.2;
                nextLaneOffset = nextLaneOffset * 0.94 + lineOrderOffset * 0.06;
                if (Math.random() < 0.008) runner.boosterEndTime = now + 4500;
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

            return { ...runner, progress: newProgress, speed: currentSpeed, lane: nextLane, laneOffset: nextLaneOffset, finished, isResting, rank, finishTime, boosterEndTime: runner.boosterEndTime };
          });
        });
      }, 30);

      // Commentary every 6 seconds (more frequent for excitement)
      commentaryInterval = window.setInterval(async () => {
        if (runnersRef.current.length > 0) {
          const text = await getRaceCommentary(runnersRef.current, RaceStatus.RACING);
          updateCommentary(text);
        }
      }, 6000);
    }
    return () => { clearInterval(interval); clearInterval(commentaryInterval); };
  }, [status, isLottoMode, participantCount, updateCommentary]);

  const allResults = [...runners].filter(r => r.rank !== undefined).sort((a, b) => (a.rank || 0) - (b.rank || 0));
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
                {isLottoMode || participantCount === 45 ? '45\uC778 \uB808\uC774\uC2A4 \u2022 6\uC778 \uC0DD\uC874 \uCD94\uCCA8' : '\uD2B8\uB799 \uB808\uC774\uC2A4 \uC2DC\uBBAC\uB808\uC774\uD130'}
              </span>
            </div>
          </div>

          {/* Top Controls */}
          <div className="pointer-events-auto flex items-center gap-3">
             <div className="bg-black/90 backdrop-blur-xl p-3 rounded-[2rem] border border-white/10 flex items-center gap-3.5 shadow-2xl">
                
                <button onClick={handleSelectLotto} disabled={status === RaceStatus.RACING}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md ${
                    isLottoMode || participantCount === 45 ? 'bg-yellow-400 text-slate-950 ring-2 ring-yellow-300' : 'bg-white/10 text-yellow-400 hover:bg-white/20'
                  }`}>
                  <span>{'\uD83C\uDFB1'}</span><span>{'\uB85C\uB610 (45\uC778)'}</span>
                </button>

                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{'\uC778\uC6D0'}</span>
                  <input type="number" min="2" max="60" value={participantCount} disabled={status === RaceStatus.RACING}
                    onChange={(e) => handleLaneChange(parseInt(e.target.value) || 2)}
                    className="bg-transparent text-white w-12 text-center text-base font-black focus:outline-none focus:text-yellow-400 transition-colors" />
                  <span className="text-[10px] text-slate-400 font-bold">{'\uBA85'}</span>
                </div>

                <button onClick={handleOpenNameModal} disabled={status === RaceStatus.RACING}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-lg shadow-cyan-500/30 active:scale-95 transition-all flex items-center gap-1.5 border border-cyan-300/40">
                  <span>{'\u270D\uFE0F'}</span><span>{'\uC774\uB984\uC4F0\uAE30'} ({participantCount}{'\uBA85'})</span>
                </button>

                {/* TTS Toggle */}
                <button onClick={() => { setTtsEnabled(v => !v); if (ttsEnabled) window.speechSynthesis?.cancel(); }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black transition-all ${
                    ttsEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-white/5 text-slate-500 border border-white/10'
                  }`}>
                  {ttsEnabled ? '\uD83D\uDD0A \uC74C\uC131 ON' : '\uD83D\uDD07 \uC74C\uC131 OFF'}
                </button>

                <button onClick={startRace} disabled={status === RaceStatus.RACING}
                  className={`px-6 py-2.5 rounded-xl font-black uppercase text-sm transition-all transform active:scale-95 ${
                    status === RaceStatus.RACING ? 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                  }`}>
                  {'\uB2EC\uB9AC\uAE30 \uC2DC\uC791! (GO)'}
                </button>
             </div>
          </div>
        </div>

        {/* Bottom Commentary & Finished Screen */}
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="pointer-events-auto w-full md:w-[560px] bg-yellow-400 text-slate-950 p-4 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-yellow-300">
            <div className="bg-slate-950 text-white px-2.5 py-1 rounded-lg font-black text-[10px] italic tracking-tighter uppercase shrink-0">{'\uC911\uACC4\uC11D'}</div>
            <p className="text-sm font-black italic tracking-tight flex-1 leading-snug" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{commentary}</p>
          </div>

          {status === RaceStatus.FINISHED && (
            <div className="pointer-events-auto w-full max-w-lg bg-black/95 backdrop-blur-2xl p-6 md:p-7 rounded-[2.5rem] border border-yellow-400/50 shadow-[0_0_80px_rgba(250,204,21,0.3)] flex flex-col max-h-[75vh]">
              
              <div className="text-center mb-4 pb-3 border-b border-white/10">
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">
                  {isLottoMode || participantCount === 45 ? '\uD83C\uDF89 \uB85C\uB610 6/45 \uB2F9\uCCA8 \uBC88\uD638' : '\uD83C\uDFC6 \uCD5C\uC885 \uC644\uC8FC \uACB0\uACFC'}
                </h2>
                <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mt-1">
                  {isLottoMode || participantCount === 45 ? '\uC644\uC8FC \uC131\uACF5 6\uC778 \u2022 \uD589\uC6B4\uC758 \uB2F9\uCCA8 \uBC88\uD638' : '\uACF5\uC2DD \uACBD\uAE30 \uAE30\uB85D'}
                </p>
              </div>

              {(isLottoMode || participantCount === 45) && (
                <div className="mb-4 bg-white/5 p-3.5 rounded-2xl border border-yellow-400/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-black text-yellow-400 uppercase tracking-wider">{'\uB2F9\uCCA8 \uBC88\uD638 6\uAC1C (\uC624\uB984\uCC28\uC21C)'}</span>
                    <button onClick={handleCopyNumbers}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold px-2.5 py-1 rounded-md transition-all border border-slate-700">
                      {copied ? '\u2705 \uBCF5\uC0AC \uC644\uB8CC' : '\uD83D\uDCCB \uBC88\uD638 \uBCF5\uC0AC'}
                    </button>
                  </div>
                  <div className="flex justify-center gap-2">
                    {sortedWinningNumbers.map((num, i) => {
                      const lotto = getLottoColor(num);
                      return (
                        <div key={i} style={{ backgroundColor: lotto.bg }}
                          className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-base shadow-lg shadow-black/60 border-2 border-white/50">
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
                    <div key={runner.id} className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${
                      i === 0 ? 'bg-yellow-400 text-slate-950 border-white scale-[1.02] shadow-lg' : 'bg-white/5 border-white/10'
                    }`}>
                      <div className="flex items-center gap-3.5">
                        <div style={{ backgroundColor: lotto.bg }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md border border-white/30 shrink-0">
                          {runner.id}
                        </div>
                        <div>
                          <span className="font-black uppercase italic text-sm">{runner.name || `${runner.id}\uBC88 \uC120\uC218`}</span>
                          <p className={`text-[10px] font-bold ${i === 0 ? 'text-slate-800' : 'text-slate-400'}`}>{i + 1}{'\uC704 \uACE8\uC778'}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${i === 0 ? 'bg-slate-950 text-yellow-400' : 'bg-white/10 text-white'}`}>
                        {i === 0 ? '\uD83E\uDD47 1\uB4F1' : i === 1 ? '\uD83E\uDD48 2\uB4F1' : i === 2 ? '\uD83E\uDD49 3\uB4F1' : `${i + 1}\uB4F1`}
                      </span>
                    </div>
                  );
                })}

                {(isLottoMode || participantCount === 45) && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl text-center">
                    <p className="text-xs font-bold text-red-400">
                      {'\uD83D\uDC80 \uB098\uBA38\uC9C0 39\uBA85\uC758 \uC120\uC218\uB294 \uB2EC\uB9AC\uB358 \uC790\uB9AC\uC5D0\uC11C \uC4F0\uB7EC\uC84C\uC2B5\uB2C8\uB2E4.'}
                    </p>
                  </div>
                )}
              </div>

              <button onClick={initRace} className="mt-4 w-full py-4 bg-yellow-400 text-slate-950 font-black rounded-2xl hover:bg-yellow-300 transition-all uppercase text-base shadow-xl active:scale-95">
                {'\uC0C8 \uACBD\uAE30 \uC900\uBE44\uD558\uAE30 (Next)'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto">
          <div className="bg-slate-900 border border-yellow-400/40 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-6 md:p-7 flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-white font-black text-xl flex items-center gap-2">
                  <span>{'\u270D\uFE0F'}</span><span>{'\uC120\uC218 \uC774\uB984 \uC4F0\uAE30'} ({'\uCD1D'} {participantCount}{'\uBA85'})</span>
                </h3>
                <p className="text-slate-400 text-xs font-medium mt-1">
                  {'\uCC38\uAC00 \uC120\uC218\uB4E4\uC758 \uC774\uB984\uC744 \uC9C1\uC811 \uC785\uB825\uD558\uAC70\uB098 \uBA85\uB2E8\uC744 \uD55C \uBC88\uC5D0 \uBD99\uC5EC\uB123\uC73C\uC138\uC694.'}
                </p>
              </div>
              <button onClick={() => setShowNameModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm">
                {'\u2715'}
              </button>
            </div>

            <div className="flex gap-2 mb-4 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button onClick={() => setModalTab('individual')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${modalTab === 'individual' ? 'bg-yellow-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>
                {'\uC9C1\uC811 \uD558\uB098\uC529 \uC785\uB825'}
              </button>
              <button onClick={() => setModalTab('batch')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${modalTab === 'batch' ? 'bg-yellow-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>
                {'\uC77C\uAD04 \uBD99\uC5EC\uB123\uAE30 (\uC27C\uD45C/\uC5D4\uD130)'}
              </button>
            </div>

            {modalTab === 'individual' && (
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar min-h-[220px]">
                {runnerNames.slice(0, participantCount).map((name, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/20 text-yellow-300 font-black text-xs flex items-center justify-center border border-yellow-500/40 shrink-0">{idx + 1}</div>
                    <input type="text" value={name}
                      onChange={(e) => { const updated = [...runnerNames]; updated[idx] = e.target.value; setRunnerNames(updated); }}
                      placeholder={`${idx + 1}\uBC88 \uC120\uC218 \uC774\uB984 \uC785\uB825...`}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-yellow-400 px-3.5 py-2 rounded-xl text-white text-xs font-bold outline-none transition-all placeholder:text-slate-500" />
                  </div>
                ))}
              </div>
            )}

            {modalTab === 'batch' && (
              <div className="flex-1 flex flex-col min-h-[220px]">
                <p className="text-slate-400 text-xs mb-2">{'\uC27C\uD45C(,), \uC904\uBC14\uAFC8 \uB4F1\uC73C\uB85C \uAD6C\uBD84\uB41C \uC774\uB984\uC744 \uBD99\uC5EC\uB123\uC73C\uC138\uC694:'}</p>
                <textarea value={batchText} onChange={(e) => setBatchText(e.target.value)}
                  placeholder={'\uC608: \uD64D\uAE38\uB3D9, \uC774\uC21C\uC2E0, \uAC15\uAC10\uCC2C, \uC720\uAD00\uC21C, \uAE40\uC720\uC2E0, \uC7A5\uBCF4\uACE0...'}
                  rows={7} className="w-full flex-1 bg-slate-950 border border-slate-700 focus:border-yellow-400 p-3.5 rounded-2xl text-white text-xs font-medium outline-none transition-all placeholder:text-slate-600 resize-none" />
                <button onClick={handleApplyBatchText}
                  className="mt-3 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md">
                  {'\uBA85\uB2E8 \uD30C\uC2F1\uD558\uC5EC \uC801\uC6A9\uD558\uAE30'}
                </button>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap justify-between items-center gap-2">
              <div className="flex gap-2">
                <button onClick={handleAutoFillNumbers}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition-all">
                  1~{participantCount}{'\uBC88 \uBC88\uD638\uCC44\uC6B0\uAE30'}
                </button>
                <button onClick={handleRandomizeNames}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition-all">
                  {'\uD83C\uDFB2 \uB79C\uB364 \uB2C9\uB124\uC784'}
                </button>
              </div>
              <button onClick={() => setShowNameModal(false)}
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-yellow-400/20 active:scale-95 transition-all">
                {'\uC800\uC7A5 \uBC0F \uB2EB\uAE30'}
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
