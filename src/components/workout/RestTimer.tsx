import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';

interface RestTimerProps {
  onComplete: () => void;
  defaultTime?: number;
}

const RestTimer = ({ onComplete, defaultTime = 60 }: RestTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(defaultTime);
  const [isRunning, setIsRunning] = useState(true);
  const [customTime, setCustomTime] = useState(String(defaultTime));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          playSound();
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onComplete]);

  const playSound = () => {
    // Som simples usando Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const handleReset = useCallback(() => {
    setTimeLeft(parseInt(customTime) || defaultTime);
    setIsRunning(true);
  }, [customTime, defaultTime]);

  const handleCustomTimeChange = () => {
    const newTime = parseInt(customTime);
    if (newTime > 0) {
      setTimeLeft(newTime);
      setIsEditing(false);
      setIsRunning(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = ((defaultTime - timeLeft) / defaultTime) * 100;

  return (
    <Card className="border-2 border-primary/50 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Descanso</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="text-center">
            <div className={`text-4xl font-bold ${timeLeft === 0 ? 'text-primary animate-pulse' : 'text-foreground'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
          
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {isEditing ? (
          <div className="flex gap-2">
            <Input
              type="number"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="h-9"
              placeholder="Segundos"
            />
            <Button size="sm" onClick={handleCustomTimeChange}>
              OK
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsEditing(true)}
          >
            Ajustar tempo
          </Button>
        )}

        {timeLeft === 0 && (
          <div className="text-center text-primary font-semibold animate-pulse">
            Descanso concluído!
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestTimer;
