import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  audioStream: MediaStream | null;
  isActive: boolean;
}

export function AudioWaveform({ audioStream, isActive }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioStream || !isActive) {
      // Cleanup on inactive
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      return;
    }

    // Set up Web Audio API
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 256;

    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!isActive) return;

      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      ctx.fillStyle = 'rgb(15, 23, 42)'; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate bar width
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      // Draw bars
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, 'rgb(239, 68, 68)'); // red-500
        gradient.addColorStop(0.5, 'rgb(239, 68, 68, 0.8)'); // red-500 with opacity
        gradient.addColorStop(1, 'rgb(239, 68, 68, 0.3)'); // red-500 with more opacity

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioStream, isActive]);

  return (
    <div className="w-full h-32 bg-slate-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={800}
        height={128}
        className="w-full h-full"
      />
    </div>
  );
}
