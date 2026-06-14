import { useEffect, useState, useRef } from 'react';

interface Metrics {
  timestamp: number;
  cpu: number;
  memory: number;
  log: string;
}

export default function App() {
  const [currentMetrics, setCurrentMetrics] = useState<Metrics | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const messageBufferRef = useRef<Metrics[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_LOCAL_SERVER);

    ws.onmessage = (event) => {
      try {
        const data: Metrics = JSON.parse(event.data);
        messageBufferRef.current.push(data);
      } catch (err) {
        console.error("Failed to parse incoming WebSocket message:", err);
      }
    };

    let animationFrameId: number;
    let lastFlushTime = performance.now();

    const RENDER_THROTTLE_MS = 1000;

    const flushBufferToState = (currentTime: number) => {

      const timeDelta = currentTime - lastFlushTime;
      if (timeDelta < RENDER_THROTTLE_MS) {
        animationFrameId = requestAnimationFrame(flushBufferToState);
        return;
      }

      const bufferLength = messageBufferRef.current.length;

      if (bufferLength > 0) {
        const batchedData = [...messageBufferRef.current];
        messageBufferRef.current = [];

        lastFlushTime = currentTime;
        const latestMetrics = batchedData[batchedData.length - 1];
        setCurrentMetrics(latestMetrics);

        const newLogs = batchedData.map(
          (d) => `${new Date(d.timestamp).toLocaleTimeString()} ${d.log}`
        );

        setLogs((prevLogs) => {
          const updatedLogs = [...prevLogs, ...newLogs];
          return updatedLogs.slice(-200);
        });
      }

      animationFrameId = requestAnimationFrame(flushBufferToState);
    };

    animationFrameId = requestAnimationFrame(flushBufferToState);

    return () => {
      ws.close();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-mono selection:bg-emerald-500 selection:text-slate-950">
      <header className="mb-6 border-b border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-emerald-400">⚡ SYSTEM sMONITOR // IO</h1>
          <p className="text-xs text-slate-400 mt-1">
            Engine status: <span className="text-emerald-500 font-bold animate-pulse">● ENGINE OPERATIONAL (BATCHED @ 60FPS)</span>
          </p>
        </div>
        <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-800 text-[11px] text-slate-400">
          Source: <span className="text-cyan-400">ws://localhost:8080</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 shadow-xl space-y-6">
          <h2 className="text-xs font-bold text-slate-400 border-b border-slate-800 pb-2 uppercase tracking-widest">Resource Usage</h2>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">CPU UTILIZATION</span>
              <span className="text-emerald-400 font-bold text-sm">{currentMetrics?.cpu ?? 0}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded border border-slate-800 p-0.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-sm transition-all duration-75"
                style={{ width: `${currentMetrics?.cpu ?? 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">MEMORY ALLOCATION</span>
              <span className="text-cyan-400 font-bold text-sm">{currentMetrics?.memory ?? 0}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded border border-slate-800 p-0.5 overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-sm transition-all duration-75"
                style={{ width: `${currentMetrics?.memory ?? 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 shadow-xl lg:col-span-2 flex flex-col h-[450px]">
          <h2 className="text-xs font-bold text-slate-400 border-b border-slate-800 pb-2 uppercase tracking-widest mb-3">Live Streaming Cluster Logs</h2>

          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto bg-slate-950 border border-slate-800 p-4 rounded text-[11px] font-mono text-slate-300 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800"
          >
            {logs.map((log, index) => (
              <div key={index} className="flex gap-2 hover:bg-slate-900/50 py-0.5 px-1 rounded transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="text-slate-500 select-none">[{index + 1}]</span>
                <span className="text-slate-300">{log}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-slate-600 italic animate-pulse">Awaiting handshake with server stream...</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}