import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, ZoomIn, Clipboard } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  readOnly?: boolean;
  label?: string;
  onImageAdded?: (base64: string) => void;
}

const ImageUpload = ({ images, onImagesChange, readOnly = false, label, onImageAdded }: ImageUploadProps) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const addImage = useCallback((base64: string) => {
    onImagesChange([...images, base64]);
    onImageAdded?.(base64);
  }, [images, onImagesChange, onImageAdded]);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        addImage(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, [addImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(processFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processFile(file);
      }
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) processFile(file);
    });
  }, [processFile]);

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3" onPaste={!readOnly ? handlePaste : undefined}>
      {!readOnly && (
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <ImagePlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {label || 'Screenshot যোগ করো'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Clipboard className="w-3 h-3" />
            Drag & drop, click, অথবা Ctrl+V দিয়ে paste করো
          </p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
              <img
                src={img}
                alt={`Screenshot ${i + 1}`}
                className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setZoomedImage(img)}
              />
              <button
                onClick={() => setZoomedImage(img)}
                className="absolute bottom-2 right-2 bg-background/80 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {!readOnly && (
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 bg-destructive/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && readOnly && (
        <p className="text-sm text-muted-foreground italic">কোনো screenshot নেই</p>
      )}

      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          {zoomedImage && (
            <img src={zoomedImage} alt="Zoomed" className="w-full h-auto max-h-[85vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageUpload;
