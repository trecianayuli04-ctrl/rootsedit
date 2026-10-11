// Native camera capture (Metro auto-picks camera.web.tsx on web).
// Opens the device camera, returns a base64 JPEG data URL via onCapture.
import { useEffect, useRef } from "react";
import * as ImagePicker from "expo-image-picker";

import { useToast } from "@/src/ui";

export function CameraSheet({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  title?: string;
}) {
  const toast = useToast();
  const busy = useRef(false);
  useEffect(() => {
    if (!visible || busy.current) return;
    busy.current = true;
    (async () => {
      try {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          toast("Izin kamera ditolak. Aktifkan izin kamera untuk absen.", "error");
          onClose();
          return;
        }
        const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, mediaTypes: ["images"], cameraType: ImagePicker.CameraType.front });
        if (!res.canceled && res.assets?.[0]?.base64) {
          onCapture(`data:image/jpeg;base64,${res.assets[0].base64}`);
        }
        onClose();
      } catch {
        toast("Kamera tidak tersedia", "error");
        onClose();
      } finally {
        busy.current = false;
      }
    })();
  }, [visible]);
  return null;
}
