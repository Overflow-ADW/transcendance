"use client";

import { useCallback, useEffect, useRef } from "react";

type Vec2 = { x: number; y: number };

export function PongCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // État du jeu conservé dans des refs (pas de re-render nécessaire)
  const ballRef = useRef<{ pos: Vec2; vel: Vec2; radius: number }>({
    pos: { x: 0, y: 0 },
    vel: { x: 3, y: 4 },
    radius: 8,
  });

  const topPaddleRef = useRef<{ x: number; y: number; w: number; h: number; speed: number }>({
    x: 0,
    y: 20,
    w: 100,
    h: 8,
    speed: 3,
  });

  const bottomPaddleRef = useRef<{ x: number; y: number; w: number; h: number; speed: number }>({
    x: 0,
    y: 0, // sera recalculé au resize
    w: 100,
    h: 8,
    speed: 3,
  });

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Recentrer les éléments
    topPaddleRef.current.x = canvas.width / 2 - topPaddleRef.current.w / 2;
    bottomPaddleRef.current.x = canvas.width / 2 - bottomPaddleRef.current.w / 2;
    bottomPaddleRef.current.y = canvas.height - 28;

    ballRef.current.pos.x = canvas.width / 2;
    ballRef.current.pos.y = canvas.height / 2;
  }, []);

  const resetBall = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ballRef.current.pos.x = canvas.width / 2;
    ballRef.current.pos.y = canvas.height / 2;
    ballRef.current.vel.y = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 2);
    ballRef.current.vel.x = (Math.random() - 0.5) * 4;
  }, []);

  const intersects = (bx: number, by: number, r: number, rx: number, ry: number, rw: number, rh: number) => {
    return (
      bx - r < rx + rw &&
      bx + r > rx &&
      by - r < ry + rh &&
      by + r > ry
    );
  };

  const update = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ball = ballRef.current;
    const top = topPaddleRef.current;
    const bottom = bottomPaddleRef.current;

    // Déplacement balle
    ball.pos.x += ball.vel.x;
    ball.pos.y += ball.vel.y;

    // Rebond gauche/droite
    if (ball.pos.x <= ball.radius || ball.pos.x >= canvas.width - ball.radius) {
      ball.vel.x = -ball.vel.x;
    }

    // Collision raquettes
    if (
      intersects(ball.pos.x, ball.pos.y, ball.radius, top.x, top.y, top.w, top.h) ||
      intersects(ball.pos.x, ball.pos.y, ball.radius, bottom.x, bottom.y, bottom.w, bottom.h)
    ) {
      ball.vel.y = -ball.vel.y;
      ball.vel.x += (Math.random() - 0.5) * 2; // légère variation horizontale
    }

    // Sortie haut/bas -> reset
    if (ball.pos.y < 0 || ball.pos.y > canvas.height) {
      resetBall();
    }

    // IA raquette du haut
    {
      const center = top.x + top.w / 2;
      if (center < ball.pos.x - 10) {
        top.x += top.speed;
      } else if (center > ball.pos.x + 10) {
        top.x -= top.speed;
      }
      top.x = Math.max(0, Math.min(canvas.width - top.w, top.x));
    }

    // IA raquette du bas
    {
      const center = bottom.x + bottom.w / 2;
      if (center < ball.pos.x - 10) {
        bottom.x += bottom.speed;
      } else if (center > ball.pos.x + 10) {
        bottom.x -= bottom.speed;
      }
      bottom.x = Math.max(0, Math.min(canvas.width - bottom.w, bottom.x));
    }
  }, [resetBall]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const ball = ballRef.current;
    const top = topPaddleRef.current;
    const bottom = bottomPaddleRef.current;

    // fond bleu
    ctx.fillStyle = "#2563eb"; // bg-blue-600
    ctx.fillRect(0, 0, width, height);

    // ligne centrale
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // raquettes
    ctx.fillStyle = "white";
    ctx.fillRect(top.x, top.y, top.w, top.h);
    ctx.fillRect(bottom.x, bottom.y, bottom.w, bottom.h);

    // balle
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const loop = useCallback(() => {
    update();
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
