import React, { useState, useEffect, useCallback } from 'react';
import { useCollaboration } from '../contexts/CollaborationContext';
import './CollaborativeCursors.css';

interface CollaborativeCursorsProps {
  containerRef: React.RefObject<HTMLElement>;
  roomId: string;
  resourceType: 'dataset' | 'analysis';
  resourceId: string;
}

const CollaborativeCursors: React.FC<CollaborativeCursorsProps> = ({
  containerRef,
  roomId,
  resourceType,
  resourceId
}) => {
  const { cursors, updateCursor, isConnected, currentRoom } = useCollaboration();
  const [isTracking, setIsTracking] = useState(false);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isConnected || !currentRoom || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Only send updates if cursor is within the container
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      updateCursor(x, y);
    }
  }, [isConnected, currentRoom, containerRef, updateCursor]);

  const handleMouseEnter = useCallback(() => {
    setIsTracking(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsTracking(false);
    // Send cursor position outside the container to hide it
    if (isConnected && currentRoom) {
      updateCursor(-1, -1);
    }
  }, [isConnected, currentRoom, updateCursor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseEnter, handleMouseLeave, containerRef]);

  const visibleCursors = Object.values(cursors).filter(
    cursor => cursor.x >= 0 && cursor.y >= 0 && containerRef.current
  );

  if (!isConnected || !currentRoom || visibleCursors.length === 0) {
    return null;
  }

  return (
    <div className="collaborative-cursors">
      {visibleCursors.map(cursor => (
        <div
          key={cursor.userId}
          className="cursor-container"
          style={{
            position: 'absolute',
            left: cursor.x,
            top: cursor.y,
            pointerEvents: 'none',
            zIndex: 1000,
            transform: 'translate(-2px, -2px)'
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            className="cursor-icon"
            style={{ color: cursor.color }}
          >
            <path
              d="M7.4,2.5l8.8,8.8l-4.4,1.1l3.3,6.1l-2.2,1.2l-3.3-6.1l-2.2,4.4L7.4,2.5z"
              fill="currentColor"
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          
          <div 
            className="cursor-label"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.username}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CollaborativeCursors;