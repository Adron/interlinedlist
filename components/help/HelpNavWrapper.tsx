'use client';

import { useRef } from 'react';
import HelpSidebar from './HelpSidebar';

export default function HelpNavWrapper() {
  const offcanvasRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Desktop: sidebar card */}
      <div className="d-none d-md-block col-md-3 col-12 mb-4 mb-md-0">
        <div className="card">
          <div className="card-header">
            <h2 className="h6 mb-0">Help</h2>
          </div>
          <div className="card-body p-0">
            <HelpSidebar />
          </div>
        </div>
      </div>

      {/* Mobile: toggle button + offcanvas */}
      <div className="d-md-none col-12 mb-3">
        <button
          className="btn btn-outline-secondary"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#helpOffcanvas"
          aria-controls="helpOffcanvas"
        >
          <i className="bx bx-menu me-1"></i>
          Help Topics
        </button>
      </div>
      <div
        className="offcanvas offcanvas-start d-md-none"
        ref={offcanvasRef}
        id="helpOffcanvas"
        tabIndex={-1}
        aria-labelledby="helpOffcanvasLabel"
      >
        <div className="offcanvas-header">
          <h2 className="offcanvas-title h6" id="helpOffcanvasLabel">
            Help
          </h2>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
        </div>
        <div className="offcanvas-body p-0">
          <HelpSidebar inOffcanvas />
        </div>
      </div>
    </>
  );
}
