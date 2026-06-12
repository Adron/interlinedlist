'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { PRODUCTS } from '@/lib/products';

export default function ProductsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncToolsOpen, setIsSyncToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const apps = PRODUCTS.filter((p) => p.category === 'app');
  const syncTools = PRODUCTS.filter((p) => p.category === 'sync');

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

  const closeDropdown = () => setIsOpen(false);

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
        {apps.map((product) => (
          <Link
            key={product.slug}
            href={`/products/${product.slug}`}
            className="dropdown-item d-flex align-items-center"
            onClick={closeDropdown}
          >
            <i className={`bx ${product.icon} align-middle me-2`} style={{ fontSize: '18px' }}></i>
            <span className="align-middle">
              {product.name} <span className="text-muted">(Coming Soon)</span>
            </span>
          </Link>
        ))}

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
        {isSyncToolsOpen &&
          syncTools.map((product) => (
            <Link
              key={product.slug}
              href={`/products/${product.slug}`}
              className="dropdown-item d-flex align-items-center ps-4"
              onClick={closeDropdown}
            >
              <i
                className={`bx ${product.icon} align-middle me-2`}
                style={{ fontSize: '18px' }}
              ></i>
              <span className="align-middle">
                {product.name} <span className="text-muted">(Coming Soon)</span>
              </span>
            </Link>
          ))}

        <div className="dropdown-divider"></div>
        <Link
          href="/products"
          className="dropdown-item d-flex align-items-center"
          onClick={closeDropdown}
        >
          <i className="bx bx-grid-alt align-middle me-2" style={{ fontSize: '18px' }}></i>
          <span className="align-middle">All products</span>
        </Link>
      </div>
    </div>
  );
}
