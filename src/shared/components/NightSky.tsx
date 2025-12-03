import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  size: number;
}

export const NightSky: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const rotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Setup canvas size
    const updateSize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    updateSize();

    // Generate stars
    const starCount = 2000;
    const stars: Star[] = [];

    for (let i = 0; i < starCount; i++) {
      const colorVariation = Math.random();
      stars.push({
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10,
        r: 0.8 + colorVariation * 0.2,
        g: 0.8 + colorVariation * 0.2,
        b: 0.9 + colorVariation * 0.1,
        size: Math.random() * 2 + 0.5,
      });
    }
    starsRef.current = stars;

    // 3D rotation helpers
    const rotateY = (x: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: x * cos - z * sin,
        z: x * sin + z * cos,
      };
    };

    const rotateX = (y: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        y: y * cos - z * sin,
        z: y * sin + z * cos,
      };
    };

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const width = window.innerWidth;
      const height = window.innerHeight;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update rotation
      rotationRef.current.y += 0.0001;
      rotationRef.current.x += 0.00005;

      // Twinkling effect
      const time = Date.now() * 0.001;
      const baseOpacity = 0.7 + Math.sin(time * 0.5) * 0.1;

      // Draw stars
      stars.forEach((star) => {
        // Apply rotation
        let { x, z } = rotateY(star.x, star.z, rotationRef.current.y);
        let { y } = rotateX(star.y, z, rotationRef.current.x);
        ({ y, z } = rotateX(y, z, rotationRef.current.x));

        // Simple perspective projection
        const fov = 2;
        const scale = fov / (fov + z);
        const x2d = x * scale * width * 0.15 + width / 2;
        const y2d = y * scale * height * 0.15 + height / 2;

        // Size with perspective
        const size = star.size * scale * 2;

        // Skip if behind camera or off-screen
        if (z < -fov || size < 0.1) return;
        if (x2d < -50 || x2d > width + 50 || y2d < -50 || y2d > height + 50)
          return;

        // Draw star with glow effect (Minecraft-style squares)
        const opacity = baseOpacity * (0.6 + scale * 0.4);
        ctx.globalCompositeOperation = "lighter"; // Additive blending

        // Glow (larger square)
        const glowSize = size * 1.5;
        ctx.fillStyle = `rgba(${star.r * 255}, ${star.g * 255}, ${star.b * 255}, ${opacity * 0.3})`;
        ctx.fillRect(
          x2d - glowSize,
          y2d - glowSize,
          glowSize * 2,
          glowSize * 2,
        );

        // Core (sharp square)
        ctx.fillStyle = `rgba(${star.r * 255}, ${star.g * 255}, ${star.b * 255}, ${opacity})`;
        ctx.fillRect(x2d - size, y2d - size, size * 2, size * 2);
      });

      ctx.globalCompositeOperation = "source-over";
    };

    animate();

    // Handle resize
    const handleResize = () => {
      updateSize();
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{
        width: "100vw",
        height: "100vh",
      }}
    />
  );
};
