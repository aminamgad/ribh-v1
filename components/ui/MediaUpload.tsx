'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Play, Image as ImageIcon, Video as VideoIcon, Download, GripVertical, Star, StarOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMediaType, getAcceptedMediaTypes, getAcceptedExtensions, validateMediaFile, downloadMedia, getFilenameFromUrl, downloadAllMedia } from '@/lib/mediaUtils';

interface MediaUploadProps {
  onUpload: (urls: string[]) => void;
  uploadedMedia: string[];
  onRemove: (index: number) => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  accept?: 'images' | 'videos' | 'both';
  maxFiles?: number;
  maxSize?: number; // in MB
  title?: string;
  className?: string;
  onReorder?: (reorderedMedia: string[]) => void;
  onSetPrimary?: (index: number) => void;
  primaryIndex?: number;
  showPrimaryOption?: boolean;
}

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  name: string;
}

export default function MediaUpload({
  onUpload,
  uploadedMedia,
  onRemove,
  uploading,
  setUploading,
  accept = 'both',
  maxFiles = 10,
  maxSize = 100, // Default to 100MB for videos
  title = 'الوسائط',
  className = '',
  onReorder,
  onSetPrimary,
  primaryIndex,
  showPrimaryOption = true
}: MediaUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Function to upload large files directly to Cloudinary
  const uploadToCloudinaryDirect = useCallback(async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      // Generate public_id first
      const public_id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Determine resource type based on file type
      const isVideo = file.type.startsWith('video/');
      const resource_type = isVideo ? 'video' : undefined;
      
      // Get upload signature from our API
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureResponse = await fetch('/api/upload/signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timestamp, public_id, resource_type }),
        credentials: 'include',
      });

      if (!signatureResponse.ok) {
        const error = await signatureResponse.json();
        return { success: false, error: error.message || 'Failed to get upload signature' };
      }

      const { signature, apiKey, cloudName, folder, public_id: returnedPublicId } = await signatureResponse.json();

      // Create form data for Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('public_id', returnedPublicId);
      
             // Note: Using auto endpoint, so no need to specify resource_type

            // Upload directly to Cloudinary
      // Always use 'auto' endpoint and let Cloudinary detect the resource type
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        return { success: true, url: result.secure_url };
      } else {
        const errorText = await uploadResponse.text();
        
        let error;
        try {
          error = JSON.parse(errorText);
        } catch (e) {
          error = { message: errorText };
        }
        return { success: false, error: error.error?.message || error.message || 'Upload failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      return { success: false, error: errorMessage };
    }
  }, []);



  const handleFileUpload = useCallback(async (files: FileList) => {
    if (files.length === 0) return;


    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      const validation = validateMediaFile(file, accept, maxSize);
      
      if (validation.valid) {
        validFiles.push(file);
      } else {
        toast.error(validation.error || 'خطأ في تحديد الملف');
      }
    }

    if (validFiles.length === 0) return;

    if (uploadedMedia.length + validFiles.length > maxFiles) {
      toast.error(`يمكنك رفع ${maxFiles} ملف كحد أقصى`);
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];
    const totalFiles = validFiles.length;
    let completedFiles = 0;

    // Show initial progress notification
    const progressMessage = `جاري رفع ${totalFiles} ملف...`;
    toast.loading(progressMessage, { id: 'upload-progress' });

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        // Use direct Cloudinary upload for files larger than 4MB
        const isLargeFile = file.size > 4 * 1024 * 1024; // 4MB threshold
        
        // Update progress notification
        const fileName = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
        toast.loading(
          `جاري رفع الملف ${i + 1} من ${totalFiles}: ${fileName}`,
          { id: 'upload-progress' }
        );
        
        if (isLargeFile) {
          // Direct Cloudinary upload for large files
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
          const uploadResult = await uploadToCloudinaryDirect(file);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          if (uploadResult.success) {
            if (uploadResult.url) {
              uploadedUrls.push(uploadResult.url);
              completedFiles++;
            }
          } else {
            toast.error(`فشل رفع ${file.name}: ${uploadResult.error}`, {
              duration: 5000
            });
          }
        } else {
          // Regular API upload for smaller files
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.url) {
              uploadedUrls.push(data.url);
              completedFiles++;
            } else {
              toast.error(`فشل رفع ${file.name}: ${data.message || 'خطأ غير معروف'}`, {
                duration: 5000
              });
            }
          } else {
            let errorMessage = `فشل رفع ${file.name}`;
            try {
              const error = await response.json();
              errorMessage = error.message || errorMessage;
            } catch (parseError) {
              // Silently handle parse errors
            }
            toast.error(errorMessage, {
              duration: 5000
            });
          }
        }
      }

      // Dismiss progress toast
      toast.dismiss('upload-progress');

      if (uploadedUrls.length > 0) {
        onUpload(uploadedUrls);
        const mediaType = accept === 'images' ? 'صور' : accept === 'videos' ? 'فيديوهات' : 'وسائط';
        toast.success(`✅ تم رفع ${uploadedUrls.length} ${mediaType} بنجاح`, {
          duration: 4000,
          style: {
            background: '#10b981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }
        });
      } else {
        toast.error('❌ فشل رفع جميع الملفات', {
          duration: 5000
        });
      }
    } catch (error) {
      toast.dismiss('upload-progress');
      toast.error('❌ حدث خطأ أثناء رفع الملفات', {
        duration: 5000,
        style: {
          background: '#ef4444',
          color: '#fff'
        }
      });
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [accept, maxSize, uploadedMedia, maxFiles, setUploading, onUpload, uploadToCloudinaryDirect]);

  const handleDragOverArea = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  }, [handleFileUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop for reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newMedia = [...uploadedMedia];
    const draggedItem = newMedia[draggedIndex];
    newMedia.splice(draggedIndex, 1);
    newMedia.splice(index, 0, draggedItem);
    
    if (onReorder) {
      onReorder(newMedia);
    }
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSetPrimary = (index: number) => {
    if (onSetPrimary) {
      onSetPrimary(index);
      toast.success('تم تعيين الصورة الرئيسية');
    }
  };



  return (
    <div className={`space-y-6 ${className}`}>
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
        
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDragOver={handleDragOverArea}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            اسحب وأفلت {accept === 'images' ? 'الصور' : accept === 'videos' ? 'الفيديوهات' : 'الوسائط'} هنا
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">أو</p>
          <label className="btn-primary cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={getAcceptedMediaTypes(accept)}
              onChange={handleFileSelect}
              className="hidden"
            />
            اختيار {accept === 'images' ? 'الصور' : accept === 'videos' ? 'الفيديوهات' : 'الوسائط'}
          </label>
                           <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                   الحد الأقصى: {maxSize} ميجابايت لكل ملف • {maxFiles} ملف كحد أقصى
                 </p>
                
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            الصيغ المدعومة: {getAcceptedExtensions(accept).join(', ').toUpperCase()}
          </p>
        </div>

                 {/* Uploaded Media */}
         {uploadedMedia.length > 0 && (
           <div className="mt-4">
             <div className="flex items-center justify-between mb-2">
               <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                 {accept === 'images' ? 'الصور' : accept === 'videos' ? 'الفيديوهات' : 'الوسائط'} المرفوعة ({uploadedMedia.length}):
               </h3>
               
               {/* Download All Button */}
               {uploadedMedia.length > 1 && (
                 <button
                   type="button"
                   onClick={async () => {
                     try {
                       const result = await downloadAllMedia(uploadedMedia);
                       if (result.failed > 0) {
                         toast.success(`تم تحميل ${result.success} ملف بنجاح. فشل تحميل ${result.failed} ملف.`);
                       } else {
                         toast.success(`تم تحميل جميع الملفات بنجاح (${result.success} ملف)`);
                       }
                     } catch (error) {
                       toast.error('فشل في تحميل الملفات');
                     }
                   }}
                   className="btn-secondary flex items-center space-x-2 space-x-reverse text-xs"
                 >
                   <Download className="w-3 h-3" />
                   <span>تحميل الكل</span>
                 </button>
               )}
             </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {uploadedMedia.map((media, index) => {
                const mediaType = getMediaType(media);
                const isPrimary = primaryIndex === index;
                const isDragging = draggedIndex === index;
                
                return (
                  <div 
                    key={index} 
                    className={`relative group cursor-move transition-all duration-200 ${
                      isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                    } ${isPrimary ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOverItem(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                      {mediaType === 'image' ? (
                        <img
                          src={media}
                          alt={`${accept === 'images' ? 'صورة' : 'وسائط'} ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewIndex(index)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center relative">
                          <video
                            src={media}
                            className="w-full h-full object-cover cursor-pointer"
                            muted
                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                            onMouseLeave={(e) => {
                              const video = e.target as HTMLVideoElement;
                              video.pause();
                              video.currentTime = 0;
                            }}
                            onClick={() => setPreviewIndex(index)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Play className="w-8 h-8 text-white bg-black bg-opacity-50 rounded-full p-1" />
                          </div>
                        </div>
                      )}
                      
                      {/* Primary Badge */}
                      {isPrimary && showPrimaryOption && (
                        <div className="absolute top-2 left-2 bg-primary-600 text-white rounded-full px-2 py-1 flex items-center gap-1 text-xs font-medium z-10">
                          <Star className="w-3 h-3 fill-current" />
                          رئيسية
                        </div>
                      )}
                      
                      {/* Drag Handle */}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <GripVertical className="w-3 h-3" />
                      </div>
                    </div>
                    
                    {/* Media Type Badge */}
                    {!isPrimary && (
                      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white rounded-full p-1 z-10">
                        {mediaType === 'image' ? (
                          <ImageIcon className="w-3 h-3" />
                        ) : (
                          <VideoIcon className="w-3 h-3" />
                        )}
                      </div>
                    )}

                    {/* Action Buttons - centered in the middle of the thumbnail, visible on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                      <div className="flex items-center justify-center gap-2 rounded-xl bg-black/70 backdrop-blur-sm px-2 py-2 shadow-lg pointer-events-auto">
                        {/* Set Primary */}
                        {showPrimaryOption && !isPrimary && mediaType === 'image' && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(index)}
                            className="flex items-center justify-center p-2.5 rounded-lg text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1 focus:ring-offset-transparent"
                            title="تعيين كصورة رئيسية"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        {/* Download */}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const type = getMediaType(media);
                              const filename = getFilenameFromUrl(media, type);
                              const success = await downloadMedia(media, filename);
                              if (success) {
                                toast.success(`تم تحميل ${filename} بنجاح`);
                              } else {
                                toast.error('فشل في تحميل الملف');
                              }
                            } catch {
                              toast.error('فشل في تحميل الملف');
                            }
                          }}
                          className="flex items-center justify-center p-2.5 rounded-lg text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 focus:ring-offset-transparent"
                          title="تحميل الملف"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => onRemove(index)}
                          className="flex items-center justify-center p-2.5 rounded-lg text-white hover:bg-red-500/80 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 focus:ring-offset-transparent"
                          title="حذف الملف"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Index Badge */}
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Preview Modal */}
            {previewIndex !== null && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                onClick={() => setPreviewIndex(null)}
              >
                <div className="relative max-w-4xl max-h-[90vh] w-full">
                  <button
                    onClick={() => setPreviewIndex(null)}
                    className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  {getMediaType(uploadedMedia[previewIndex]) === 'image' ? (
                    <img
                      src={uploadedMedia[previewIndex]}
                      alt="Preview"
                      className="max-w-full max-h-[90vh] object-contain rounded-lg"
                    />
                  ) : (
                    <video
                      src={uploadedMedia[previewIndex]}
                      controls
                      autoPlay
                      className="max-w-full max-h-[90vh] rounded-lg"
                    />
                  )}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
                    {previewIndex + 1} / {uploadedMedia.length}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

                       {uploading && (
                 <div className="mt-4 text-center">
                   <div className="loading-spinner w-6 h-6 mx-auto"></div>
                   <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                     جاري رفع {accept === 'images' ? 'الصور' : accept === 'videos' ? 'الفيديوهات' : 'الوسائط'}...
                   </p>
                   {Object.keys(uploadProgress).length > 0 && (
                     <div className="mt-2 space-y-1">
                       {Object.entries(uploadProgress).map(([fileName, progress]) => (
                         <div key={fileName} className="text-xs text-gray-500 dark:text-gray-400">
                           {fileName}: {progress}%
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               )}
      </div>
    </div>
  );
}
