'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Play, Image as ImageIcon, Video as VideoIcon, Download } from 'lucide-react';
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
  className = ''
}: MediaUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Function to upload large files directly to Cloudinary
  const uploadToCloudinaryDirect = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
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

             // Debug: Log what we're sending to Cloudinary
       console.log('=== UPLOAD DEBUG ===');
       console.log('Uploading to Cloudinary with params:', {
         api_key: apiKey,
         timestamp: timestamp.toString(),
         signature,
         folder,
         public_id: returnedPublicId,
         resource_type: resource_type,
         cloudName,
         fileName: file.name,
         fileSize: file.size,
         fileType: file.type
       });
       console.log('FormData entries:');
               Array.from(formData.entries()).forEach(([key, value]) => {
          console.log(`${key}:`, value);
        });
       console.log('=== END UPLOAD DEBUG ===');

             // Upload directly to Cloudinary
       // Always use 'auto' endpoint and let Cloudinary detect the resource type
       console.log('Making request to Cloudinary...');
       const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
         method: 'POST',
         body: formData,
       });
       console.log('Cloudinary response status:', uploadResponse.status);

      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        console.log('Upload successful:', result);
        return { success: true, url: result.secure_url };
      } else {
        const errorText = await uploadResponse.text();
        console.error('Cloudinary upload error response:', errorText);
        console.error('Response status:', uploadResponse.status);
        console.error('Response headers:', Object.fromEntries(uploadResponse.headers.entries()));
        
        let error;
        try {
          error = JSON.parse(errorText);
        } catch (e) {
          error = { message: errorText };
        }
        return { success: false, error: error.error?.message || error.message || 'Upload failed' };
      }
    } catch (error) {
      console.error('Direct upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      return { success: false, error: errorMessage };
    }
  };



  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;

    console.log('=== FILE UPLOAD DEBUG ===');
    console.log('Files to upload:', files.length);
    console.log('Accept type:', accept);
    console.log('Max size:', maxSize);

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`File ${i + 1}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeMB: (file.size / (1024 * 1024)).toFixed(2) + 'MB'
      });
      
      const validation = validateMediaFile(file, accept, maxSize);
      console.log('Validation result:', validation);
      
      if (validation.valid) {
        validFiles.push(file);
      } else {
        toast.error(validation.error || 'خطأ في تحديد الملف');
      }
    }
    
    console.log('Valid files:', validFiles.length);
    console.log('=== END FILE UPLOAD DEBUG ===');

    if (validFiles.length === 0) return;

    if (uploadedMedia.length + validFiles.length > maxFiles) {
      toast.error(`يمكنك رفع ${maxFiles} ملف كحد أقصى`);
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of validFiles) {
        // Use direct Cloudinary upload for files larger than 4MB
        const isLargeFile = file.size > 4 * 1024 * 1024; // 4MB threshold
        console.log(`Processing file: ${file.name}, isLargeFile: ${isLargeFile}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
        
        if (isLargeFile) {
          console.log(`Using direct Cloudinary upload for: ${file.name}`);
          // Direct Cloudinary upload for large files
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
          const uploadResult = await uploadToCloudinaryDirect(file);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          console.log(`Upload result for ${file.name}:`, uploadResult);
          if (uploadResult.success) {
            if (uploadResult.url) {
              uploadedUrls.push(uploadResult.url);
            }
          } else {
            toast.error(`فشل رفع ${file.name}: ${uploadResult.error}`);
          }
        } else {
          console.log(`Using regular API upload for: ${file.name}`);
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
            } else {
              toast.error(`فشل رفع ${file.name}: ${data.message || 'خطأ غير معروف'}`);
            }
          } else {
            let errorMessage = `فشل رفع ${file.name}`;
            try {
              const error = await response.json();
              errorMessage = error.message || errorMessage;
            } catch (parseError) {
              console.error('Error parsing response:', parseError);
            }
            toast.error(errorMessage);
          }
        }
      }

      if (uploadedUrls.length > 0) {
        onUpload(uploadedUrls);
        const mediaType = accept === 'images' ? 'صور' : accept === 'videos' ? 'فيديوهات' : 'وسائط';
        toast.success(`تم رفع ${uploadedUrls.length} ${mediaType} بنجاح`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('حدث خطأ أثناء رفع الملفات');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
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
  }, []);

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
          onDragOver={handleDragOver}
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
                       console.error('Download all error:', error);
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
                return (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {mediaType === 'image' ? (
                        <img
                          src={media}
                          alt={`${accept === 'images' ? 'صورة' : 'وسائط'} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center relative">
                          <video
                            src={media}
                            className="w-full h-full object-cover"
                            muted
                            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                            onMouseLeave={(e) => {
                              const video = e.target as HTMLVideoElement;
                              video.pause();
                              video.currentTime = 0;
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-8 h-8 text-white bg-black bg-opacity-50 rounded-full p-1" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Media Type Badge */}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white rounded-full p-1">
                      {mediaType === 'image' ? (
                        <ImageIcon className="w-3 h-3" />
                      ) : (
                        <VideoIcon className="w-3 h-3" />
                      )}
                    </div>

                                         {/* Action Buttons */}
                     <div className="absolute top-2 right-2 flex space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                       {/* Download Button */}
                       <button
                         type="button"
                         onClick={async () => {
                           try {
                             const mediaType = getMediaType(media);
                             const filename = getFilenameFromUrl(media, mediaType);
                             const success = await downloadMedia(media, filename);
                             if (success) {
                               toast.success(`تم تحميل ${filename} بنجاح`);
                             } else {
                               toast.error('فشل في تحميل الملف');
                             }
                           } catch (error) {
                             console.error('Download error:', error);
                             toast.error('فشل في تحميل الملف');
                           }
                         }}
                         className="bg-[#FF9800] text-white rounded-full p-1 hover:bg-[#F57C00] transition-colors"
                         title="تحميل الملف"
                       >
                         <Download className="w-3 h-3" />
                       </button>
                       
                       {/* Remove Button */}
                       <button
                         type="button"
                         onClick={() => onRemove(index)}
                         className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                         title="حذف الملف"
                       >
                         <X className="w-3 h-3" />
                       </button>
                     </div>
                  </div>
                );
              })}
            </div>
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
