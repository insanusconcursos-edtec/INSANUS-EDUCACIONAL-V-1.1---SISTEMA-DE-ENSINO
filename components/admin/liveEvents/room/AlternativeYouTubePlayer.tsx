import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface Props {
  videoId: string;
}

declare global {
  interface Window {
    YT: {
      Player: {
        new (element: HTMLElement | string, options: YTPlayerOptions): YTPlayer;
      };
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  destroy(): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getVolume(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoData(): { video_id: string } | null;
}

interface YTPlayerOptions {
  videoId: string;
  playerVars?: Record<string, string | number | boolean>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { target: YTPlayer; data: number }) => void;
    onError?: (event: { target: YTPlayer; data: number }) => void;
  };
}

export const AlternativeYouTubePlayer: React.FC<Props> = ({ videoId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null); // Container que o React gerencia
  const playerRef = useRef<YTPlayer | null>(null);
  const isInitializing = useRef(false); // Evita múltiplas inicializações simultâneas
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds === 0) return '00:00';
    const h = Math.floor(timeInSeconds / 3600);
    const m = Math.floor((timeInSeconds % 3600) / 60);
    const s = Math.floor(timeInSeconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // 1. Injeta o script da API do YouTube se não existir
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    let intervalId: NodeJS.Timeout;

    const initPlayer = () => {
      // Se já estiver inicializando ou se o wrapper não existir, aborta
      if (isInitializing.current || !wrapperRef.current) return;
      
      // Se já existir um player para este videoId, não recria
      if (playerRef.current && typeof playerRef.current.getVideoData === 'function') {
        const data = playerRef.current.getVideoData();
        if (data && data.video_id === videoId) return;
      }

      isInitializing.current = true;

      // LIMPEZA MANUAL DO DOM: 
      // Criamos um elemento novo e injetamos manualmente. 
      // O React verá apenas o wrapperRef vazio e não interferirá com o iframe.
      wrapperRef.current.innerHTML = '';
      const targetDiv = document.createElement('div');
      targetDiv.id = `yt-internal-player-${videoId}`;
      targetDiv.className = 'w-full h-full';
      wrapperRef.current.appendChild(targetDiv);

      playerRef.current = new window.YT.Player(targetDiv, {
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          enablejsapi: 1,
          origin: window.location.origin,
          widget_referrer: window.location.origin,
        },
        events: {
          onReady: (event) => {
            setIsReady(true);
            isInitializing.current = false;
            setVolume(event.target.getVolume() || 100);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setHasInteracted(true); // O navegador já validou o gesto! Podemos ativar o nosso escudo.
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
            }
          },
          onError: (error) => {
            console.error("YouTube Player Error:", error.data);
            isInitializing.current = false;
          }
        }
      });
    };

    const checkYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        if (intervalId) clearInterval(intervalId);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      intervalId = setInterval(checkYouTubeAPI, 100);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.error("Error destroying player:", error);
        }
        playerRef.current = null;
      }
      isInitializing.current = false;
      setIsReady(false);
      setHasInteracted(false); // Reset interaction state for new video
    };
  }, [videoId]);

  useEffect(() => {
    let timeInterval: NodeJS.Timeout;
    // Só atualiza o tempo se o vídeo estiver tocando E o usuário não estiver arrastando a barra
    if (isPlaying && !isSeeking) {
      timeInterval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          setCurrentTime(playerRef.current.getCurrentTime());
          // Atualiza a duração ocasionalmente (útil para lives onde a duração cresce)
          setDuration(playerRef.current.getDuration() || 0);
        }
      }, 1000);
    }
    return () => {
      if (timeInterval) clearInterval(timeInterval);
    };
  }, [isPlaying, isSeeking]);

  const togglePlay = () => {
    if (!playerRef.current || !isReady) return;
    
    try {
      const state = playerRef.current.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch {
      // Fallback caso o estado não possa ser lido
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
    } else {
      playerRef.current.mute();
    }
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
      if (newVolume > 0 && isMuted) toggleMute();
    }
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleSeekMouseDown = () => setIsSeeking(true);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsSeeking(false);
    const newTime = parseFloat(e.currentTarget.value);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(newTime, true); // O 'true' permite buscar antes de carregar o buffer
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
      
      {/* O Iframe do YouTube Isolado e Protegido */}
      {/* REMOVIDO o pointer-events-none daqui para permitir o clique inicial */}
      <div className="absolute inset-0">
        {/* Utilizamos dangerouslySetInnerHTML={{ __html: '' }} para proibir o React de re-renderizar ou limpar o conteúdo desta div após o YouTube injetar o Iframe */}
        <div 
          ref={wrapperRef}
          id={`yt-player-${videoId}`} 
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: '' }}
        />
      </div>

      {/* O ESCUDO INTELIGENTE (Smart Glass Shield) */}
      {/* Se ainda não interagiu, o escudo tem pointer-events-none (deixa o clique passar para o YouTube).
          Se já interagiu (hasInteracted), o escudo ganha pointer-events-auto e bloqueia o ecrã, permitindo apenas os nossos botões. */}
      <div 
        className={`absolute inset-0 z-10 ${hasInteracted ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'}`} 
        onClick={() => {
          if (hasInteracted && isReady) togglePlay();
        }}
        onContextMenu={(e) => e.preventDefault()}
      ></div>

      {/* Barra de Controlos Customizada */}
      {/* Os controlos só aparecem e ficam clicáveis APÓS a primeira interação no player nativo */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 flex flex-col justify-end gap-2 ${isReady && hasInteracted ? 'opacity-0 group-hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        
        {/* NOVA BARRA DE PROGRESSO */}
        <div className="w-full flex items-center gap-3">
          <span className="text-xs text-white font-medium min-w-[40px] text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onMouseDown={handleSeekMouseDown}
            onTouchStart={handleSeekMouseDown}
            onChange={handleSeekChange}
            onMouseUp={handleSeekMouseUp}
            onTouchEnd={handleSeekMouseUp}
            className="flex-1 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-2 transition-all"
          />
          <span className="text-xs text-gray-400 font-medium min-w-[40px]">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-red-500 transition">
              {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
            </button>
            
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-red-500 transition">
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={handleVolumeChange}
                className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <span className="text-white text-xs font-bold uppercase">Ao Vivo</span>
            </div>
            <button onClick={toggleFullScreen} className="text-white hover:text-red-500 transition">
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
