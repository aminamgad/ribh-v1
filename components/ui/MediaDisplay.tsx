'use client';

import { useState } from 'react';
import { Play, Image as ImageIcon, Video as VideoIcon, Download } from 'lucide-react';
import { getMediaType, downloadMedia, getFilenameFromUrl, downloadAllMedia } from '@/lib/mediaUtils';
import LazyImage from './LazyImage';

interface MediaDisplayProps {
  media: string[];
  title?: string;
  className?: string;
}

export default function MediaDisplay({ 
  media, 
  title = 'الوسائط',
  className = '' 
}: MediaDisplayProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);

  // Get current media and type (defined before use)
  const currentMedia = media && media.length > 0 ? media[selectedIndex] : '';
  const currentMediaType = currentMedia ? getMediaType(currentMedia) : 'image';

  // Function to handle download
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const filename = getFilenameFromUrl(currentMedia, currentMediaType);
      const success = await downloadMedia(currentMedia, filename);
      
      if (!success) {
        alert('فشل في تحميل الملف. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      alert('فشل في تحميل الملف. يرجى المحاولة مرة أخرى.');
    } finally {
      setDownloading(false);
    }
  };

  // Function to handle download all
  const handleDownloadAll = async () => {
    try {
      setDownloading(true);
      const result = await downloadAllMedia(media);
      
      if (result.failed > 0) {
        alert(`تم تحميل ${result.success} ملف بنجاح. فشل تحميل ${result.failed} ملف.`);
      } else {
        alert(`تم تحميل جميع الملفات بنجاح (${result.success} ملف)`);
      }
    } catch (error) {
      alert('فشل في تحميل الملفات. يرجى المحاولة مرة أخرى.');
    } finally {
      setDownloading(false);
    }
  };

  if (!media || media.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
        <div className="aspect-square bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-slate-400">لا توجد وسائط</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
        
        {/* Download Buttons */}
        <div className="flex items-center space-x-2 space-x-reverse">
          {media.length > 1 && (
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="btn-secondary flex items-center space-x-2 space-x-reverse text-sm"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'جاري التحميل...' : 'تحميل الكل'}</span>
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-secondary flex items-center space-x-2 space-x-reverse text-sm"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'جاري التحميل...' : 'تحميل'}</span>
          </button>
        </div>
      </div>
      
      {/* Main Media Display */}
      <div className="relative aspect-square bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
        {currentMediaType === 'image' ? (
          <LazyImage
            src={currentMedia}
            alt={`${title} ${selectedIndex + 1}`}
            className="w-full h-full object-cover"
            priority={selectedIndex === 0}
            placeholder="blur"
          />
        ) : (
          <video
            src={currentMedia}
            className="w-full h-full object-cover"
            controls
            preload="metadata"
          />
        )}

        {/* Media Type Badge */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white rounded-full p-2">
          {currentMediaType === 'image' ? (
            <ImageIcon className="w-4 h-4" />
          ) : (
            <VideoIcon className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex space-x-2 space-x-reverse overflow-x-auto">
          {media.map((item, index) => {
            const mediaType = getMediaType(item);
            return (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`flex-shrink-0 relative group ${
                  selectedIndex === index
                    ? 'ring-2 ring-primary-500'
                    : 'hover:ring-2 hover:ring-primary-300'
                } rounded-lg overflow-hidden`}
              >
                <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800">
                  {mediaType === 'image' ? (
                    <LazyImage
                      src={item}
                      alt={`${title} ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      priority={index === 0 || index === selectedIndex}
                      placeholder="blur"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center relative">
                      <video
                        src={item}
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
                        <Play className="w-4 h-4 text-white bg-black bg-opacity-50 rounded-full p-1" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Media Type Badge on Thumbnail */}
                <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white rounded-full p-1">
                  {mediaType === 'image' ? (
                    <ImageIcon className="w-2 h-2" />
                  ) : (
                    <VideoIcon className="w-2 h-2" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Media Counter */}
      {media.length > 1 && (
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {selectedIndex + 1} من {media.length}
          </p>
        </div>
      )}
    </div>
  );
}
