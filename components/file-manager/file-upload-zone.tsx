'use client';

import { useCallback, useState, useRef, memo } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploadZoneProps {
  targetDir: string;
  onUploadComplete: () => void;
  children: React.ReactNode;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export const FileUploadZone = memo(function FileUploadZone({
  targetDir,
  onUploadComplete,
  children,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    // Validate files
    const validFiles: File[] = [];
    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 100MB limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Create upload entries
    const newUploads: UploadFile[] = validFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: 'pending',
    }));

    setUploads((prev) => [...prev, ...newUploads]);
    setIsUploading(true);

    // Upload files
    const formData = new FormData();
    formData.append('targetDir', targetDir);
    validFiles.forEach((file) => formData.append('files', file));

    // Update status to uploading
    setUploads((prev) =>
      prev.map((u) =>
        newUploads.find((n) => n.id === u.id)
          ? { ...u, status: 'uploading' as const, progress: 50 }
          : u
      )
    );

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Mark all as success
        setUploads((prev) =>
          prev.map((u) =>
            newUploads.find((n) => n.id === u.id)
              ? { ...u, status: 'success' as const, progress: 100 }
              : u
          )
        );
        toast.success(result.message);
        onUploadComplete();
      } else {
        // Handle partial failures
        setUploads((prev) =>
          prev.map((u) => {
            const uploadEntry = newUploads.find((n) => n.id === u.id);
            if (!uploadEntry) return u;

            const fileResult = result.results?.find(
              (r: { name: string; success: boolean; error?: string }) =>
                r.name === uploadEntry.file.name
            );

            if (fileResult?.success) {
              return { ...u, status: 'success' as const, progress: 100 };
            }
            return {
              ...u,
              status: 'error' as const,
              error: fileResult?.error || result.error || 'Upload failed',
            };
          })
        );

        if (!result.results?.some((r: { success: boolean }) => r.success)) {
          toast.error(result.error || 'Upload failed');
        } else {
          toast.warning(result.message);
          onUploadComplete();
        }
      }
    } catch {
      // Mark all as error
      setUploads((prev) =>
        prev.map((u) =>
          newUploads.find((n) => n.id === u.id)
            ? { ...u, status: 'error' as const, error: 'Network error' }
            : u
        )
      );
      toast.error('Upload failed - network error');
    } finally {
      setIsUploading(false);

      // Clear completed uploads after 3 seconds
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.status !== 'success'));
      }, 3000);
    }
  }, [targetDir, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCountRef.current = 0;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input
    e.target.value = '';
  }, [processFiles]);

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return (
    <div
      className="relative flex-1 flex flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Main content */}
      {children}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm border-2 border-dashed border-cyan-500 rounded-lg m-2">
          <div className="flex flex-col items-center gap-4 text-white">
            <Upload className="w-16 h-16 text-cyan-400 animate-bounce" />
            <p className="text-xl font-medium">Drop files to upload</p>
            <p className="text-sm text-white/60">Files will be uploaded to current directory</p>
          </div>
        </div>
      )}

      {/* Upload progress panel */}
      {uploads.length > 0 && (
        <div className="absolute bottom-4 right-4 z-40 w-80 bg-black/80 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              {isUploading ? 'Uploading...' : 'Uploads'}
            </span>
            {!isUploading && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/60 hover:text-white"
                onClick={() => setUploads([])}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="px-4 py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  {upload.status === 'uploading' || upload.status === 'pending' ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                  ) : upload.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/90 truncate">{upload.file.name}</p>
                    <p className="text-xs text-white/50">
                      {upload.error || formatFileSize(upload.file.size)}
                    </p>
                  </div>
                  {upload.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white/40 hover:text-white"
                      onClick={() => removeUpload(upload.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {(upload.status === 'uploading' || upload.status === 'pending') && (
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

