'use client';

import { useState, useEffect } from 'react';

export default function ClockInNav() {
  const [time, setTime] = useState('');
  const [isLateNight, setIsLateNight] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();

      // Standard 12-hour format without seconds
      const timeStr = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
      });

      // Late night is after 11pm or before 6am
      setIsLateNight(hour >= 23 || hour < 6);
      setTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const textClass = isLateNight ? 'text-warning' : '';

  return (
    <div
      className="topbar-item"
      title={isLateNight ? "Maybe time to rest?" : "Current time"}
    >
      <div className={`topbar-button btn btn-link text-decoration-none d-flex align-items-center gap-1 ${textClass}`}>
        {isLateNight && <i className="bx bx-moon align-middle"></i>}
        <span className="font-monospace" style={{ minWidth: '50px' }}>
          {time || '--:--'}
        </span>
      </div>
    </div>
  );
}
