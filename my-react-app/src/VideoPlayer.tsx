import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './App.css';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, title, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return ReactDOM.createPortal(
    <div className="video-modal">
      <div className="video-modal-content" ref={containerRef}>
        <div className="video-fixed-header">
          <h3>{title || 'Video Huấn Luyện'}</h3>
          <div className="video-controls-header">
            <button 
              onClick={toggleFullscreen} 
              className="video-control-btn fullscreen-btn"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>
            <button 
              onClick={onClose} 
              className="video-control-btn close-btn"
              title="Đóng"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div className="video-container-wrapper">
          <div className="video-container-premium">
            <video 
              ref={videoRef}
              controls 
              autoPlay 
              className="video-player-premium"
              poster={`${process.env.PUBLIC_URL}/asset/video-thumbnail.jpg`}
            >
              <source src={videoUrl} type="video/mp4" />
              Trình duyệt của bạn không hỗ trợ thẻ video.
            </video>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VideoPlayer; 
 