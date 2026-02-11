'use client';

import { useState, useEffect } from 'react';
import EmailVerificationResend from './EmailVerificationResend';

interface PermissionsSectionProps {
  emailVerified: boolean;
}

export default function PermissionsSection({ emailVerified }: PermissionsSectionProps) {
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');
  const [loading, setLoading] = useState(false);
  // Defer browser instructions to client-only to avoid hydration mismatch (server has no navigator)
  const [browserInstructions, setBrowserInstructions] = useState('');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      setBrowserInstructions('To change location permissions in Chrome: Click the lock icon in the address bar → Site settings → Location → Allow.');
    } else if (userAgent.includes('firefox')) {
      setBrowserInstructions('To change location permissions in Firefox: Click the lock icon in the address bar → More Information → Permissions → Location → Allow.');
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      setBrowserInstructions('To change location permissions in Safari: Safari menu → Settings → Websites → Location → Select "Allow" for this site.');
    } else if (userAgent.includes('edg')) {
      setBrowserInstructions('To change location permissions in Edge: Click the lock icon in the address bar → Site permissions → Location → Allow.');
    } else {
      setBrowserInstructions('To change location permissions: Look for a lock or information icon in your browser\'s address bar, then navigate to site permissions or settings to enable location access.');
    }
  }, []);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    if (!navigator.geolocation) {
      setLocationPermissionStatus('denied');
      return;
    }

    // Check permission using Permissions API if available
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setLocationPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        
        // Listen for permission changes
        result.onchange = () => {
          setLocationPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        };
      } catch (err) {
        // Permissions API not fully supported, fall back to trying geolocation
        setLocationPermissionStatus('prompt');
      }
    } else {
      // Permissions API not available, assume prompt state
      setLocationPermissionStatus('prompt');
    }
  };

  const requestLocationPermission = async () => {
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
        setLocationPermissionStatus('granted');
        setLoading(false);
        // Refresh the page to show location widget
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationPermissionStatus('denied');
        } else {
          setLocationPermissionStatus('prompt');
        }
        setLoading(false);
      },
      options
    );
  };

  const getLocationStatusDisplay = () => {
    switch (locationPermissionStatus) {
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

  const locationStatusDisplay = getLocationStatusDisplay();

  return (
    <div className="card h-100">
      <div className="card-body">
        <h3 className="h5 mb-4">Permissions</h3>
        
        {/* Location Permission */}
        <div className="mb-4 pb-4 border-bottom">
          <h4 className="h6 mb-2">Location Permission</h4>
          <p className={`mb-3 ${locationStatusDisplay.color}`}>
            <span className={locationStatusDisplay.color}>{locationStatusDisplay.icon}</span> {locationStatusDisplay.text}
          </p>
          
          {locationStatusDisplay.showButton && (
            <button
              className="btn btn-sm btn-primary"
              onClick={requestLocationPermission}
              disabled={loading || locationPermissionStatus === 'checking'}
            >
              {loading ? 'Requesting...' : 'Request Location Permission'}
            </button>
          )}
          
          <div className="mt-3">
            <p className="small text-muted mb-2">
              <i className="bx bx-info-circle me-1"></i>
              Location permission is required to display your current location and local weather information.
            </p>
            <p className="small text-muted mb-0">
              <i className="bx bx-cog me-1"></i>
              {browserInstructions}
            </p>
          </div>
        </div>

        {/* Email Verification */}
        <div>
          <h4 className="h6 mb-2">Email Verification</h4>
          <p className="mb-3">
            {emailVerified ? (
              <>
                <span className="text-success">✓</span> Your email address is verified.
              </>
            ) : (
              <>
                <span className="text-danger">✗</span> Your email address is not verified. Please verify your email to access all features.
              </>
            )}
          </p>
          {!emailVerified && (
            <EmailVerificationResend />
          )}
        </div>
      </div>
    </div>
  );
}
