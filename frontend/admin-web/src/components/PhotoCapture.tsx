import { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";

interface PhotoCaptureProps {
  onPhoto: (dataUrl: string) => void;
  initialPhoto?: string | null;
  compact?: boolean;
}

export function PhotoCapture({ onPhoto, initialPhoto, compact }: PhotoCaptureProps) {
  const [photo, setPhoto] = useState<string | null>(initialPhoto ?? null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 320 } },
      });
      setStream(s);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      alert("Camera not available. Use upload instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, 320, 320);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setPhoto(dataUrl);
    onPhoto(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const offsetX = (img.width - 320) / 2;
        const offsetY = (img.height - 320) / 2;
        ctx.drawImage(img, Math.max(0, offsetX), Math.max(0, offsetY), 320, 320, 0, 0, 320, 320);
        const cropped = canvas.toDataURL("image/jpeg", 0.8);
        setPhoto(cropped);
        onPhoto(cropped);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    onPhoto("");
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {showCamera ? (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000" }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", maxHeight: 240, objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 8, padding: 8, justifyContent: "center" }}>
            <button type="button" className="tool-button primary" onClick={capturePhoto}>
              <Camera size={15} /> Capture
            </button>
            <button type="button" className="tool-button" onClick={stopCamera}>
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      ) : photo ? (
        <div style={{ position: "relative", width: compact ? 80 : 140, height: compact ? 80 : 140 }}>
          <img
            src={photo}
            alt="Passport"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 999,
              border: "3px solid var(--primary)",
            }}
          />
          <button
            type="button"
            onClick={removePhoto}
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 24,
              height: 24,
              borderRadius: 999,
              border: "none",
              background: "#ef4444",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="tool-button" onClick={startCamera}>
            <Camera size={15} /> Take Photo
          </button>
          <button type="button" className="tool-button" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Upload
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFileUpload} />
        </div>
      )}
      <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
        {compact ? "" : "Passport-size photo required for all users"}
      </span>
    </div>
  );
}
