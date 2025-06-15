import React, { useState } from "react";
import {
  Card, CardBody, CardTitle, Progress, Input
} from "reactstrap";

function App() {
  const [image, setImage] = useState(null);
  const [danger, setDanger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [imageName, setImageName] = useState("");

  const predict = async (file, url, name) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8080/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      const score = (data.danger_score * 100).toFixed(1);
      setDanger(score);
      setHistory((prev) => [...prev, { image: url, danger: score, name }].slice(-10));
    } catch (error) {
      console.error("예측 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);
    setImageName(file.name);
    setDanger(null);
    setLoading(true);
    await predict(file, imageUrl, file.name);
  };

  const getColor = (score) => {
    if (score >= 80) return "danger";
    if (score >= 50) return "warning";
    return "success";
  };

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        backgroundColor: "#f0f4fa",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
        boxSizing: "border-box",
      }}
    >
      <Card
        className="shadow"
        style={{
          width: "100%",
          maxWidth: "600px",
          borderRadius: "20px",
          padding: "2rem",
          boxSizing: "border-box",
        }}
      >
        <CardBody>
          <CardTitle tag="h3" className="text-center mb-4" style={{ color: '#007bff' }}>
            🚧 위험도 예측기
          </CardTitle>

          <Input
            key={Date.now()}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            onClick={(e) => e.target.value = null}
            className="mb-3"
          />

          {image && (
            <img
              src={image}
              alt="preview"
              style={{
                width: "100%",
                height: "300px",
                objectFit: "cover",
                borderRadius: "12px",
                opacity: loading ? 0.4 : 1,
                transition: "opacity 0.3s ease",
              }}
              className="mb-3"
            />
          )}

          {imageName && !loading && (
            <div className="text-center text-muted mb-2" style={{ fontSize: "0.9rem" }}>
              파일명: {imageName}
            </div>
          )}

          {loading ? (
            <div className="text-center my-3">
              <div className="spinner-border text-primary" role="status" />
              <div className="mt-2">예측 중입니다...</div>
            </div>
          ) : (
            danger && (
              <>
                <h5 className="text-center mb-2">
                  예측된 위험도: <b style={{ color: getColor(danger) === 'danger' ? "#e74c3c" : getColor(danger) === 'warning' ? "#f39c12" : "#28a745" }}>{danger}%</b>
                </h5>
                <Progress
                  value={danger}
                  color={getColor(danger)}
                  style={{ height: "20px", borderRadius: "10px" }}
                />
                <div className="text-center mt-4">
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => {
                      setLoading(true);
                      predict(new File([], imageName), image, imageName);
                    }}
                  >
                    🔁 다시 예측하기
                  </button>
                </div>
              </>
            )
          )}
        </CardBody>
      </Card>

      {history.length > 0 && (
        <Card
          className="shadow mt-4"
          style={{
            width: "100%",
            maxWidth: "600px",
            borderRadius: "20px",
            padding: "1.5rem",
            boxSizing: "border-box",
          }}
        >
          <CardBody>
            <CardTitle tag="h5" className="mb-3">
              🏠 최근 예측 기록
            </CardTitle>
            {history.map((item, index) => (
              <div key={index} className="mb-4">
                <img
                  src={item.image}
                  alt={`예측 ${index}`}
                  style={{ width: "100%", borderRadius: "10px", marginBottom: "0.5rem" }}
                />
                <div>파일명: <b>{item.name}</b></div>
                <div>위험도: <b>{item.danger}%</b></div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default App;
