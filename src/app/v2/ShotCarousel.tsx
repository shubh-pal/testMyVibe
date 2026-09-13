"use client";

import { useEffect, useState } from "react";
import styles from "./v2.module.css";

const SHOTS = [
  { src: "/assets/shots/dashboard.png", alt: "Overview: flows, audit runs, and issue status at a glance" },
  { src: "/assets/shots/kanban.png", alt: "Issue board: approve or reject findings by severity" },
  { src: "/assets/shots/graph.png", alt: "Feature graph: discovered surface area, mapped and scored" },
  { src: "/assets/shots/flows.png", alt: "User flows: auto-discovered journeys through your product" },
  { src: "/assets/shots/settings.png", alt: "Settings: connect your AI tool and schedule the quality loop" },
  { src: "/assets/shots/organization.png", alt: "Organization: manage workspace members and access" },
];

const INTERVAL_MS = 3400;

export default function ShotCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SHOTS.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.carousel}>
      {SHOTS.map((shot, i) => (
        <img
          key={shot.src}
          src={shot.src}
          alt={shot.alt}
          className={`${styles.carouselImg} ${i === index ? styles.carouselImgActive : ""}`}
        />
      ))}
      <div className={styles.carouselDots}>
        {SHOTS.map((shot, i) => (
          <button
            key={shot.src}
            type="button"
            aria-label={`Show ${shot.alt}`}
            className={i === index ? styles.carouselDotActive : styles.carouselDot}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
