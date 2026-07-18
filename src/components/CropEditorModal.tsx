import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, ZoomIn, ZoomOut, Move, Crop as CropIcon } from 'lucide-react';

interface Props {
  imageUrl: string;
  initialCrop?: { x: number, y: number, width: number, height: number };
  onClose: () => void;
  onConfirm: (percentCrop: { x: number, y: number, width: number, height: number }, croppedBase64: string) => void;
}

function CropEditorModal({ imageUrl, initialCrop, onClose, onConfirm }: Props) {
  const [crop, setCrop] = useState<Crop>(
    initialCrop 
      ? { unit: '%', ...initialCrop } 
      : { unit: '%', x: 25, y: 25, width: 50, height: 50 }
  );
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;
    setIsProcessing(true);
    
    // Create canvas to extract cropped image
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );
      
      const base64Image = canvas.toDataURL('image/jpeg');
      
      const percentCrop = {
        x: (completedCrop.x / image.width) * 100,
        y: (completedCrop.y / image.height) * 100,
        width: (completedCrop.width / image.width) * 100,
        height: (completedCrop.height / image.height) * 100
      };
      
      onConfirm(percentCrop, base64Image);
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-sm">
      <div className="flex justify-between items-center p-4 border-b border-white/10 bg-slate-900/50">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <CropIcon className="w-5 h-5 text-indigo-400" />
            Ajustar Recorte Manualmente
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Selecione a área da imagem onde estão os produtos e preços que deseja analisar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800 rounded-lg p-1 mr-4">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-slate-300 text-xs font-bold px-2 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"><ZoomIn className="w-4 h-4" /></button>
          </div>
          
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-bold rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            disabled={isProcessing || !completedCrop?.width || !completedCrop?.height}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/20"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Confirmar Recorte
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            className="shadow-2xl rounded border border-white/10"
          >
            <img 
              ref={imgRef}
              src={imageUrl} 
              alt="Folheto para recorte" 
              className="max-h-[80vh] w-auto pointer-events-none" 
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>
      </div>
    </div>
  );
}

export default memo(CropEditorModal);
