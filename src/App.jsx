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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 md:p-8 flex flex-col items-center overflow-x-hidden">
      <div className="max-w-md w-full space-y-6 flex-grow">
        
        <header className="text-center space-y-2 pt-4">
          <h1 className="text-4xl font-black tracking-tight text-amber-500 flex items-center justify-center gap-2">
            <Coffee className="w-10 h-10" /> 4:6 METHOD
          </h1>
          <p className="text-neutral-400 text-sm font-medium">粕谷 哲氏 抽出理論タイマー</p>
        </header>

        {!isBrewing && seconds === 0 ? (
          <div className="bg-neutral-900 rounded-3xl p-6 shadow-2xl border border-neutral-800 space-y-8 animate-in fade-in duration-500">
            {/* Water Input */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-sm font-bold text-neutral-400">目標の湯量</label>
                <span className="text-3xl font-black text-amber-500">{targetWater}<span className="text-sm ml-1 text-neutral-500">g</span></span>
              </div>
              <input 
                type="range" min="150" max="600" step="10" value={targetWater} 
                onChange={(e) => setTargetWater(Number(e.target.value))}
                className="w-full h-3 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Flavor */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-neutral-400">味の好み（酸味と甘味）</label>
              <div className="grid grid-cols-3 gap-2">
                {['acidic', 'balanced', 'sweet'].map((id) => (
                  <button
                    key={id} onClick={() => setFlavor(id)}
                    className={`py-3 px-1 rounded-xl text-xs font-black border-2 transition-all active:scale-95 ${
                      flavor === id ? 'bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-900/40' : 'bg-neutral-800 text-neutral-500 border-transparent hover:bg-neutral-700'
                    }`}
                  >
                    {id === 'acidic' ? 'より明るく' : id === 'balanced' ? '標準' : 'より甘く'}
                  </button>
                ))}
              </div>
            </div>

            {/* Strength */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-neutral-400 flex items-center gap-2">
                <Beaker size={14} className="text-amber-500" /> 濃度の調整
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['light', 'medium', 'strong'].map((id) => (
                  <button
                    key={id} onClick={() => setStrength(id)}
                    className={`py-3 px-1 rounded-xl text-xs font-black border-2 transition-all active:scale-95 ${
                      strength === id ? 'bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-900/40' : 'bg-neutral-800 text-neutral-500 border-transparent hover:bg-neutral-700'
                    }`}
                  >
                    {id === 'light' ? '薄め' : id === 'medium' ? '濃いめ' : 'さらに濃く'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-neutral-950/50 p-5 rounded-2xl border border-neutral-800/50 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">必要な粉量</p>
                <p className="text-2xl font-black text-white">{beansWeight}g</p>
              </div>
              <div className="border-l border-neutral-800">
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">推奨の挽き目</p>
                <p className="text-2xl font-black text-white">粗挽き</p>
              </div>
            </div>

            <button 
              onClick={() => { setIsBrewing(true); playNotificationSound(); }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black py-5 rounded-2xl flex items-center justify-center gap-3 text-xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
            >
              抽出開始 <Play className="fill-current" size={24} />
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            <div className="bg-neutral-900 rounded-3xl p-8 shadow-2xl border border-neutral-800 text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1.5 bg-amber-500 transition-all duration-1000" style={{ width: `${Math.min((seconds / 210) * 100, 100)}%` }} />
              
              <div className="space-y-1">
                <p className="text-6xl font-mono font-black tracking-tighter text-amber-500">{formatTime(seconds)}</p>
                <div className="flex items-center justify-center gap-2 text-neutral-500">
                  <Volume2 size={14} className={isBrewing ? 'animate-pulse' : ''} />
                  <span className="text-[10px] uppercase tracking-widest font-black">Sound Active</span>
                </div>
              </div>

              <div className="py-8 border-y border-neutral-800/50 my-4 text-center">
                <p className="text-sm font-bold text-neutral-400 mb-2 uppercase tracking-wide">{currentStep.label}</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-5xl font-black text-white">+{currentStep.amount}g</span>
                  <ChevronRight className="text-neutral-700" size={32} />
                  <div className="text-left leading-none">
                    <p className="text-[10px] text-neutral-500 uppercase font-black mb-1">目標総量</p>
                    <p className="text-2xl font-black text-amber-500">{currentStep.total}g</p>
                  </div>
                </div>
              </div>

              {nextStep && (
                <div className="flex items-center justify-center gap-2 text-neutral-400 text-xs bg-neutral-950/50 py-3 px-6 rounded-full mx-auto w-fit border border-neutral-800">
                  <Info size={14} className="text-amber-500" />
                  <span>次は <span className="text-white font-black">{formatTime(nextStep.time)}</span> に注ぎます</span>
                </div>
              )}
            </div>

            <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 space-y-3 max-h-72 overflow-y-auto shadow-inner">
              {allSteps.map((step, idx) => (
                <div key={step.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${currentStepIndex === idx ? 'bg-amber-500/10 border-amber-500/40 shadow-lg' : 'opacity-30 border-transparent'}`}>
                  <div className="flex items-center gap-4 text-left">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${currentStepIndex === idx ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-500'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className={`text-base font-black ${currentStepIndex === idx ? 'text-white' : 'text-neutral-400'}`}>{step.id === 'finish' ? 'フィニッシュ' : `+${step.amount}g 注ぐ`}</p>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase">{formatTime(step.time)} START</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-neutral-600 uppercase leading-none mb-1">Total</p>
                    <p className={`text-lg font-black ${currentStepIndex === idx ? 'text-amber-500' : 'text-neutral-400'}`}>{step.total}g</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsBrewing(!isBrewing)} 
                className={`flex-1 py-5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  isBrewing ? 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700' : 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
                }`}
              >
                {isBrewing ? <Pause size={24} /> : <Play size={24} />} {isBrewing ? '一時停止' : '再開'}
              </button>
              <button 
                onClick={() => { setIsBrewing(false); setSeconds(0); }} 
                className="w-20 h-20 bg-neutral-800 text-neutral-400 rounded-2xl flex items-center justify-center hover:bg-neutral-700 active:scale-90 transition-all border border-neutral-700"
              >
                <RotateCcw size={28} />
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="w-full max-w-md py-8 flex flex-col items-center gap-6">
        <button 
          onClick={() => window.open('https://philocoffea.com/?mode=f3', '_blank')} 
          className="group flex items-center gap-3 px-6 py-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400 text-xs hover:text-amber-500 hover:border-amber-500/50 transition-all shadow-lg"
        >
          <span className="font-bold tracking-widest uppercase text-[10px]">Official Recipe by Tetsu Kasuya</span>
          <ExternalLink size={12} className="group-hover:translate-x-1 transition-transform" />
        </button>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900/30 rounded-full border border-neutral-800/50">
          <Droplets className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] text-neutral-600 font-black uppercase tracking-[0.2em]">4:6 Extraction Engine v2.0</span>
        </div>
      </footer>

      <style>{`
        .animate-in { animation: animateIn 0.5s ease-out; }
        @keyframes animateIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          background: #f59e0b;
          border-radius: 50%;
          border: 4px solid #171717;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);
          cursor: pointer;
        }
        
        /* スクロールバーのカスタマイズ */
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #262626;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

// レンダリング
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;