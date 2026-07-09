import { useState, useRef } from "react";
import { Camera, Shield, CheckCircle, XCircle, Scan } from "lucide-react";
import { apiRequest } from "../api";

interface FaceVerificationProps {
  mode: "register" | "verify";
  roleKey: string;
  onComplete?: (success: boolean) => void;
  compact?: boolean;
  onCustomVerify?: (imageData: string) => Promise<void>;
  loading?: boolean;
}

export function FaceVerification({ mode, roleKey, onComplete, compact, onCustomVerify, loading: externalLoading }: FaceVerificationProps) {
  const [step, setStep] = useState<"idle" | "camera" | "processing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [registered, setRegistered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = s;
      setStep("camera");
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      setMessage("Camera access denied. Enable camera permissions.");
      setStep("error");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const captureAndSend = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, 640, 480);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    setStep("processing");

    try {
      if (mode === "register") {
        await apiRequest("/api/v1/auth/face/register", {
          method: "POST",
          body: JSON.stringify({ image_data: dataUrl }),
        });
        setRegistered(true);
        setStep("done");
        setMessage("Face registered successfully!");
        onComplete?.(true);
      } else if (onCustomVerify) {
        await onCustomVerify(dataUrl);
        setStep("done");
        setMessage("Face verified! Access granted.");
        onComplete?.(true);
      } else {
        await apiRequest("/api/v1/auth/face/verify", {
          method: "POST",
          body: JSON.stringify({ image_data: dataUrl }),
        });
        setStep("done");
        setMessage("Face verified! Access granted.");
        onComplete?.(true);
      }
    } catch (err: any) {
      setStep("error");
      setMessage(err.message || "Face verification failed. Try again with better lighting.");
      onComplete?.(false);
    }
  };

  const reset = () => {
    stopCamera();
    setStep("idle");
    setMessage("");
  };

  if (step === "done") {
    return (
      <div style={{ display: "grid", gap: 10, textAlign: "center", padding: compact ? 8 : 16 }}>
        <div style={{ fontSize: 48, color: "#10b981" }}>
          <CheckCircle size={48} />
        </div>
        <strong style={{ color: "#6ee7b7" }}>{message}</strong>
        {mode === "register" && registered && (
          <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
            Your face is now linked to your account for secure login.
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {step === "camera" ? (
        <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", position: "relative" }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", maxHeight: compact ? 200 : 300, objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "3px solid rgba(102,126,234,0.5)",
              borderRadius: 12,
              pointerEvents: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8, padding: 8, justifyContent: "center" }}>
            <button type="button" className="tool-button primary" onClick={captureAndSend}>
              <Camera size={15} /> {mode === "register" ? "Register Face" : "Verify Face"}
            </button>
            <button type="button" className="tool-button" onClick={reset}>
              <XCircle size={15} /> Cancel
            </button>
          </div>
        </div>
      ) : step === "processing" || externalLoading ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: "0 auto 12px" }} />
          <span style={{ color: "var(--muted)" }}>Processing face...</span>
        </div>
      ) : step === "error" ? (
        <div style={{ textAlign: "center", padding: 16 }}>
          <XCircle size={32} style={{ color: "#ef4444", margin: "0 auto 8px", display: "block" }} />
          <span style={{ color: "#fca5a5", fontSize: "0.88rem" }}>{message}</span>
          <button type="button" className="tool-button" onClick={reset} style={{ marginTop: 8 }}>
            Try Again
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <button type="button" className={`tool-button ${mode === "register" ? "primary" : ""}`} onClick={startCamera}>
            <Scan size={15} />
            {mode === "register" ? "Register Your Face" : "Verify Your Face"}
          </button>
          {!compact && (
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              {mode === "register"
                ? "Register your face for passwordless/login verification. Good lighting required."
                : "Look directly at the camera to verify your identity."}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
