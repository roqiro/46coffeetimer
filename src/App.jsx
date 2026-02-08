import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Pause, RotateCcw, Coffee, Droplets, Info, ChevronRight, ExternalLink, Volume2, Beaker } from 'lucide-react';

const App = () => {
  // --- Configuration State ---
  const [targetWater, setTargetWater] = useState(300);
  const [flavor, setFlavor] = useState('balanced');
  const [strength, setStrength] = useState('strong');
  const [isBrewing, setIsBrewing] = useState(false);
  
  // --- Timer State ---
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);

  // --- 4:6 Method Logic ---
  const beansWeight = (targetWater / 15).toFixed(1);
  const firstPhaseTotal = targetWater * 0.4;
  const secondPhaseTotal = targetWater * 0.6;

  let pour1, pour2;
  if (flavor === 'sweet') {
    pour1 = Math.round(firstPhaseTotal * (5/12)); 
    pour2 = Math.round(firstPhaseTotal * (7/12)); 
  } else if (flavor === 'acidic') {
    pour1 = Math.round(firstPhaseTotal * (7/12)); 
    pour2 = Math.round(firstPhaseTotal * (5/12)); 
  } else {
    pour1 = Math.round(firstPhaseTotal * 0.5);
    pour2 = Math.round(firstPhaseTotal * 0.5);
  }

  const secondPhaseSteps = [];
  if (strength === 'light') {
    secondPhaseSteps.push({ time: 90, amount: Math.round(secondPhaseTotal), label: '3投目: 濃度調整（軽やか）' });
  } else if (strength === 'medium') {
    secondPhaseSteps.push({ time: 90, amount: Math.round(secondPhaseTotal / 2), label: '3投目: 濃度調整（中庸）' });
    secondPhaseSteps.push({ time: 130, amount: Math.round(secondPhaseTotal / 2), label: '4投目: 濃度調整（中庸）' });
  } else {
    secondPhaseSteps.push({ time: 90, amount: Math.round(secondPhaseTotal / 3), label: '3投目: 濃度調整（しっかり）' });
    secondPhaseSteps.push({ time: 130, amount: Math.round(secondPhaseTotal / 3), label: '4投目: 濃度調整（しっかり）' });
    secondPhaseSteps.push({ time: 160, amount: Math.round(secondPhaseTotal / 3), label: '5投目: 濃度調整（しっかり）' });
  }

  const steps = [
    { id: 1, time: 0, amount: pour1, label: '1投目: 酸味/甘味の調整', total: pour1 },
    { id: 2, time: 45, amount: pour2, label: '2投目: 甘味の調整', total: pour1 + pour2 },
    ...secondPhaseSteps.map((s, i) => ({
      id: 3 + i,
      time: s.time,
      amount: s.amount,
      label: s.label,
      total: pour1 + pour2 + secondPhaseSteps.slice(0, i + 1).reduce((acc, curr) => acc + curr.amount, 0)
    }))
  ];

  const allSteps = [
    ...steps,
    { id: 'finish', time: 210, amount: 0, label: '抽出完了 (ドリッパーを外す)', total: Math.round(targetWater) }
  ];

  const playNotificationSound = (type = 'step') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'finish') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isBrewing) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const nextSec = prev + 1;
          if (allSteps.some(s => s.time === nextSec)) {
            playNotificationSound(nextSec >= 210 ? 'finish' : 'step');
          }
          return nextSec;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isBrewing, allSteps]);

  const currentStepIndex = [...allSteps].reverse().find(s => seconds >= s.time) ? allSteps.indexOf([...allSteps].reverse().find(s => seconds >= s.time)) : 0;
  const nextStep = allSteps[currentStepIndex + 1];
  const currentStep = allSteps[currentStepIndex];

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 flex flex-col items-center overflow-x-hidden">
      <div className="max-w-md w-full space-y-6 flex-grow">
        
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-amber-500 flex items-center justify-center gap-2">
            <Coffee className="w-8 h-8" /> 4:6 METHOD
          </h1>
          <p className="text-neutral-400 text-xs">粕谷 哲氏 抽出理論タイマー</p>
        </header>

        {!isBrewing && seconds === 0 ? (
          <div className="bg-neutral-900 rounded-3xl p-6 shadow-xl border border-neutral-800 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-neutral-400">目標の湯量</label>
                <span className="text-2xl font-bold text-amber-500">{targetWater}g</span>
              </div>
              <input 
                type="range" min="150" max="600" step="10" value={targetWater} 
                onChange={(e) => setTargetWater(Number(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-400">味の好み</label>
              <div className="grid grid-cols-3 gap-2">
                {['acidic', 'balanced', 'sweet'].map((id) => (
                  <button
                    key={id} onClick={() => setFlavor(id)}
                    className={`py-3 px-1 rounded-xl text-xs font-bold border-2 transition-all ${
                      flavor === id ? 'bg-amber-600 text-white border-amber-400' : 'bg-neutral-800 text-neutral-400 border-transparent'
                    }`}
                  >
                    {id === 'acidic' ? 'より明るく' : id === 'balanced' ? '標準' : 'より甘く'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                <Beaker size={14} className="text-amber-500" /> 濃度の調整
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['light', 'medium', 'strong'].map((id) => (
                  <button
                    key={id} onClick={() => setStrength(id)}
                    className={`py-3 px-1 rounded-xl text-xs font-bold border-2 transition-all ${
                      strength === id ? 'bg-amber-600 text-white border-amber-400' : 'bg-neutral-800 text-neutral-400 border-transparent'
                    }`}
                  >
                    {id === 'light' ? '薄め' : id === 'medium' ? '濃いめ' : 'さらに濃く'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-neutral-950/50 p-4 rounded-2xl border border-neutral-800/50 text-center">
              <div>
                <p className="text-[10px] uppercase text-neutral-500">必要な粉量</p>
                <p className="text-xl font-bold">{beansWeight}g</p>
              </div>
              <div className="border-l border-neutral-800">
                <p className="text-[10px] uppercase text-neutral-500">推奨の挽き目</p>
                <p className="text-xl font-bold text-neutral-200">粗挽き</p>
              </div>
            </div>

            <button 
              onClick={() => { setIsBrewing(true); playNotificationSound(); }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-lg active:scale-95 transition-transform"
            >
              抽出開始 <Play className="fill-current" size={20} />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-neutral-900 rounded-3xl p-8 shadow-2xl border border-neutral-800 text-center space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1 bg-amber-500 transition-all duration-1000" style={{ width: `${Math.min((seconds / 210) * 100, 100)}%` }} />
              <p className="text-5xl font-mono font-black tracking-tighter text-amber-500">{formatTime(seconds)}</p>
              <div className="py-6 border-y border-neutral-800/50 my-4 text-center">
                <p className="text-xs text-neutral-400 mb-1">{currentStep.label}</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl font-black text-white">+{currentStep.amount}g</span>
                  <ChevronRight className="text-neutral-700" />
                  <div className="text-left leading-none">
                    <p className="text-[10px] text-neutral-500 uppercase">目標総量</p>
                    <p className="text-xl font-bold text-amber-500">{currentStep.total}g</p>
                  </div>
                </div>
              </div>
              {nextStep && (
                <div className="flex items-center justify-center gap-2 text-neutral-500 text-xs bg-neutral-950/50 py-2 px-4 rounded-full mx-auto w-fit">
                  <Info size={14} className="text-amber-500" />
                  <span>次は <span className="text-neutral-300 font-bold">{formatTime(nextStep.time)}</span> に注ぎます</span>
                </div>
              )}
            </div>

            <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 space-y-3 max-h-64 overflow-y-auto">
              {allSteps.map((step, idx) => (
                <div key={step.id} className={`flex items-center justify-between p-3 rounded-xl border ${currentStepIndex === idx ? 'bg-amber-500/10 border-amber-500/30' : 'opacity-40 border-transparent'}`}>
                  <div className="flex items-center gap-3 text-left">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentStepIndex === idx ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${currentStepIndex === idx ? 'text-white' : 'text-neutral-400'}`}>{step.id === 'finish' ? 'フィニッシュ' : `+${step.amount}g 注ぐ`}</p>
                      <p className="text-[10px] text-neutral-500">{formatTime(step.time)} 開始</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-neutral-500 leading-none mb-1">累計</p>
                    <p className={`text-sm font-bold ${currentStepIndex === idx ? 'text-amber-500' : 'text-neutral-400'}`}>{step.total}g</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setIsBrewing(!isBrewing)} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${isBrewing ? 'bg-neutral-800 text-neutral-100' : 'bg-amber-500 text-neutral-950'}`}>
                {isBrewing ? <Pause size={20} /> : <Play size={20} />} {isBrewing ? '一時停止' : '再開'}
              </button>
              <button onClick={() => { setIsBrewing(false); setSeconds(0); }} className="w-16 h-16 bg-neutral-800 text-neutral-400 rounded-2xl flex items-center justify-center"><RotateCcw size={24} /></button>
            </div>
          </div>
        )}
      </div>

      <footer className="w-full max-w-md pt-8 flex flex-col items-center gap-4">
        <button onClick={() => window.open('https://philocoffea.com/?mode=f3', '_blank')} className="group flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 text-[10px] hover:text-amber-500 hover:border-amber-500/50 transition-all uppercase tracking-widest">
          <span>Official Recipe by Tetsu Kasuya</span>
          <ExternalLink size={10} />
        </button>
      </footer>
    </div>
  );
};

// --- Rendering Logic (Vite Entry Point) ---
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;