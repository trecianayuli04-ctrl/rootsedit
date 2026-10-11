// Web camera capture via getUserMedia. Renders a live <video> preview inside a
// fixed overlay (raw DOM — react-native-web runs on ReactDOM so this is valid on web).
// Returns a base64 JPEG data URL via onCapture. Shows a clear message if the
// camera is unavailable or permission is denied. The photo is a LIVE capture —
// never a profile image.
import { useEffect, useRef, useState } from "react";

const overlay: any = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 };
const panel: any = { background: "#fff", borderRadius: 20, padding: 16, width: "100%", maxWidth: 420, boxShadow: "0 12px 40px rgba(0,0,0,0.3)" };
const head: any = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 };
const xBtn: any = { border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: "#1C1B1A", lineHeight: 1 };
const btnBase: any = { flex: 1, minHeight: 48, borderRadius: 12, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer" };
const primaryBtn: any = { ...btnBase, background: "#1B5E20", color: "#fff" };
const ghostBtn: any = { ...btnBase, background: "#EAEAE8", color: "#1C1B1A" };

export function CameraSheet({
  visible,
  onClose,
  onCapture,
  title = "Ambil Foto Absen",
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  title?: string;
}) {
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  const stop = () => {
    try {
      streamRef.current?.getTracks?.().forEach((t: any) => t.stop());
    } catch {}
    streamRef.current = null;
  };

  useEffect(() => {
    if (!visible) return;
    setErr("");
    setReady(false);
    let active = true;
    (async () => {
      try {
        const md = (navigator as any)?.mediaDevices;
        if (!md?.getUserMedia) {
          setErr("Kamera tidak didukung di browser/perangkat ini.");
          return;
        }
        const stream = await md.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!active) {
          stream.getTracks().forEach((t: any) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        setErr("Izin kamera ditolak atau kamera tidak tersedia. Izinkan akses kamera lalu coba lagi.");
      }
    })();
    return () => {
      active = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = () => {
    stop();
    onClose();
  };

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.6);
    stop();
    onCapture(data);
  };

  if (!visible) return null;
  return (
    <div style={overlay} data-testid="camera-overlay">
      <div style={panel}>
        <div style={head}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>{title}</span>
          <button data-testid="camera-close" onClick={close} style={xBtn} aria-label="Tutup">✕</button>
        </div>
        {err ? (
          <div data-testid="camera-error" style={{ padding: 20, color: "#C62828", textAlign: "center", fontWeight: 600 }}>{err}</div>
        ) : (
          <video
            ref={videoRef}
            data-testid="camera-video"
            playsInline
            muted
            style={{ width: "100%", borderRadius: 12, background: "#000", aspectRatio: "3 / 4", objectFit: "cover" }}
          />
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button onClick={close} style={ghostBtn} data-testid="camera-cancel">Batal</button>
          <button data-testid="camera-capture" disabled={!ready || !!err} onClick={snap} style={{ ...primaryBtn, opacity: !ready || err ? 0.5 : 1 }}>
            Ambil Foto
          </button>
        </div>
      </div>
    </div>
  );
}
