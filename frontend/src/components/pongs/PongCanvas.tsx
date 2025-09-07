// src/components/pongs/PongCanvas.tsx
"use client";

import { useEffect, useRef } from "react";

export default function PongCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    function resize() {
      const parent = canvas.parentElement!;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const ball = { x: 100, y: 100, r: 8, vx: 3, vy: 4 };
    const top = { x: 50, y: 20, w: 100, h: 8 };
    const bottom = { x: 50, y: 0, w: 100, h: 8 };

    function loop() {
      const W = canvas.width;
      const H = canvas.height;
      bottom.y = H - 28;

      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.x <= ball.r || ball.x >= W - ball.r) ball.vx *= -1;

      const ct = top.x + top.w / 2;
      const cb = bottom.x + bottom.w / 2;
      if (ct < ball.x - 10) top.x += 3; else if (ct > ball.x + 10) top.x -= 3;
      if (cb < ball.x - 10) bottom.x += 3; else if (cb > ball.x + 10) bottom.x -= 3;
      top.x = Math.max(0, Math.min(W - top.w, top.x));
      bottom.x = Math.max(0, Math.min(W - bottom.w, bottom.x));

      const hit = (p: { x: number; y: number; w: number; h: number }) =>
        ball.x - ball.r < p.x + p.w &&
        ball.x + ball.r > p.x &&
        ball.y - ball.r < p.y + p.h &&
        ball.y + ball.r > p.y;

      if (hit(top) || hit(bottom)) {
        ball.vy *= -1;
        ball.vx += (Math.random() - 0.5) * 1.2;
      }

      if (ball.y < 0 || ball.y > H) {
        ball.x = W / 2;
        ball.y = H / 2;
        ball.vx = (Math.random() - 0.5) * 6;
        ball.vy = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 2);
      }

      ctx.fillStyle = "#2563eb";
      ctx.fillRect(0, 0, W, H);

      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#fff";
      ctx.fillRect(top.x, top.y, top.w, top.h);
      ctx.fillRect(bottom.x, bottom.y, bottom.w, bottom.h);

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="w-full h-full" />;
}