import React, { useState, useEffect, useCallback, useRef } from 'react';
import { type Album, type Track, type User } from './types.js';
import { sampleAlbum, sampleUser } from './mockData.js';
import { generateAlbumDescription } from './lib/api.js';


// --- Helper & View Components ---

const SideNav: React.FC<{ 
    isNavOpen: boolean;
    currentView: string; 
    onNavigate: (view: 'home' | 'liked' | 'history' | 'local' | 'profile') => void; 
}> = ({ isNavOpen, currentView, onNavigate }) => {
    const navItems = [
        { id: 'home', icon: 'fa-home', label: 'Home' },
        { id: 'liked', icon: 'fa-heart', label: 'Liked Songs' },
        { id: 'history', icon: 'fa-history', label: 'History' },
        { id: 'local', icon: 'fa-upload', label: 'Local Files' },
        { id: 'profile', icon: 'fa-user', label: 'Profile' },
    ];

    return (
        <nav className={`h-screen flex flex-col fixed top-0 left-0 bg-brand-bg border-r border-brand-ui transition-all duration-300 ease-in-out z-30 ${isNavOpen ? 'w-60 p-4' : 'w-20 p-2'}`}>
            <div 
                className="h-16 flex items-center justify-center text-brand-accent cursor-pointer mb-6"
                onClick={() => onNavigate('home')}
                aria-label="Go to Home"
            >
                {isNavOpen ? (
                    <span className="text-3xl font-bold tracking-wider">LYTTE</span>
                ) : (
                    <i className="fas fa-headphones-alt text-2xl"></i>
                )}
            </div>
            <ul className="space-y-2">
                {navItems.map(item => (
                    <li key={item.id}>
                        <button
                            onClick={() => onNavigate(item.id as 'home' | 'liked' | 'history' | 'local' | 'profile')}
                            className={`flex items-center w-full text-left rounded-lg font-semibold transition-colors ${isNavOpen ? 'p-3 gap-4' : 'p-3 justify-center'} ${
                                currentView === item.id 
                                ? 'bg-brand-ui-hover text-brand-text' 
                                : 'text-brand-text-secondary hover:text-brand-text'
                            }`}
                            title={!isNavOpen ? item.label : undefined}
                        >
                            <i className={`fas ${item.icon} text-lg w-6 text-center`}></i>
                            {isNavOpen && <span>{item.label}</span>}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

const Header: React.FC<{ user: User; onToggleNav: () => void; onProfileClick: () => void; }> = ({ user, onToggleNav, onProfileClick }) => (
    <header className="flex items-center justify-between p-4 md:p-6 bg-brand-bg/80 backdrop-blur-sm sticky top-0 z-20">
        <button 
            onClick={onToggleNav}
            className="text-brand-text-secondary hover:text-brand-text text-xl p-2 rounded-full hover:bg-brand-ui transition-colors"
            aria-label="Toggle navigation menu"
        >
            <i className="fas fa-bars"></i>
        </button>
        <button onClick={onProfileClick} className="flex items-center gap-3 group">
            <span className="hidden sm:inline text-brand-text-secondary font-semibold group-hover:text-brand-text transition-colors">{user.name}</span>
            <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border-2 border-brand-accent object-cover group-hover:ring-2 group-hover:ring-brand-accent-hover transition-all" />
        </button>
    </header>
);

const TrackItem: React.FC<{ 
    track: Track; 
    isPlaying: boolean; 
    isActive: boolean; 
    isLiked: boolean;
    onToggleLike: () => void;
    onPlay: () => void;
    onDownload: () => void;
}> = ({ track, isPlaying, isActive, isLiked, onToggleLike, onPlay, onDownload }) => (
    <li 
        className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${isActive ? 'bg-brand-accent/20' : 'hover:bg-brand-ui-hover'}`}
        onClick={onPlay}
    >
        <div className="flex items-center gap-4 w-full truncate">
            <div className="w-6 text-center text-brand-text-secondary">
                {isActive ? (
                    isPlaying ? <i className="fas fa-volume-up text-brand-accent"></i> : <i className="fas fa-pause text-brand-accent"></i>
                ) : (
                    <span className="text-sm">{track.id ? track.id.toString().slice(-2) : <i className="fas fa-music"></i>}</span>
                )}
            </div>
            <div className="truncate">
                <h3 className={`font-semibold truncate ${isActive ? 'text-brand-accent' : 'text-brand-text'}`}>{track.title}</h3>
                <p className="text-sm text-brand-text-secondary truncate">{track.artist}</p>
            </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 pl-2">
            <button 
                onClick={(e) => { e.stopPropagation(); onToggleLike(); }} 
                className="text-brand-text-secondary hover:text-brand-accent transition-colors"
                aria-label={isLiked ? 'Unlike song' : 'Like song'}
            >
                <i className={`${isLiked ? 'fas' : 'far'} fa-heart`}></i>
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onDownload(); }} 
                className="text-brand-text-secondary hover:text-brand-accent transition-colors"
                aria-label="Download song"
            >
                <i className="fas fa-download"></i>
            </button>
            <span className="text-sm text-brand-text-secondary w-10 text-right hidden sm:inline">{track.duration}</span>
        </div>
    </li>
);

const HomeView: React.FC<{ album: Album; onPlayTrack: (track: Track, context: Track[]) => void; onToggleLike: (trackId: number) => void; onDownloadTrack: (track: Track) => void; likedTrackIds: Set<number>; activeTrack: Track | null; isPlaying: boolean; albumDescription: string; isGeneratingDescription: boolean; onGenerateDescription: () => void; }> = ({ album, onPlayTrack, onToggleLike, onDownloadTrack, likedTrackIds, activeTrack, isPlaying, albumDescription, isGeneratingDescription, onGenerateDescription }) => {
  return (
    <div className="bg-brand-surface rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <div className="md:w-1/3 flex-shrink-0">
                <img src={album.coverUrl} alt={album.title} className="w-full aspect-square rounded-lg shadow-2xl shadow-black/50" />
            </div>
            <div className="md:w-2/3 flex flex-col">
                <div className="flex-grow">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">{album.title}</h1>
                    <h2 className="text-lg sm:text-xl text-brand-text-secondary mt-2">{album.artist}</h2>
                    <button 
                        onClick={() => onPlayTrack(album.tracks[0], album.tracks)} 
                        className="mt-6 bg-brand-accent text-brand-bg font-bold py-3 px-6 rounded-full flex items-center gap-3 hover:bg-brand-accent-hover transition-transform transform hover:scale-105"
                    >
                       <i className="fas fa-play"></i>
                       <span>Play Album</span>
                    </button>
                    <button 
                        onClick={onGenerateDescription}
                        disabled={isGeneratingDescription}
                        className="mt-4 ml-4 bg-brand-ui text-brand-text-secondary font-semibold py-3 px-6 rounded-full flex items-center gap-2 hover:bg-brand-ui-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <i className="fas fa-magic"></i>
                        {isGeneratingDescription ? 'Generating...' : 'Generate Vibe'}
                    </button>
                    {albumDescription && (
                        <p className="text-brand-text-secondary mt-4 italic">{albumDescription}</p>
                    )}
                </div>
            </div>
        </div>
         <div className="mt-8">
            <h3 className="text-lg font-semibold mb-3">Tracks</h3>
            <ul className="space-y-2">
                {album.tracks.map((track) => (
                    <TrackItem 
                        key={track.id} 
                        track={track} 
                        isPlaying={isPlaying} 
                        isActive={activeTrack?.id === track.id}
                        isLiked={likedTrackIds.has(track.id)}
                        onToggleLike={() => onToggleLike(track.id)}
                        onPlay={() => onPlayTrack(track, album.tracks)}
                        onDownload={() => onDownloadTrack(track)}
                    />
                ))}
            </ul>
        </div>
    </div>
  );
};

const ProfilePanel: React.FC<{ user: User; onUserChange: (newUser: User) => void }> = ({ user, onUserChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => onUserChange({ ...user, name: e.target.value });
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) onUserChange({ ...user, avatarUrl: event.target.result as string });
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    const handleAvatarClick = () => fileInputRef.current?.click();

    return (
        <div className="bg-brand-surface p-6 rounded-lg shadow-lg flex flex-col items-center max-w-md mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold self-start mb-6">Profile</h1>
            <div className="relative group">
                <img src={user.avatarUrl} alt={user.name} className="w-32 h-32 rounded-full border-4 border-brand-ui object-cover transition-opacity group-hover:opacity-70" />
                <button onClick={handleAvatarClick} className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Change profile picture">
                    <i className="fas fa-camera text-2xl text-white"></i>
                </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
            <div className="w-full mt-6">
                <label htmlFor="name" className="block text-sm font-medium text-brand-text-secondary mb-2">Display Name</label>
                <input type="text" id="name" value={user.name} onChange={handleNameChange} className="w-full p-3 bg-brand-ui border border-brand-ui-hover rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none transition-colors" placeholder="Enter your name" />
            </div>
            <p className="text-sm text-brand-text-secondary mt-auto pt-4">Changes are saved automatically.</p>
        </div>
    );
};

const GenericTrackListView: React.FC<{ title: string; tracks: Track[]; likedTrackIds: Set<number>; onToggleLike: (trackId: number) => void; onPlayTrack: (track: Track, context: Track[]) => void; onDownloadTrack: (track: Track) => void; activeTrack: Track | null; isPlaying: boolean; children?: React.ReactNode;}> = ({ title, tracks, likedTrackIds, onToggleLike, onPlayTrack, onDownloadTrack, activeTrack, isPlaying, children }) => (
    <div className="bg-brand-surface rounded-lg shadow-lg p-4 sm:p-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6">{title}</h1>
        {children}
        {tracks.length > 0 ? (
            <ul className="space-y-2">
                {tracks.map(track => (
                    <TrackItem
                        key={track.id}
                        track={track}
                        isPlaying={isPlaying}
                        isActive={activeTrack?.id === track.id}
                        isLiked={likedTrackIds.has(track.id)}
                        onToggleLike={() => onToggleLike(track.id)}
                        onPlay={() => onPlayTrack(track, tracks)}
                        onDownload={() => onDownloadTrack(track)}
                    />
                ))}
            </ul>
        ) : (
            <p className="text-brand-text-secondary mt-4">No tracks to show here yet.</p>
        )}
    </div>
);

const LocalFilesView: React.FC<{ localTracks: Track[]; onUpload: (files: FileList) => void; } & Omit<React.ComponentProps<typeof GenericTrackListView>, 'title' | 'tracks' | 'children'>> = ({ localTracks, onUpload, ...props }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) onUpload(e.target.files);
    };

    return (
        <GenericTrackListView title="Local Files" tracks={localTracks} {...props}>
            <input type="file" multiple accept="audio/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="mb-6 bg-brand-accent text-brand-bg font-bold py-2 px-4 rounded-full flex items-center gap-2 hover:bg-brand-accent-hover transition-transform transform hover:scale-105">
                <i className="fas fa-plus"></i>
                Upload Tracks
            </button>
        </GenericTrackListView>
    );
};

const VolumeControl: React.FC<{ volume: number; onVolumeChange: (volume: number) => void; isMuted: boolean; onMuteToggle: () => void; }> = ({ volume, onVolumeChange, isMuted, onMuteToggle }) => (
    <div className="flex items-center gap-2 group">
        <button onClick={onMuteToggle} className="w-8 text-center text-brand-text-secondary hover:text-brand-text">
            <i className={`fas ${isMuted ? 'fa-volume-mute' : volume > 0.5 ? 'fa-volume-up' : volume > 0 ? 'fa-volume-down' : 'fa-volume-off'}`}></i>
        </button>
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-24 h-1 bg-brand-ui-hover rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-text"
            aria-label="Volume"
        />
    </div>
);

const PlayerBar: React.FC<{ track: Track; album: Album | null; isPlaying: boolean; onPlayToggle: () => void; onOpenFullScreen: () => void; progress: number; duration: number; volume: number; onVolumeChange: (v: number) => void; isMuted: boolean; onMuteToggle: () => void; }> = ({ track, album, isPlaying, onPlayToggle, onOpenFullScreen, progress, duration, volume, onVolumeChange, isMuted, onMuteToggle }) => {
    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-brand-ui h-20 flex items-center px-4 z-40 group">
            <div className="w-full absolute top-0 left-0 h-1 bg-brand-ui-hover cursor-pointer" onClick={onOpenFullScreen}>
                <div className="h-1 bg-brand-accent group-hover:bg-brand-accent-hover" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex items-center gap-3 w-1/3 cursor-pointer" onClick={onOpenFullScreen}>
                <img src={album?.coverUrl} alt={track.title} className="w-14 h-14 rounded-md" />
                <div className="truncate">
                    <p className="font-semibold truncate">{track.title}</p>
                    <p className="text-sm text-brand-text-secondary truncate">{track.artist}</p>
                </div>
            </div>
            <div className="w-1/3 flex justify-center">
                 <button onClick={(e) => { e.stopPropagation(); onPlayToggle(); }} className="text-3xl w-12 h-12 flex items-center justify-center text-brand-text hover:text-brand-accent">
                    <i className={`fas ${isPlaying ? 'fa-pause-circle' : 'fa-play-circle'}`}></i>
                </button>
            </div>
            <div className="w-1/3 flex justify-end">
                <div className="hidden md:flex">
                    <VolumeControl volume={volume} onVolumeChange={onVolumeChange} isMuted={isMuted} onMuteToggle={onMuteToggle} />
                </div>
            </div>
        </div>
    );
}

const PlayerScreen: React.FC<{ track: Track; album: Album | null; isPlaying: boolean; onPlayToggle: () => void; onClose: () => void; onSeek: (time: number) => void; progress: number; duration: number; onNext: () => void; onPrev: () => void; repeatMode: 'off' | 'one' | 'all'; onToggleRepeat: () => void; isShuffled: boolean; onToggleShuffle: () => void; volume: number; onVolumeChange: (v: number) => void; isMuted: boolean; onMuteToggle: () => void; }> = ({ track, album, isPlaying, onPlayToggle, onClose, onSeek, progress, duration, onNext, onPrev, repeatMode, onToggleRepeat, isShuffled, onToggleShuffle, volume, onVolumeChange, isMuted, onMuteToggle }) => {
    const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => onSeek(Number(e.target.value));
    
    return (
        <div className="fixed inset-0 bg-gradient-to-b from-brand-accent/50 to-brand-bg/90 backdrop-blur-xl z-50 flex flex-col p-4 sm:p-8">
            <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-3xl text-white/70 hover:text-white">
                <i className="fas fa-chevron-down"></i>
            </button>
            <div className="flex-grow flex flex-col items-center justify-center text-center pt-8">
                <img src={album?.coverUrl} alt={track.title} className="w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-lg shadow-2xl shadow-black/50 mb-8" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{track.title}</h1>
                <h2 className="text-lg sm:text-xl text-brand-text-secondary mt-2">{track.artist}</h2>
            </div>
            <div className="w-full max-w-2xl mx-auto">
                <div className="flex items-center gap-3">
                    <span className="text-xs text-brand-text-secondary">{formatTime(progress)}</span>
                    <input type="range" min="0" max={duration || 0} value={progress} onChange={handleSeek} className="w-full h-1 bg-brand-ui-hover rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-accent" />
                    <span className="text-xs text-brand-text-secondary">{formatTime(duration)}</span>
                </div>
                <div className="flex items-center justify-between gap-6 mt-4">
                    <button onClick={onToggleShuffle} className={`text-xl w-10 h-10 ${isShuffled ? 'text-brand-accent' : 'text-brand-text-secondary hover:text-white'}`}><i className="fas fa-random"></i></button>
                    <button onClick={onPrev} className="text-2xl text-brand-text-secondary hover:text-white"><i className="fas fa-step-backward"></i></button>
                    <button onClick={onPlayToggle} className="text-6xl text-white hover:scale-105 transition-transform"><i className={`fas ${isPlaying ? 'fa-pause-circle' : 'fa-play-circle'}`}></i></button>
                    <button onClick={onNext} className="text-2xl text-brand-text-secondary hover:text-white"><i className="fas fa-step-forward"></i></button>
                    <button onClick={onToggleRepeat} className={`text-xl w-10 h-10 relative ${repeatMode !== 'off' ? 'text-brand-accent' : 'text-brand-text-secondary hover:text-white'}`}>
                        <i className="fas fa-redo"></i>
                        {repeatMode === 'one' && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold">1</span>}
                    </button>
                </div>
                 <div className="flex md:hidden items-center justify-center mt-6">
                    <VolumeControl volume={volume} onVolumeChange={onVolumeChange} isMuted={isMuted} onMuteToggle={onMuteToggle} />
                </div>
            </div>
        </div>
    );
}


// --- Main App Component ---

function App() {
  const [album, setAlbum] = useState<Album | null>(null);
  const [user, setUser] = useState<User>(sampleUser);
  const [currentView, setCurrentView] = useState<'home' | 'liked' | 'history' | 'local' | 'profile'>('home');
  const [likedTrackIds, setLikedTrackIds] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<Track[]>([]);
  const [isNavOpen, setIsNavOpen] = useState(true);

  // Global Player State
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlayerScreen, setShowPlayerScreen] = useState(false);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  
  // Gemini State
  const [albumDescription, setAlbumDescription] = useState('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // New Player Controls State
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(1);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const [isShuffled, setIsShuffled] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const shuffledPlaylistRef = useRef<Track[]>([]);
  
  useEffect(() => {
    setAlbum(sampleAlbum);
  }, []);
  
  const handlePlayNext = useCallback(() => {
    if (!activeTrack || playlist.length === 0) return;
    
    const currentPlaylist = isShuffled ? shuffledPlaylistRef.current : playlist;
    const currentIndex = currentPlaylist.findIndex(t => t.id === activeTrack.id);
    
    if (currentIndex === -1) return; // Should not happen

    if (repeatMode !== 'off' || isShuffled || currentIndex < currentPlaylist.length - 1) {
        const nextIndex = (currentIndex + 1) % currentPlaylist.length;
        setActiveTrack(currentPlaylist[nextIndex]);
    } else {
        // End of playlist, not repeating
        setIsPlaying(false);
    }
  }, [activeTrack, playlist, repeatMode, isShuffled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
        if (repeatMode === 'one') {
            audio.currentTime = 0;
            audio.play();
        } else {
            handlePlayNext();
        }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handlePlayNext, repeatMode]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    const newSrc = activeTrack.url || "https://aistudios-cdn.appspot.com/public/silent.mp3";
    
    // Only change src and play if the track is actually new
    if (audio.src !== newSrc) {
        audio.src = newSrc;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name !== 'AbortError') console.error("Audio playback failed:", error);
          });
        }
    } else {
        // If src is the same, respect the current isPlaying state (e.g., for play/pause toggles)
        if (isPlaying && audio.paused) audio.play().catch(e => console.error("Error resuming playback:", e));
        else if (!isPlaying && !audio.paused) audio.pause();
    }
  }, [activeTrack, isPlaying]);
  
  useEffect(() => {
    if (isShuffled) {
        shuffledPlaylistRef.current = [...playlist].sort(() => Math.random() - 0.5);
    }
  }, [isShuffled, playlist]);

  const handlePlayToggle = useCallback(() => {
    if (activeTrack) {
        setIsPlaying(prev => !prev);
    }
  }, [activeTrack]);

  const handlePlayTrack = useCallback((track: Track, context: Track[]) => {
    if (activeTrack?.id === track.id) {
        handlePlayToggle();
    } else {
        setPlaylist(context);
        setActiveTrack(track);
        setIsPlaying(true);
    }
    
    setHistory(prev => {
        if (prev[0]?.id === track.id) return prev;
        return [track, ...prev.filter(t => t.id !== track.id)].slice(0, 50);
    });
  }, [activeTrack, handlePlayToggle]);

  const handlePlayPrev = useCallback(() => {
    if (!activeTrack || playlist.length === 0) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    
    const currentPlaylist = isShuffled ? shuffledPlaylistRef.current : playlist;
    const currentIndex = currentPlaylist.findIndex(t => t.id === activeTrack.id);
    const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    setActiveTrack(currentPlaylist[prevIndex]);
  }, [activeTrack, playlist, isShuffled]);

  const handleSeek = (time: number) => {
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setProgress(time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if(audioRef.current) audioRef.current.volume = newVolume;
    if (newVolume > 0 && isMuted) setIsMuted(false);
  };
  
  const handleMuteToggle = () => {
      if (isMuted) {
          setIsMuted(false);
          setVolume(lastVolume);
          if (audioRef.current) audioRef.current.volume = lastVolume;
      } else {
          setIsMuted(true);
          setLastVolume(volume);
          setVolume(0);
          if (audioRef.current) audioRef.current.volume = 0;
      }
  };

  const handleToggleRepeat = () => {
      const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
      setRepeatMode(prev => modes[(modes.indexOf(prev) + 1) % modes.length] as 'off' | 'all' | 'one');
  };

  const handleToggleLike = useCallback((trackId: number) => {
    setLikedTrackIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(trackId)) newSet.delete(trackId);
        else newSet.add(trackId);
        return newSet;
    });
  }, []);

  const handleUpload = (files: FileList) => {
    const newTracks: Track[] = Array.from(files).map((file, index) => ({
        id: Date.now() + index,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist",
        duration: "-:--",
        url: URL.createObjectURL(file)
    }));
    setLocalTracks(prev => [...prev, ...newTracks]);
  };

  const handleDownloadTrack = useCallback((track: Track) => {
    if (!track.url) {
        alert("This track does not have a downloadable source.");
        return;
    }
    const link = document.createElement('a');
    link.href = track.url;
    
    const fileExtension = track.url.split('.').pop()?.split('?')[0] || 'mp3';
    link.download = `${track.artist} - ${track.title}.${fileExtension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleGenerateDescription = async () => {
    if (!album) return;
    setIsGeneratingDescription(true);
    setAlbumDescription('');
    const desc = await generateAlbumDescription(album.title, album.artist);
    setAlbumDescription(desc);
    setIsGeneratingDescription(false);
  };

  const allTracks = album?.tracks ?? [];
  const likedTracks = [...allTracks, ...localTracks].filter(track => likedTrackIds.has(track.id));

  const renderView = () => {
    if (!album) return <div className="text-center p-10">Loading...</div>;
    
    const commonProps = { likedTrackIds, onToggleLike: handleToggleLike, onPlayTrack: handlePlayTrack, onDownloadTrack: handleDownloadTrack, activeTrack, isPlaying };

    switch (currentView) {
        case 'liked':
            return <GenericTrackListView title="Liked Songs" tracks={likedTracks} {...commonProps} />;
        case 'history':
            return <GenericTrackListView title="Recently Played" tracks={history} {...commonProps} />;
        case 'local':
            return <LocalFilesView localTracks={localTracks} onUpload={handleUpload} {...commonProps} />;
        case 'profile':
            return <ProfilePanel user={user} onUserChange={setUser} />;
        case 'home':
        default:
            return <HomeView album={album} {...commonProps} albumDescription={albumDescription} isGeneratingDescription={isGeneratingDescription} onGenerateDescription={handleGenerateDescription} />;
    }
  };

  const activeAlbum = activeTrack?.url?.startsWith('blob:') ? { id: 0, title: 'Local File', artist: 'You', coverUrl: "https://picsum.photos/seed/localfile/500/500", tracks: [] } : album;

  return (
    <div className={`font-sans ${activeTrack ? 'pb-20' : ''}`}>
      <SideNav isNavOpen={isNavOpen} currentView={currentView} onNavigate={setCurrentView} />
      
      <main className={`transition-all duration-300 ease-in-out ${isNavOpen ? 'ml-60' : 'ml-20'}`}>
        <Header user={user} onToggleNav={() => setIsNavOpen(prev => !prev)} onProfileClick={() => setCurrentView('profile')} />
        <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {renderView()}
            </div>
            <footer className="text-center mt-12 py-6 border-t border-brand-ui text-brand-text-secondary">
                <p className="font-semibold">Welcome to Lytte!</p>
                <p className="text-sm">Enjoy the music.</p>
            </footer>
        </div>
      </main>
      
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} crossOrigin="anonymous" />

      {activeTrack && (
        <PlayerBar track={activeTrack} album={activeAlbum} isPlaying={isPlaying} onPlayToggle={handlePlayToggle} onOpenFullScreen={() => setShowPlayerScreen(true)} progress={progress} duration={duration} volume={volume} onVolumeChange={handleVolumeChange} isMuted={isMuted} onMuteToggle={handleMuteToggle} />
      )}

      {showPlayerScreen && activeTrack && (
          <PlayerScreen 
            track={activeTrack} 
            album={activeAlbum} 
            isPlaying={isPlaying} 
            onPlayToggle={handlePlayToggle} 
            onClose={() => setShowPlayerScreen(false)} 
            onSeek={handleSeek} 
            progress={progress} 
            duration={duration} 
            onNext={handlePlayNext} 
            onPrev={handlePlayPrev}
            repeatMode={repeatMode}
            onToggleRepeat={handleToggleRepeat}
            isShuffled={isShuffled}
            onToggleShuffle={() => setIsShuffled(prev => !prev)}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            isMuted={isMuted}
            onMuteToggle={handleMuteToggle}
         />
      )}
    </div>
  );
}

export default App;
