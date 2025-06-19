// src/components/SimpleSplash.jsx
import React, { useEffect } from "react";
import { motion } from "framer-motion";

export default function SimpleSplash({ src, onFinish }) {
  useEffect(() => {
    const t = setTimeout(onFinish, 3000);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <motion.img
      src={src}
      alt="Splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 3,
        ease: "easeInOut",
        times: [0, 0, 0.83, 1],
      }}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "650px",     // 카드 넓이(600px)보다 살짝 넓게
        height: "auto",     // 비율 유지
        objectFit: "contain",
        backgroundColor: "transparent",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    />
  );
}
