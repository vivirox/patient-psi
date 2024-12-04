import { useEffect, useState } from 'react';
import { Button } from '../ui/button';

interface StopwatchProps {
  autoStart?: boolean;
  onTimeUpdate?: (time: number) => void;
}

export function Stopwatch({ autoStart = false, onTimeUpdate }: StopwatchProps) {
  const [isRunning, setIsRunning] = useState(autoStart);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRunning) {
      intervalId = setInterval(() => {
        setTime((prevTime) => {
          const newTime = prevTime + 1;
          onTimeUpdate?.(newTime);
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, onTimeUpdate]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const pad = (num: number): string => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
    }
    return `${pad(minutes)}:${pad(remainingSeconds)}`;
  };

  const handleToggle = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    onTimeUpdate?.(0);
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="font-mono text-lg min-w-[80px]">{formatTime(time)}</div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="min-w-[80px]"
      >
        {isRunning ? 'Pause' : 'Start'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
        className="min-w-[80px]"
      >
        Reset
      </Button>
    </div>
  );
}
