import React, { useRef, useEffect } from "react";

export default function HistoryItem({ item, width, height }) {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!item.coco || !imgRef.current || !canvasRef.current) return;
    const imgEl = imgRef.current, canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const scaleX = width / item.coco.images[0].width;
    const scaleY = height / item.coco.images[0].height;

    const COLOR_MAP = {
      /* 위 App.js의 COLOR_MAP과 동일 */
      "Tactile Paving": "#FFD600", "Crosswalk":"#FFFFFF", "Sidewalk":"#4CAF50", "Mixed Road and Sidewalk":"#8BC34A",
      "Car":"#FF5722","Bicycle":"#03A9F4","Motorcycle":"#FF9800","Tree Pole":"#795548","Utility Pole":"#9E9E9E",
      "Advertisement":"#FFEB3B","Transportation Stop":"#3F51B5","Bollard":"#E91E63",
    };
    const hex2rgba = (hex,a=0.25)=>{
      const [r,g,b]=hex.replace("#","").match(/.{2}/g).map(x=>parseInt(x,16));
      return `rgba(${r},${g},${b},${a})`;
    };

    // mask
    ctx.globalCompositeOperation = "source-over";
    item.coco.annotations.forEach(ann=>{
      if (!ann.segmentation) return;
      const label = item.coco.categories.find(c=>c.id===ann.category_id).name;
      ctx.fillStyle = hex2rgba(COLOR_MAP[label]||"#F44336",0.25);
      ann.segmentation.forEach(seg=>{
        ctx.beginPath();
        for(let i=0;i<seg.length;i+=2){
          const x=seg[i]*scaleX, y=seg[i+1]*scaleY;
          i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.closePath(); ctx.fill();
      });
    });

    // bbox + label
    const catMap = Object.fromEntries(item.coco.categories.map(c=>[c.id,c.name]));
    ctx.textBaseline="top"; ctx.textAlign="left"; ctx.font="bold 12px 'Segoe UI'";

    item.coco.annotations.forEach(ann=>{
      if (!ann.bbox) return;
      const [x,y,w,h]=ann.bbox;
      const x1=x*scaleX, y1=y*scaleY, bw=w*scaleX, bh=h*scaleY;
      const label = catMap[ann.category_id]||"unknown";
      const color = COLOR_MAP[label]||"#00BCD4";

      // thin solid
      ctx.lineWidth=1.5; ctx.strokeStyle=color;
      ctx.strokeRect(x1,y1,bw,bh);

      // label pos clamp
      const padding=3;
      const textW=ctx.measureText(label).width;
      const textH=12;
      let textY=y1-textH-padding*2;
      if(textY<0) textY=y1+padding;

      ctx.fillStyle="rgba(0,0,0,0.6)";
      ctx.fillRect(x1,textY,textW+padding*2,textH+padding);

      ctx.fillStyle="#fff";
      ctx.fillText(label,x1+padding,textY+padding/2);
    });

  }, [item.coco]);

  return (
    <div style={{ marginBottom:"1rem" }}>
      <div style={{ position:"relative", width, height }}>
        <img
          ref={imgRef}
          src={item.image}
          alt={item.name}
          style={{ width, height, objectFit:"cover", display:"block" }}
        />
        <canvas
          ref={canvasRef}
          style={{ position:"absolute", top:0, left:0, pointerEvents:"none" }}
        />
      </div>
      <div>파일명: <b>{item.name}</b></div>
      <div>시각장애인 위험도: <b>{item.blind}%</b></div>
      <div>휠체어/고령자 위험도: <b>{item.we}%</b></div>
    </div>
  );
}
