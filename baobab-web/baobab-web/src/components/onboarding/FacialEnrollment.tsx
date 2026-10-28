import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, ScanFace, SwitchCamera } from "lucide-react";

type Props = {
  value: string | null;
  onCapture: (dataUrl: string) => void;
  onClear: () => void;
};

/** Capture d’enrôlement facial (biométrie) — distincte de la photo de profil. */
export function FacialEnrollment({ value, onCapture, onClear }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingUser, setFacingUser] = useState(true);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  };

  const startCamera = async (userFacing = facingUser) => {
    setError(null);
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Caméra non disponible — utilise « Importer ».");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: userFacing ? "user" : "environment",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLive(true);
    } catch {
      setError("Accès caméra refusé — tu peux importer une image pour les tests.");
      setLive(false);
    }
  };

  useEffect(() => {
    if (!value) void startCamera(true);
    return () => stopCamera();
  }, []);

  const snap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    const sx = ((video.videoWidth || size) - size) / 2;
    const sy = ((video.videoHeight || size) - size) / 2;
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(480, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 480, 480);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    onCapture(dataUrl);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        stopCamera();
        onCapture(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="relative mx-auto flex h-52 w-52 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/10 ring-2 ring-primary/25" />
        <div className="absolute inset-2 overflow-hidden rounded-full bg-card ring-1 ring-border">
          {value ? (
            <img src={value} alt="Enrôlement facial" className="h-full w-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${facingUser ? "scale-x-[-1]" : ""}`}
            />
          )}
        </div>
        {!value && (
          <>
            <div className="pointer-events-none absolute inset-7 rounded-full border border-primary/50" />
            <ScanFace className="pointer-events-none absolute bottom-3 h-5 w-5 text-primary/70" />
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="text-center text-[11px] text-muted-foreground">{error}</p>}
      <p className="text-center text-[11px] text-muted-foreground">
        Enrôlement facial uniquement — ta photo de profil se règle plus tard dans « Moi ».
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {value ? (
          <button
            type="button"
            onClick={() => {
              onClear();
              void startCamera(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Recommencer
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={snap}
              disabled={!live}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" /> Enregistrer le visage
            </button>
            <button
              type="button"
              onClick={() => {
                setFacingUser((v) => {
                  const next = !v;
                  void startCamera(next);
                  return next;
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium"
            >
              <SwitchCamera className="h-3.5 w-3.5" /> Caméra
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium"
            >
              Importer
            </button>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
