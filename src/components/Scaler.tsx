"use client";

import React, { useState, useEffect, useRef } from "react";

const Scaler: React.FC<any> = ({ minW, maxW, children }) => {
  const [scale, setScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (container) {
        const windowW = Math.max(window.innerWidth, minW);
        const newScale = windowW >= maxW ? 1 : windowW / maxW;
        setScale(newScale);
      }
    };

    window.addEventListener("resize", handleResize);

    handleResize(); // Initial scaling on component mount

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ transform: `scale(${scale})` }}>
      {children}
    </div>
  );
};

export default Scaler;
