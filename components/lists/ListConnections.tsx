'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface List {
  id: string;
  title: string;
  parentId: string | null;
  parent?: {
    id: string;
    title: string;
  } | null;
}

interface ListConnectionsProps {
  lists: List[];
  children: ReactNode;
}

export default function ListConnections({ lists, children }: ListConnectionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [connections, setConnections] = useState<Array<{ from: DOMRect; to: DOMRect; parentId: string; childId: string }>>([]);

  useEffect(() => {
    const updateConnections = () => {
      if (!containerRef.current || !svgRef.current) return;

      // Find the row container
      const rowContainer = containerRef.current.querySelector('.row');
      if (!rowContainer) return;

      const newConnections: Array<{ from: DOMRect; to: DOMRect; parentId: string; childId: string }> = [];
      
      lists.forEach((list) => {
        if (list.parentId) {
          const parentElement = rowContainer.querySelector(`[data-list-id="${list.parentId}"]`);
          const childElement = rowContainer.querySelector(`[data-list-id="${list.id}"]`);
          
          if (parentElement && childElement) {
            const parentRect = parentElement.getBoundingClientRect();
            const childRect = childElement.getBoundingClientRect();
            const containerRect = containerRef.current!.getBoundingClientRect();
            
            // Calculate relative positions
            const from = new DOMRect(
              parentRect.left - containerRect.left + parentRect.width / 2,
              parentRect.top - containerRect.top + parentRect.height,
              parentRect.width,
              parentRect.height
            );
            
            const to = new DOMRect(
              childRect.left - containerRect.left + childRect.width / 2,
              childRect.top - containerRect.top,
              childRect.width,
              childRect.height
            );
            
            newConnections.push({
              from,
              to,
              parentId: list.parentId,
              childId: list.id,
            });
          }
        }
      });
      
      setConnections(newConnections);
      
      // Update SVG size
      if (svgRef.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        svgRef.current.setAttribute('width', containerRect.width.toString());
        svgRef.current.setAttribute('height', containerRect.height.toString());
      }
    };

    updateConnections();
    
    window.addEventListener('resize', updateConnections);
    window.addEventListener('scroll', updateConnections, true);
    
    // Use MutationObserver to watch for layout changes
    const observer = new MutationObserver(updateConnections);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    // Small delay to ensure layout is complete
    const timeoutId = setTimeout(updateConnections, 100);

    return () => {
      window.removeEventListener('resize', updateConnections);
      window.removeEventListener('scroll', updateConnections, true);
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [lists]);

  return (
    <div className="position-relative" ref={containerRef}>
      {children}
      {connections.length > 0 && (
        <div
          className="position-absolute"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
      <svg
        ref={svgRef}
        className="position-absolute"
        style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill="#0d6efd"
              opacity="0.6"
            />
          </marker>
        </defs>
        {connections.map((conn, index) => {
          const dx = conn.to.left - conn.from.left;
          const dy = conn.to.top - conn.from.top;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Control points for curved line
          const controlX1 = conn.from.left;
          const controlY1 = conn.from.top + Math.min(dy / 2, 50);
          const controlX2 = conn.to.left;
          const controlY2 = conn.to.top - Math.min(dy / 2, 50);
          
          return (
            <path
              key={`${conn.parentId}-${conn.childId}-${index}`}
              d={`M ${conn.from.left} ${conn.from.top} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${conn.to.left} ${conn.to.top}`}
              stroke="#0d6efd"
              strokeWidth="2"
              fill="none"
              opacity="0.4"
              markerEnd="url(#arrowhead)"
              style={{
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
                // Highlight connected cards
                const rowContainer = containerRef.current?.querySelector('.row');
                if (rowContainer) {
                  const parentCard = rowContainer.querySelector(`[data-list-id="${conn.parentId}"]`);
                  const childCard = rowContainer.querySelector(`[data-list-id="${conn.childId}"]`);
                  parentCard?.classList.add('highlight-connection');
                  childCard?.classList.add('highlight-connection');
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.4';
                const rowContainer = containerRef.current?.querySelector('.row');
                if (rowContainer) {
                  const parentCard = rowContainer.querySelector(`[data-list-id="${conn.parentId}"]`);
                  const childCard = rowContainer.querySelector(`[data-list-id="${conn.childId}"]`);
                  parentCard?.classList.remove('highlight-connection');
                  childCard?.classList.remove('highlight-connection');
                }
              }}
            />
          );
        })}
      </svg>
      </div>
      )}
      <style jsx global>{`
        .highlight-parent {
          animation: pulse-highlight 2s ease-in-out;
          box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.3) !important;
        }
        
        .highlight-connection {
          transform: scale(1.02);
          transition: transform 0.2s;
          box-shadow: 0 4px 12px rgba(13, 110, 253, 0.2) !important;
        }
        
        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(13, 110, 253, 0.1);
          }
        }
      `}</style>
    </div>
  );
}
