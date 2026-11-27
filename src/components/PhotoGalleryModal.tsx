import React, { useState, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Trash2, 
  Download, 
  ZoomIn, 
  Building2, 
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { ServicePhoto, ServiceRecord } from '../types';
import { compressImageFile } from '../utils/imageCompressor';
import { formatDate } from '../utils/formatters';

interface PhotoGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceRecord | null;
  onAddPhotos: (serviceId: string, newPhotos: ServicePhoto[]) => void;
  onDeletePhoto: (serviceId: string, photoId: string) => void;
  readOnly?: boolean;
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  isOpen,
  onClose,
  service,
  onAddPhotos,
  onDeletePhoto,
  readOnly = false,
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !service) return null;

  const photos = service.photos || [];
  const currentPhoto = photos[selectedPhotoIndex] || photos[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const addedPhotos: ServicePhoto[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedDataUrl = await compressImageFile(file, 1280, 0.82);
        addedPhotos.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          dataUrl: compressedDataUrl,
          name: file.name,
          uploadedAt: new Date().toISOString(),
          sizeBytes: file.size,
        });
      }
      onAddPhotos(service.id, addedPhotos);
      setSelectedPhotoIndex(photos.length); // point to new photo
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleDownload = (photo: ServicePhoto) => {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = photo.name || `foto_servico_${service.id}.jpg`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 truncate">Galeria de Fotos do Serviço</h3>
              <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {photos.length} foto(s)
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {service.storeName} • {formatDate(service.date)} — {service.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Photo Viewer */}
        <div className="relative flex-1 bg-slate-900 flex items-center justify-center overflow-hidden min-h-[320px] max-h-[500px]">
          {currentPhoto ? (
            <img
              src={currentPhoto.dataUrl}
              alt={currentPhoto.name || 'Foto do serviço'}
              className="max-h-full max-w-full object-contain select-none"
            />
          ) : (
            <div className="text-center text-slate-400 p-8 space-y-2">
              <ImageIcon className="w-12 h-12 mx-auto text-slate-600 stroke-1" />
              <p className="font-semibold text-sm">Nenhuma foto anexada a este serviço ainda.</p>
              <p className="text-xs text-slate-500">Adicione fotos usando os botões abaixo.</p>
            </div>
          )}

          {/* Quick Actions overlay on current photo */}
          {currentPhoto && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-xs p-1.5 rounded-xl border border-slate-700">
              <button
                onClick={() => handleDownload(currentPhoto)}
                className="p-1.5 text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Baixar imagem"
              >
                <Download className="w-4 h-4" />
              </button>
{!readOnly && (
              <button
                onClick={() => {
                  if (confirm('Remover esta foto?')) {
                    onDeletePhoto(service.id, currentPhoto.id);
                    if (selectedPhotoIndex > 0) setSelectedPhotoIndex(selectedPhotoIndex - 1);
                  }
                }}
                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg transition"
                title="Remover foto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              )}
            </div>
          )}
        </div>

        {/* Thumbnails strip & Add Photo actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          
          {/* Thumbnails list */}
          {photos.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                    idx === selectedPhotoIndex ? 'border-sky-600 ring-2 ring-sky-300' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Upload more photos */}
          <div className="flex items-center justify-between gap-2 pt-1">
{!readOnly && (
            <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition"
              >
                <Upload className="w-3.5 h-3.5 text-sky-600" />
                <span>+ Foto da Galeria</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-semibold text-sky-700 flex items-center gap-1.5 shadow-2xs transition"
              >
                <Camera className="w-3.5 h-3.5 text-sky-600" />
                <span>Tirar com a Câmera</span>
              </button>
            </div>
            </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
