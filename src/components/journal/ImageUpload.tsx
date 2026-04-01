import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  readOnly?: boolean;
}

const ImageUpload = ({ images, onImagesChange, readOnly = false }: ImageUploadProps) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onImagesChange([...images, ev.target.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <ImagePlus className="w-4 h-4" />
            Screenshot যোগ করো
          </Button>
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
