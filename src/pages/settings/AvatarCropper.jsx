// 写真を、円の中で切り取る(位置とズーム)。react-easy-crop を使う。
import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';

export default function AvatarCropper({ src, zoom, setZoom, onAreaChange }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const onCropComplete = useCallback((_, pixels) => onAreaChange(pixels), [onAreaChange]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8em' }}>
      <div style={{ position: 'relative', width: '100%', height: '16em', background: '#000', borderRadius: '0.8em', overflow: 'hidden' }}>
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <input
        type="range"
        min={1}
        max={3}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        aria-label="ズーム"
        style={{ width: '100%', accentColor: 'var(--ink)' }}
      />
    </div>
  );
}
