import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { Card, CardBody, CardTitle, Progress, Input, Button, ButtonGroup, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import History from "./HistoryItem";
import NavBar from "./NavBar";

function App() {
  const [image, setImage] = useState(null);
  const [imageName, setImageName] = useState("");
  const [fullBlindRisk, setFullBlindRisk] = useState(null);
  const [fullWeRisk, setFullWeRisk] = useState(null);
  const [coco, setCoco] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const [mode, setMode] = useState('all');

  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);
  const toggleWarning = () => setShowWarning(v => !v);

  // 이미지 변경 시 캔버스 초기화
  useLayoutEffect(() => {
    const cvs = canvasRef.current;
    if (cvs) {
      const ctx = cvs.getContext("2d");
      ctx.clearRect(0, 0, cvs.width, cvs.height);
    }
  }, [image]);

  // 예측 요청 함수
  async function predict(file, url, name) {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("https://3241-119-192-184-47.ngrok-free.app/predict?group=all", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`서버 에러 ${res.status}`);
      const data = await res.json();

      setFullBlindRisk(data.blind_risk);
      setFullWeRisk(data.we_risk);
      setCoco(data.coco_output);
      setExplanation(data.explanation);
      if (data.blind_risk >= 80 || data.we_risk >= 80) {
             setShowWarning(true);
          }
      setHistory(prev => [
        {
          image: url,
          name,
          blind: data.blind_risk.toFixed(1),
          we: data.we_risk.toFixed(1),
          coco: data.coco_output,
          explanation: data.explanation,
        },
        ...prev,
      ].slice(0, 10));
    } catch (err) {
      console.error("Predict error:", err);
    } finally {
      setLoading(false);
    }
  }

  // 파일 업로드 핸들러
  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result;
      setImage(url);
      setImageName(file.name);
      setFullBlindRisk(null);
      setFullWeRisk(null);
      setCoco(null);
      setExplanation("");
      predict(file, url, file.name);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    if (!coco) return;
    console.group("🚀 COCO Payload Debug");
    console.log("전체 이미지 정보:", coco.images);
    console.log("첫 번째 이미지 크기:", coco.images[0].width, coco.images[0].height);
    console.log("어노테이션 개수:", coco.annotations.length);
    console.log("첫 어노테이션 예시:", coco.annotations[10]);
    console.groupEnd();
  }, [coco]);

  // 캔버스 오버레이 드로잉 로직
  const drawOverlays = useCallback(() => {
    if (!coco || !imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    if (!img.complete) return;
    const cvs = canvasRef.current;

    // 화면에 보이는 크기
    const dispW = img.clientWidth;
    const dispH = img.clientHeight;
    // COCO 원본 이미지 크기
    const origW = coco.images[0].width;
    const origH = coco.images[0].height;

    // 캔버스 버퍼 및 CSS 크기 동기화
    cvs.width = dispW;
    cvs.height = dispH;
    cvs.style.width = `${dispW}px`;
    cvs.style.height = `${dispH}px`;

    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, dispW, dispH);

    // 스케일 계산
    const scaleX = dispW / origW;
    const scaleY = dispH / origH;

    // category 맵, 색변환 헬퍼
    const categoryMap = Object.fromEntries(coco.categories.map(c => [c.id, c.name]));
    const hex2rgba = (hex, a = 0.25) => {
      const [r, g, b] = hex.replace("#", "").match(/.{2}/g).map(x => parseInt(x, 16));
      return `rgba(${r},${g},${b},${a})`;
    };
    const COLOR_MAP = {
      "Tactile Paving": "#FFD600",
      Crosswalk: "#FFFFFF",
      Sidewalk: "#4CAF50",
      "Mixed Road and Sidewalk": "#8BC34A",
      Car: "#FF5722",
      Bicycle: "#03A9F4",
      Motorcycle: "#FF9800",
      "Tree Pole": "#795548",
      "Utility Pole": "#9E9E9E",
      Advertisement: "#FFEB3B",
      "Transportation Stop": "#3F51B5",
      Bollard: "#E91E63",
    };

    // segmentation 마스크
    ctx.globalCompositeOperation = "source-over";
    coco.annotations.forEach(ann => {
      if (!ann.segmentation) return;
      const label = categoryMap[ann.category_id] || "Unknown";
      ctx.fillStyle = hex2rgba(COLOR_MAP[label] || "#F44336", 0.25);
      ann.segmentation.forEach(poly => {
        ctx.beginPath();
        for (let i = 0; i < poly.length; i += 2) {
          const x = poly[i] * scaleX;
          const y = poly[i + 1] * scaleY;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      });
    });

    // bbox + label
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = "bold 13px 'Segoe UI', Arial";
    coco.annotations.forEach(ann => {
      if (!ann.bbox) return;
      const [x, y, w, h] = ann.bbox;
      const x1 = x * scaleX;
      const y1 = y * scaleY;
      const bw = w * scaleX;
      const bh = h * scaleY;
      const label = categoryMap[ann.category_id] || "Unknown";
      const color = COLOR_MAP[label] || "#00BCD4";
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.strokeRect(x1, y1, bw, bh);
      const padding = 4;
      const textW = ctx.measureText(label).width;
      const textH = 13;
      let textY = y1 - textH - padding * 2;
      if (textY < 0) textY = y1 + padding;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x1, textY, textW + padding * 2, textH + padding);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x1 + padding, textY + padding / 2);
    });
  }, [coco]);

  useEffect(() => {
    drawOverlays();
  }, [drawOverlays]);

  const getColor = score => (score >= 80 ? "danger" : score >= 50 ? "warning" : "success");
  const displayBlind = fullBlindRisk != null && (mode === 'all' || mode === 'blind');
  const displayWe = fullWeRisk != null && (mode === 'all' || mode === 'we');
  const showBlindVal = fullBlindRisk?.toFixed(1);
  const showWeVal = fullWeRisk?.toFixed(1);

  return (
    <div style={{ width: "100vw", minHeight: "100vh", backgroundColor: "#f0f4fa", display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem", boxSizing: "border-box" }}>
      <Modal isOpen={showWarning} toggle={toggleWarning}>
        <ModalHeader toggle={toggleWarning}>⚠️ 높은 위험도 경고</ModalHeader>
        <ModalBody>
          위험도가 80% 이상입니다.<br/>
          이 구간은 우회하세요!
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={toggleWarning}>확인</Button>
        </ModalFooter>
      </Modal>
      <NavBar />
      <Card className="shadow" style={{ width: "100%", maxWidth: "600px", borderRadius: "20px", padding: "2rem" }}>
        <CardBody>
          <CardTitle tag="h3" className="text-center mb-4" style={{ color: "#007bff" }}>
            위험도 예측기
          </CardTitle>

          <Input type="file" accept="image/*" onChange={handleUpload} onClick={e => e.target.value = null} className="mb-3" />

          <ButtonGroup className="mb-3 w-100">
            {[{ key: 'all', label: '전체' }, { key: 'blind', label: '시각장애인' }, { key: 'we', label: '휠체어/고령자' }].map(opt => (
              <Button key={opt.key} outline={mode !== opt.key} color="primary" onClick={() => setMode(opt.key)} style={{ flex: 1 }}>
                {opt.label}
              </Button>
            ))}
          </ButtonGroup>

          <div style={{ position: "relative", width: "100%" }} className="mb-3">
            {image && (
              <>
                <img
                  ref={imgRef}
                  src={image}
                  alt="preview"
                  style={{ width: "100%", borderRadius: "12px", opacity: loading ? 0.4 : 1, transition: "opacity 0.3s" }}
                  onLoad={drawOverlays}
                />
                <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, borderRadius: "12px", pointerEvents: "none" }} />
              </>
            )}
          </div>

          {/* 설명 텍스트 */}
          {!loading && explanation && (
            <p
                className="text-center mb-3"
                style={{
                  color: "#555",
                  whiteSpace: "pre-line"   // ← 이 한 줄만 추가!
                }}
              >
                {explanation}
              </p>
          )}

          {loading && (
            <div className="text-center my-3">
              <div className="spinner-border text-primary" role="status" />
              <div className="mt-2">예측 중입니다...</div>
            </div>
          )}

          {!loading && displayBlind && (
            <>
              <h5 className="text-center mb-2">
                시각장애인 위험도: <b style={{ color: getColor(showBlindVal) === 'danger' ? '#e74c3c' : getColor(showBlindVal) === 'warning' ? '#f39c12' : '#28a745' }}>{showBlindVal}%</b>
              </h5>
              <Progress value={showBlindVal} color={getColor(showBlindVal)} style={{ height: "12px", borderRadius: "6px" }} />
            </>
          )}

          {!loading && displayWe && (
            <>
              <h5 className="text-center my-3">
                휠체어/고령자 위험도: <b style={{ color: getColor(showWeVal) === 'danger' ? '#e74c3c' : getColor(showWeVal) === 'warning' ? '#f39c12' : '#28a745' }}>{showWeVal}%</b>
              </h5>
              <Progress value={showWeVal} color={getColor(showWeVal)} style={{ height: "12px", borderRadius: "6px" }} />
            </>
          )}

          <div className="text-center mt-4">
            <Button outline color="primary" onClick={() => selectedFile && predict(selectedFile, image, imageName)}>
              다시 예측하기
            </Button>
          </div>
        </CardBody>
      </Card>

      {history.length > 0 && (
        <Card className="shadow mt-4" style={{ width: "100%", maxWidth: "600px", borderRadius: "20px", padding: "1.5rem" }}>
          <CardBody>
            <CardTitle tag="h5" className="mb-3">최근 예측 기록</CardTitle>
            {history.map((item, idx) => (
              <History key={idx} item={item} width={300} />
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default App;
