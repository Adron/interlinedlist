'use client';

import { useState, useEffect } from 'react';

export default function ClockWidget() {
  const [time, setTime] = useState({ military: '', standard: '' });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Military time (HH:MM:SS in 24-hour format)
      const military = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // Standard time (HH:MM:SS AM/PM in 12-hour format)
      const standard = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setTime({ military, standard });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card mb-2">
      <div className="card-body py-2 px-3">
        <div className="row g-2">
          <div className="col-6">
            <small className="text-muted d-block">Military</small>
            <strong className="font-monospace fs-5">{time.military || '--:--:--'}</strong>
          </div>
          <div className="col-6">
            <small className="text-muted d-block">Standard</small>
            <strong className="font-monospace fs-5">{time.standard || '--:--:--'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
