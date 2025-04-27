'use client';

import React, { useRef, useState, useEffect } from 'react';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(true);
  const [previewFilter, setPreviewFilter] = useState('none');
  const [photoFilter, setPhotoFilter] = useState('none');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const previewCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null, null, null, null]);
  const [isFlashActive, setIsFlashActive] = useState(false);

  const getVideo = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia is not supported in this browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
    }
  };

  const stopVideo = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  useEffect(() => {
    getVideo();

    // Set up preview canvases
    const updatePreviewCanvases = () => {
      if (!videoRef.current || !videoRef.current.videoWidth) return;
    
      const filters = [
        'none',
        'grayscale(50%)',
        'grayscale(100%)',
        'sepia(100%)',
        'saturate(150%) hue-rotate(10deg)',
        'saturate(200%)',
        'blur(0.7px) brightness(130%) contrast(85%) saturate(120%) opacity(95%)',
      ];
    
      filters.forEach((filter, i) => {
        const canvas = previewCanvasRefs.current[i];
        if (canvas && videoRef.current) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = 150;
            canvas.height = 100;
    
            // Apply flipping if needed
            if (isFlipped) {
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
            }
    
            // Debug: Log the filter being applied
            console.log(`Applying filter: ${filter}`);
            ctx.filter = filter !== 'none' ? filter : 'none';
    
            // Draw video frame
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
            // Reset transformation and filter
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.filter = 'none';
          }
        }
      });
    
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(updatePreviewCanvases);
      }
    };
    
    const previewInterval = setInterval(() => {
      if (videoRef.current?.readyState === 4) {
        updatePreviewCanvases();
        clearInterval(previewInterval);
      }
    }, 100);

    return () => {
      stopVideo();
      clearInterval(previewInterval);
    };
  }, [isFlipped]);

  // Update the preview canvases when the video stream is ready
  useEffect(() => {
    const video = videoRef.current;
    
    if (video) {
      const updateCanvases = () => {
        const filters = [
          'none',
          'grayscale(50%)',
          'grayscale(100%)',
          'sepia(100%)',
          'saturate(150%) hue-rotate(10deg)',
          'saturate(200%)',
          'blur(0.7px) brightness(130%) contrast(85%) saturate(120%) opacity(95%)',
        ];
        
        filters.forEach((filter, i) => {
          const canvas = previewCanvasRefs.current[i];
          if (canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Clear canvas
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // Apply flipping if needed
              if (isFlipped) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
              }
              
              // Draw video frame
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              // Reset transformation
              ctx.setTransform(1, 0, 0, 1, 0, 0);
              
              // Apply filter
              if (filter !== 'none') {
                ctx.filter = filter;
                ctx.drawImage(canvas, 0, 0);
                ctx.filter = 'none';
              }
            }
          }
        });
        
        requestAnimationFrame(updateCanvases);
      };
      
      video.addEventListener('play', updateCanvases);
      
      return () => {
        video.removeEventListener('play', updateCanvases);
      };
    }
  }, [isFlipped]);

  // Modified takePhoto function to apply the current preview filter to the photo
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let countdown = 3; // Start countdown from 3
    const countdownElement = document.createElement('div');
    countdownElement.style.position = 'absolute';
    countdownElement.style.top = '50%';
    countdownElement.style.left = '50%';
    countdownElement.style.transform = 'translate(-50%, -50%)';
    countdownElement.style.fontSize = '8rem';
    countdownElement.style.fontWeight = 'bold';
    countdownElement.style.color = 'white';
    countdownElement.style.zIndex = '1000';
    countdownElement.style.textShadow = '0 0 4px black';
    document.body.appendChild(countdownElement);

    const countdownInterval = setInterval(() => {
      countdownElement.textContent = countdown.toString();
      if (countdown === 0) {
        clearInterval(countdownInterval);
        document.body.removeChild(countdownElement);

        // Trigger flash effect
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 200); // Flash duration

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Create two canvases for the two-step process
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (!tempCtx) return;

        // Step 1: Draw video to temp canvas with flipping if needed
        if (isFlipped) {
          tempCtx.translate(tempCanvas.width, 0);
          tempCtx.scale(-1, 1);
        }
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

        // Step 2: Draw from temp canvas to main canvas with filter
        ctx.filter = previewFilter !== 'none' ? previewFilter : 'none';
        ctx.drawImage(tempCanvas, 0, 0);

        // Get the final filtered image
        const imageData = canvas.toDataURL('image/png');
        setPhoto(imageData);
        // Set the photo filter to match the current preview filter when taking the photo
        setPhotoFilter(previewFilter);
      }
      countdown -= 1;
    }, 1000); // Countdown interval of 1 second
  };

  const flipCamera = () => {
    setIsFlipped((prev) => !prev);
  };

  const startRecording = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      
      // Set up canvas for filtered recording
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      // Create a stream from the canvas
      const filteredStream = canvas.captureStream(30); // 30 fps
      
      // Add audio track if available
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => filteredStream.addTrack(track));
      
      // Function to draw video frames with filter
      const drawFrame = () => {
        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          // Apply flipping if needed
          if (isFlipped) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          
          // Draw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Reset transformation
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          
          // Apply filter
          if (previewFilter !== 'none') {
            ctx.filter = previewFilter;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = 'none';
          }
          
          // Continue drawing frames if still recording
          if (mediaRecorderRef.current?.state === 'recording') {
            requestAnimationFrame(drawFrame);
          }
        }
      };
      
      // Set up media recorder with more compatible MIME type options
      let mimeType = 'video/mp4';
      
      // Check for supported MIME types in order of preference
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm; codecs=h264')) {
        mimeType = 'video/webm; codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }
      
      const mediaRecorder = new MediaRecorder(filteredStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const videoURL = URL.createObjectURL(blob);
        setRecordedVideo(videoURL);
      };
      
      // Start recording
      mediaRecorder.start();
      drawFrame(); // Start the drawing loop
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Function to render filter name
  const getFilterName = (filter: string) => {
    if (filter === 'none') return 'Normal';
    if (filter.includes('grayscale(50%)')) return 'Gray';
    if (filter.includes('grayscale(100%)')) return 'Black & White';
    if (filter.includes('sepia')) return 'Sepia';
    if (filter.includes('hue-rotate')) return 'Warm';
    if (filter.includes('saturate(200%)')) return 'Vivid';
    if (filter.includes('brightness')) return 'Bright';
    return 'Filter';
  };

  // Function to apply filter to captured photo
  const applyFilterToPhoto = (filter: string) => {
    if (!photo) return;
    setPhotoFilter(filter);
  };

  // Function to download the photo with current filter
  const downloadPhoto = () => {
    if (!photo) return;
    
    // Create a temporary canvas to apply the current filter
    const tempCanvas = document.createElement('canvas');
    const img = new Image();
    
    img.onload = () => {
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const ctx = tempCanvas.getContext('2d');
      
      if (ctx) {
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Apply current filter if any
        if (photoFilter !== 'none') {
          ctx.filter = photoFilter;
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.filter = 'none';
        }
        
        // Create download link
        const filteredImageData = tempCanvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = filteredImageData;
        downloadLink.download = 'honey-snap-photo.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    
    img.src = photo;
  };
  
  // Get file extension based on MIME type
  const getFileExtension = (mimeType: string) => {
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    return 'mp4'; // Default to mp4
  };

  return (
    <div className="flex flex-col items-center justify-center bg-black text-white p-4 sm:p-8 min-h-screen overflow-hidden">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">Honey Snap 📸</h1>
      <div className="relative w-5/8">
      {isFlashActive && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none"></div>
      )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full rounded-xl shadow-lg transform ${isFlipped ? 'scale-x-[-1]' : ''}`}
          style={{ filter: previewFilter === 'none' ? 'none' : previewFilter }}
        />
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center">
          <div className="flex flex-wrap gap-4 p-4 font-bold">
        <button
          onClick={takePhoto}
          className="px-4 sm:px-6 py-2 bg-pink-600 rounded-lg hover:bg-pink-500 transition"
        >
          Take Photo
        </button>
        <button
          onClick={flipCamera}
          className="px-4 sm:px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
        >
          Flip Camera
        </button>
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="px-4 sm:px-6 py-2 bg-red-600 rounded-lg hover:bg-red-500 transition animate-pulse"
          >
            Stop Recording
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="px-4 sm:px-6 py-2 bg-green-600 rounded-lg hover:bg-green-500 transition"
          >
            Start Recording
          </button>
        )}
          </div>
        </div>
      </div>
  
      <div className="mt-4 mb-2 text-center">
        <h3 className="text-lg font-medium">Preview Filter</h3>
      </div>
  
      <div className="w-full flex gap-4 mb-6 overflow-x-auto">
        {[
          'none',
          'grayscale(50%)',
          'grayscale(100%)',
          'sepia(100%)',
          'saturate(150%) hue-rotate(10deg)',
          'saturate(200%)',
          'blur(0.7px) brightness(130%) contrast(85%) saturate(120%) opacity(95%)',
        ].map((filter, i) => (
          <div
        key={i}
        onClick={() => setPreviewFilter(filter)}
        className={`w-20 h-14 sm:w-24 sm:h-16 rounded shadow cursor-pointer border-2 overflow-hidden relative flex-shrink-0 ${
          previewFilter === filter ? 'border-pink-500' : 'border-transparent'
        }`}
          >
        <canvas 
          ref={el => { previewCanvasRefs.current[i] = el; }}
          width="150"
          height="100"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-xs text-center py-1">
          {getFilterName(filter)}
        </div>
          </div>
        ))}
      </div>
  
      <canvas ref={canvasRef} className="hidden" />
  
      {photo && (
        <div className="mt-6 w-full max-w-sm sm:max-w-md">
          <h2 className="text-lg sm:text-xl mb-2 text-center">Your Photo:</h2>
          <img
            src={photo}
            alt="Captured"
            className="rounded shadow-lg w-full h-auto"
            style={{ filter: photoFilter === 'none' ? 'none' : photoFilter }}
          />
  
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2 text-center">Apply Filter to Photo</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {[
                'none',
                'grayscale(50%)',
                'grayscale(100%)',
                'sepia(100%)',
                'saturate(150%) hue-rotate(10deg)',
                'saturate(200%)',
                'blur(0.7px) brightness(130%) contrast(85%) saturate(120%) opacity(95%)',
              ].map((filter, i) => (
                <div
                  key={i}
                  onClick={() => applyFilterToPhoto(filter)}
                  className={`p-2 rounded shadow cursor-pointer text-center ${
                    photoFilter === filter ? 'bg-pink-600' : 'bg-gray-700'
                  }`}
                >
                  {getFilterName(filter)}
                </div>
              ))}
            </div>
          </div>
  
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <a
              href={photo}
              download="honey-snap-photo.png"
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500 transition"
            >
              Download Original
            </a>
            <button
              onClick={downloadPhoto}
              className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500 transition"
            >
              Download with Filter
            </button>
          </div>
        </div>
      )}
  
      {recordedVideo && (
        <div className="mt-6 w-full max-w-sm sm:max-w-md">
          <h2 className="text-lg sm:text-xl mb-2 text-center">Your Video:</h2>
          <video
            src={recordedVideo}
            controls
            className="rounded shadow-lg w-full h-auto"
          />
          <div className="mt-2 flex justify-center">
            <a
              href={recordedVideo}
              download={`honey-snap-video.${mediaRecorderRef.current ? getFileExtension(mediaRecorderRef.current.mimeType) : 'mp4'}`}
              className="px-4 py-1 bg-purple-600 rounded hover:bg-purple-500 transition"
            >
              Download Video
            </a>
          </div>
        </div>
      )}
    </div>
  );  
}