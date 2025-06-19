import { useEffect, useState } from "react";
import posterImg from "../assets/poster.jpg";
import "../styles/Intro.css";

export default function Intro({ onFinish }) {
const [stage, setStage] = useState(1);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setStage(2); // 포스터 어두워지기
    }, 1000);

    const timer2 = setTimeout(() => {
      setVisible(false); // 인트로 사라짐
      setTimeout(onFinish, 800);
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  return (
    <div className={`intro-wrapper ${visible ? "visible" : "hidden"}`}>
      <img src={posterImg} alt="poster" className="intro-img" />
      <div className={`intro-overlay ${stage >= 2 ? "darken" : ""}`} />
      {stage >= 2 && (
        <div className="intro-content">
          <h1 className="intro-title">WALK GUARDIANS</h1>
          <p className="intro-sub">우리가 지키는 길, 모두를 위한 도로</p>
        </div>
      )}
    </div>
  );
}