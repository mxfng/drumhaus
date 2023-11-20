"use client";

import React, { useEffect, useState } from "react";

const Scaler: React.FC<any> = ({ children }) => {
  const [scaleFactor, setScaleFactor] = useState(1);

  useEffect(() => {
    const updateScaleFactor = () => {
      const maxWidth = 1538; // Your component's maximum width
      const pageWidth = window.innerWidth;

      // Calculate the proportional scale factor
      const newScaleFactor = Math.min(1, pageWidth / maxWidth);

      setScaleFactor(newScaleFactor);
    };

    // Update the scale factor on page resize
    window.addEventListener("resize", updateScaleFactor);

    // Initial setup
    updateScaleFactor();

    return () => {
      // Remove the event listener on component unmount
      window.removeEventListener("resize", updateScaleFactor);
    };
  }, []);

  return (
    <div
      style={{
        transform: `scale(${scaleFactor})`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );
};

export default Scaler;
