import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Card, CardBody, CardTitle, Progress, Input } from "reactstrap";
import HistoryItem from "./HistoryItem";
import NavBar from "./NavBar";

function App() {
  const [image, setImage] = useState(null);
  const [imageName, setImageName] = useState("");
  const [blindRisk, setBlindRisk] = useState(null);
  const [weRisk, setWeRisk] = useState(null);
  const [coco, setCoco] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  // 새 이미지 업로드 시 캔버스 초기화
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [image]);

  // 예측 요청
  const predict = async (file, url, name) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("https://781c-119-192-184-47.ngrok-free.app/predict", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`서버 에러 ${res.status}`);
      const data = await res.json();

      const b = data.blind_risk, w = data.we_risk;
      setBlindRisk(b.toFixed(1));
      setWeRisk(w.toFixed(1));
      setCoco(data.coco_output);

      // history: 최신이 위로
      setHistory(prev => [{ image: url, name, blind: b.toFixed(1), we: w.toFixed(1), coco: data.coco_output }, ...prev].slice(0, 10));
    } catch (err) {
      console.error("예측 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  // 파일 선택
  const handleUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result;
      setImage(url);
      setImageName(file.name);
      setBlindRisk(null);
      setWeRisk(null);
      setCoco(null);
      setLoading(true);
      predict(file, url, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Canvas 그리기
  useEffect(() => {
    if (!coco || !imgRef.current || !canvasRef.current) return;
    const imgEl = imgRef.current, canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = imgEl.width;
    canvas.height = imgEl.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = imgEl.width / coco.images[0].width;
    const scaleY = imgEl.height / coco.images[0].height;

    // 컬러맵
    const COLOR_MAP = {
      "Tactile Paving": "#FFD600",
      "Crosswalk":      "#FFFFFF",
      "Sidewalk":        "#4CAF50",
      "Mixed Road and Sidewalk": "#8BC34A",
      "Car":             "#FF5722",
      "Bicycle":         "#03A9F4",
      "Motorcycle":      "#FF9800",
      "Tree Pole":       "#795548",
      "Utility Pole":    "#9E9E9E",
      "Advertisement":   "#FFEB3B",
      "Transportation Stop": "#3F51B5",
      "Bollard":         "#E91E63",
    };

    // 헬퍼: hex → rgba
    const hex2rgba = (hex, a=0.25) => {
      const [r,g,b] = hex.replace("#","").match(/.{2}/g).map(x=>parseInt(x,16));
      return `rgba(${r},${g},${b},${a})`;
    };

    // Segmentation 마스크
    coco.annotations.forEach(ann => {
      if (!ann.segmentation) return;
      const label = coco.categories.find(c => c.id === ann.category_id).name;
      const maskColor = hex2rgba(COLOR_MAP[label]||"#F44336", 0.25);
      ctx.fillStyle = maskColor;
      ann.segmentation.forEach(seg => {
        ctx.beginPath();
        for (let i=0; i<seg.length; i+=2) {
          const x = seg[i]*scaleX, y = seg[i+1]*scaleY;
          i===0? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        }
        ctx.closePath();
        ctx.fill();
      });
    });

    // Bounding Box + Label
    const catMap = Object.fromEntries(coco.categories.map(c=>[c.id,c.name]));
    ctx.textBaseline = "top";
    ctx.textAlign    = "left";
    ctx.font         = "bold 13px 'Segoe UI', Arial";

    coco.annotations.forEach(ann => {
      if (!ann.bbox) return;
      const [x,y,w,h] = ann.bbox;
      const x1 = x*scaleX, y1 = y*scaleY, bw = w*scaleX, bh = h*scaleY;
      const label = catMap[ann.category_id] || "unknown";
      const color = COLOR_MAP[label] || "#00BCD4";

      // 박스: 얇은 실선
      ctx.lineWidth   = 1.5;
      ctx.strokeStyle = color;
      ctx.strokeRect(x1, y1, bw, bh);

      // 라벨 위치 계산 (위쪽 공간 부족하면 내부로)
      const padding = 4;
      const textW   = ctx.measureText(label).width;
      const textH   = 13; 
      let textY     = y1 - textH - padding*2;
      if (textY < 0) textY = y1 + padding;

      // 라벨 배경 (둥근 모서리 간단 처리)
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x1, textY, textW + padding*2, textH + padding);

      // 텍스트
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x1 + padding, textY + padding/2);
    });
  }, [coco]);

  const getColor = score => (score>=80? "danger": score>=50? "warning": "success");

  return (
    <div style={{
      width:"100vw", minHeight:"100vh", backgroundColor:"#f0f4fa",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"2rem", boxSizing:"border-box"
    }}>
      <NavBar />
      <Card className="shadow" style={{
        width:"100%", maxWidth:"600px", borderRadius:"20px", padding:"2rem"
      }}>
        <CardBody>
          <CardTitle tag="h3" className="text-center mb-4" style={{color:"#007bff"}}>
            위험도 예측기
          </CardTitle>

          <Input
            type="file" accept="image/*"
            onChange={handleUpload}
            onClick={e=>e.target.value=null}
            className="mb-3"
          />

          <div style={{position:"relative", width:"100%", height:"300px"}} className="mb-3">
            {image && <>
              <img
                ref={imgRef}
                src={image}
                alt="preview"
                style={{
                  width:"100%", height:"100%",
                  objectFit:"cover", borderRadius:"12px",
                  opacity:loading?0.4:1, transition:"opacity 0.3s"
                }}
              />
              <canvas
                ref={canvasRef}
                style={{position:"absolute", top:0, left:0, borderRadius:"12px", pointerEvents:"none"}}
              />
            </>}
          </div>

          {loading ? (
            <div className="text-center my-3">
              <div className="spinner-border text-primary" role="status"/>
              <div className="mt-2">예측 중입니다...</div>
            </div>
          ) : blindRisk!==null && weRisk!==null ? (
            <>
              <h5 className="text-center mb-2">
                시각장애인 위험도:&nbsp;
                <b style={{color:getColor(blindRisk)==="danger"?"#e74c3c":getColor(blindRisk)==="warning"?"#f39c12":"#28a745"}}>
                  {blindRisk}%
                </b>
              </h5>
              <Progress value={blindRisk} color={getColor(blindRisk)} style={{height:"12px",borderRadius:"6px"}}/>

              <h5 className="text-center my-3">
                휠체어/고령자 위험도:&nbsp;
                <b style={{color:getColor(weRisk)==="danger"?"#e74c3c":getColor(weRisk)==="warning"?"#f39c12":"#28a745"}}>
                  {weRisk}%
                </b>
              </h5>
              <Progress value={weRisk} color={getColor(weRisk)} style={{height:"12px",borderRadius:"6px"}}/>

              <div className="text-center mt-4">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => {
                    if (!selectedFile) return;
                    setLoading(true);
                    predict(selectedFile, image, imageName);
                  }}
                >
                  다시 예측하기
                </button>
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      {history.length>0 && (
        <Card className="shadow mt-4" style={{
          width:"100%", maxWidth:"600px", borderRadius:"20px", padding:"1.5rem"
        }}>
          <CardBody>
            <CardTitle tag="h5" className="mb-3">최근 예측 기록</CardTitle>
            {history.map((item,idx)=>
              <HistoryItem key={idx} item={item} width={300} height={200}/>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default App;
