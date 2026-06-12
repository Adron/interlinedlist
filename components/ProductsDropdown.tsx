'use client';

import { useState, useRef, useEffect } from 'react';

export default function ProductsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncToolsOpen, setIsSyncToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close sub-menu when main dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setIsSyncToolsOpen(false);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="dropdown d-none d-md-block" ref={dropdownRef}>
      <a
        type="button"
        id="page-header-products-dropdown"
        className="d-flex align-items-center gap-1 text-decoration-none"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        style={{
          color: 'var(--bs-topbar-item-color, var(--color-text))',
          fontSize: '0.9rem',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
      >
        <i className="bx bx-package fs-18 align-middle"></i>
        <span className="align-middle">Products</span>
        <i
          className={`bx align-middle ${isOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}
          aria-hidden="true"
        />
      </a>
      <div
        className={`dropdown-menu ${isOpen ? 'show' : ''}`}
        aria-labelledby="page-header-products-dropdown"
        style={{ display: isOpen ? 'block' : 'none' }}
      >
        <span className="dropdown-item disabled d-flex align-items-center" aria-disabled="true">
          <i className="bx bxl-apple align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">
            iOS App <span className="text-muted">(Coming Soon)</span>
          </span>
        </span>
        <span className="dropdown-item disabled d-flex align-items-center" aria-disabled="true">
          <i className="bx bx-desktop align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">
            MacOS App <span className="text-muted">(Coming Soon)</span>
          </span>
        </span>

        {/* Synchronization Tools accordion */}
        <a
          className="dropdown-item d-flex align-items-center justify-content-between"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setIsSyncToolsOpen(!isSyncToolsOpen);
          }}
          aria-expanded={isSyncToolsOpen}
        >
          <span className="d-flex align-items-center">
            <i className="bx bx-sync align-middle me-2" style={{ fontSize: '18px' }}></i>
            <span className="align-middle">Synchronization Tools</span>
          </span>
          <i
            className={`bx align-middle ${isSyncToolsOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}
            style={{ fontSize: '18px' }}
            aria-hidden="true"
          />
        </a>
        {isSyncToolsOpen && (
          <>
            <span className="dropdown-item disabled d-flex align-items-center ps-4" aria-disabled="true">
              <i className="bx bxl-apple align-middle me-2" style={{ fontSize: '18px' }}></i>
              <span className="align-middle">
                MacOS Sync <span className="text-muted">(Coming Soon)</span>
              </span>
            </span>
            <span className="dropdown-item disabled d-flex align-items-center ps-4" aria-disabled="true">
              <i className="bx bxl-windows align-middle me-2" style={{ fontSize: '18px' }}></i>
              <span className="align-middle">
                Windows Sync <span className="text-muted">(Coming Soon)</span>
              </span>
            </span>
            <span className="dropdown-item disabled d-flex align-items-center ps-4" aria-disabled="true">
              <i className="bx bxl-tux align-middle me-2" style={{ fontSize: '18px' }}></i>
              <span className="align-middle">
                Linux Sync <span className="text-muted">(Coming Soon)</span>
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
