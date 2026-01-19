'use client';

import { useState, useEffect } from 'react';

export default function LocationPermissionSection() {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    if (!navigator.geolocation) {
      setPermissionStatus('denied');
      return;
    }

    // Check permission using Permissions API if available
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        
        // Listen for permission changes
        result.onchange = () => {
          setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        };
      } catch (err) {
        // Permissions API not fully supported, fall back to trying geolocation
        setPermissionStatus('prompt');
      }
    } else {
      // Permissions API not available, assume prompt state
      setPermissionStatus('prompt');
    }
  };

  const requestPermission = async () => {
    if (!navigator.geolocation) {
      return;
    }

    setLoading(true);
    
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      () => {
        setPermissionStatus('granted');
        setLoading(false);
        // Refresh the page to show location widget
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionStatus('denied');
        } else {
          setPermissionStatus('prompt');
        }
        setLoading(false);
      },
      options
    );
  };

  const getStatusDisplay = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          icon: '✓',
          text: 'Location permission is granted.',
          color: 'text-success',
          showButton: false,
        };
      case 'denied':
        return {
          icon: '✗',
          text: 'Location permission is denied. Please enable it in your browser settings.',
          color: 'text-danger',
          showButton: true,
        };
      case 'prompt':
        return {
          icon: '?',
          text: 'Location permission has not been requested yet.',
          color: 'text-warning',
          showButton: true,
        };
      default:
        return {
          icon: '...',
          text: 'Checking permission status...',
          color: 'text-muted',
          showButton: false,
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="card h-100">
      <div className="card-body">
        <h3 className="h5 mb-4">Location Permission</h3>
        
        <div className="mb-3">
          <h4 className="h6 mb-2">Permission Status</h4>
          <p className={`mb-3 ${statusDisplay.color}`}>
            <span className={statusDisplay.color}>{statusDisplay.icon}</span> {statusDisplay.text}
          </p>
          
          {statusDisplay.showButton && (
            <button
              className="btn btn-sm btn-primary"
              onClick={requestPermission}
              disabled={loading || permissionStatus === 'checking'}
            >
              {loading ? 'Requesting...' : 'Request Location Permission'}
            </button>
          )}
        </div>

        <div className="mt-4 pt-3 border-top">
          <p className="small text-muted mb-0">
            <i className="bx bx-info-circle me-1"></i>
            Location permission is required to display your current location and local weather information.
          </p>
        </div>
      </div>
    </div>
  );
}
