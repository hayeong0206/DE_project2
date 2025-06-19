import React, { useRef, useEffect, useCallback } from "react";

export default function History({ item, width = 300 }) {
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  /** 이미지 로드 완료 & COCO 변경 시 캔버스 위에 overlay 그리기 */
  const drawOverlays = useCallback(() => {
    const img  = imgRef.current;
    const cvs  = canvasRef.current;
    const coco = item.coco;
    if (!img || !cvs || !coco || !img.complete) return;

    // 화면에 보이는 크기
    const dispW = img.clientWidth;
    const dispH = img.clientHeight;
    // COCO 원본 이미지 크기
    const origW = coco.images[0].width;
    const origH = coco.images[0].height;

    // 캔버스 버퍼 및 CSS 크기 동기화
    cvs.width  = dispW;
    cvs.height = dispH;
    cvs.style.width  = `${dispW}px`;
    cvs.style.height = `${dispH}px`;

    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, dispW, dispH);

    // COCO 좌표 → 화면 좌표 스케일
    const scaleX = dispW / origW;
    const scaleY = dispH / origH;

    // 카테고리 이름 매핑
    const categoryMap = Object.fromEntries(
      coco.categories.map(c => [c.id, c.name])
    );

    // 헥스 → rgba 변환
    const hex2rgba = (hex, a = 0.25) => {
      const [r, g, b] = hex.replace("#", "").match(/.{2}/g).map(x => parseInt(x, 16));
      return `rgba(${r},${g},${b},${a})`;
    };

    // COCO에서 사용한 컬러맵과 동일
    const COLOR_MAP = {
      "Tactile Paving": "#FFD600",
      Crosswalk:        "#FFFFFF",
      Sidewalk:         "#4CAF50",
      "Mixed Road and Sidewalk": "#8BC34A",
      Car:              "#FF5722",
      Bicycle:          "#03A9F4",
      Motorcycle:       "#FF9800",
      "Tree Pole":     "#795548",
      "Utility Pole":  "#9E9E9E",
      Advertisement:    "#FFEB3B",
      "Transportation Stop": "#3F51B5",
      Bollard:          "#E91E63",
    };

    // 1) Segmentation 마스크
    ctx.globalCompositeOperation = "source-over";
    coco.annotations.forEach(ann => {
      if (!ann.segmentation) return;
      const label     = categoryMap[ann.category_id] || "Unknown";
      const fillColor = hex2rgba(COLOR_MAP[label] || "#F44336", 0.25);
      ctx.fillStyle   = fillColor;

      ann.segmentation.forEach(poly => {
        ctx.beginPath();
        for (let i = 0; i < poly.length; i += 2) {
          const x = poly[i] * scaleX;
          const y = poly[i+1] * scaleY;
          ctx[i===0 ? 'moveTo' : 'lineTo'](x, y);
        }
        ctx.closePath();
        ctx.fill();
      });
    });

    // 2) Bounding Box + Label
    ctx.textBaseline = "top";
    ctx.textAlign    = "left";
    ctx.font         = "bold 12px 'Segoe UI', Arial";

    coco.annotations.forEach(ann => {
      if (!ann.bbox) return;
      const [x, y, w, h] = ann.bbox;
      const x1 = x * scaleX;
      const y1 = y * scaleY;
      const bw = w * scaleX;
      const bh = h * scaleY;

      const label = categoryMap[ann.category_id] || "Unknown";
      const color = COLOR_MAP[label] || "#00BCD4";

      // 박스 그리기
      ctx.lineWidth   = 1.5;
      ctx.strokeStyle = color;
      ctx.strokeRect(x1, y1, bw, bh);

      // 라벨 배경 + 텍스트
      const padding = 3;
      const textW   = ctx.measureText(label).width;
      const textH   = 12;
      let textY     = y1 - textH - padding * 2;
      if (textY < 0) textY = y1 + padding;

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x1, textY, textW + padding * 2, textH + padding);

      ctx.fillStyle = "#fff";
      ctx.fillText(label, x1 + padding, textY + padding / 2);
    });
  }, [item.coco]);

  // COCO 변경 또는 이미지 load 시 재드로잉
  useEffect(() => {
    drawOverlays();
  }, [drawOverlays]);

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ position: "relative", width: `${width}px` }}>
        <img
          ref={imgRef}
          src={item.image}
          alt={item.name}
          style={{ width: "100%", height: "auto", display: "block" }}
          onLoad={drawOverlays}
        />
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        />
      </div>
      <div>파일명: <b>{item.name}</b></div>
      <div>시각장애인 위험도: <b>{item.blind}%</b></div>
      <div>휠체어/고령자 위험도: <b>{item.we}%</b></div>
    </div>
  );
}