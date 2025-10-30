// --- Data ---
const sampleUser = {
  name: "Music Lover",
  avatarUrl: "https://picsum.photos/seed/musiclover/100/100",
};

const sampleTrackUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

const sampleAlbum = {
  id: 1,
  title: "Electronic Dreams",
  artist: "Various Artists",
  coverUrl: "https://picsum.photos/seed/electronicdreams/500/500",
  tracks: [
    { id: 101, title: "Midnight City", artist: "M83", duration: "5:29", url: sampleTrackUrl },
    { id: 102, title: "Genesis", artist: "Grimes", duration: "4:15", url: sampleTrackUrl },
    { id: 103, title: "Oblivion", artist: "Grimes", duration: "4:12", url: sampleTrackUrl },
    { id: 104, title: "Shelter", artist: "Porter Robinson & Madeon", duration: "3:39", url: sampleTrackUrl },
    { id: 105, title: "Innerbloom", artist: "RÜFÜS DU SOL", duration: "9:38", url: sampleTrackUrl },
    { id: 106, title: "Tearing Me Up", artist: "Bob Moses", duration: "7:51", url: sampleTrackUrl },
  ],
};

// --- App State ---
let state = {
  user: { ...sampleUser },
  album: { ...sampleAlbum },
  currentView: 'home',
  likedTrackIds: new Set<number>(),
  history: [] as any[],
  localTracks: [] as any[],
  isNavOpen: true,
  activeTrack: null as any | null,
  playlist: [] as any[],
  isPlaying: false,
  volume: 1,
  isMuted: false,
  lastVolume: 1,
  repeatMode: 'off', // 'off', 'one', 'all'
  isShuffled: false,
};

let shuffledPlaylist = [] as any[];

// --- DOM Elements ---
interface DOMElementCache {
    sidenav: HTMLElement;
    main: HTMLElement;
    navToggle: HTMLButtonElement;
    profileButton: HTMLButtonElement;
    profileName: HTMLElement;
    profileAvatar: HTMLImageElement;
    viewContainer: HTMLElement;
    playerBar: HTMLElement;
    playerProgressContainer: HTMLElement;
    playerProgress: HTMLElement;
    playerTrackInfo: HTMLElement;
    playerCover: HTMLImageElement;
    playerTitle: HTMLElement;
    playerArtist: HTMLElement;
    playerPlayToggle: HTMLButtonElement;
    playerMuteToggle: HTMLButtonElement;
    playerVolumeSlider: HTMLInputElement;
    playerScreen: HTMLElement;
    playerScreenClose: HTMLButtonElement;
    psCoverArt: HTMLImageElement;
    psTrackTitle: HTMLElement;
    psTrackArtist: HTMLElement;
    psCurrentTime: HTMLElement;
    psSeeker: HTMLInputElement;
    psDuration: HTMLElement;
    psShuffleBtn: HTMLButtonElement;
    psPrevBtn: HTMLButtonElement;
    psPlayToggleBtn: HTMLButtonElement;
    psNextBtn: HTMLButtonElement;
    psRepeatBtn: HTMLButtonElement;
    psRepeatOneIndicator: HTMLElement;
    psMuteToggle: HTMLButtonElement;
    psVolumeSlider: HTMLInputElement;
    audioPlayer: HTMLAudioElement;
    avatarInput: HTMLInputElement;
    localTracksInput: HTMLInputElement;
    navButtons: NodeListOf<HTMLButtonElement>;
}

const DOMElements = {} as DOMElementCache;

function kebabToCamel(s: string): string {
    return s.replace(/-./g, x => x[1].toUpperCase());
}

document.addEventListener('DOMContentLoaded', () => {
    // Cache all DOM elements
    const ids = [
        'sidenav', 'main', 'nav-toggle', 'profile-button', 'profile-name', 'profile-avatar',
        'view-container', 'player-bar', 'player-progress-container', 'player-progress', 'player-track-info', 'player-cover', 'player-title', 'player-artist',
        'player-play-toggle', 'player-mute-toggle', 'player-volume-slider', 'player-screen',
        'player-screen-close', 'ps-cover-art', 'ps-track-title', 'ps-track-artist', 'ps-current-time',
        'ps-seeker', 'ps-duration', 'ps-shuffle-btn', 'ps-prev-btn', 'ps-play-toggle-btn', 'ps-next-btn', 'ps-repeat-btn',
        'ps-repeat-one-indicator', 'ps-mute-toggle', 'ps-volume-slider', 'audio-player', 'avatar-input', 'local-tracks-input'
    ];
    
    // Fix: Convert kebab-case IDs to camelCase for property names to match the interface.
    ids.forEach(id => {
        const camelCaseKey = kebabToCamel(id);
        (DOMElements as any)[camelCaseKey] = document.getElementById(id);
    });
    
    DOMElements.navButtons = document.querySelectorAll<HTMLButtonElement>('.sidenav button[data-navigate]');

    initApp();
});

// --- Initialization ---
function initApp() {
    setupEventListeners();
    updateUserUI();
    renderCurrentView();
}

// --- Event Listeners ---
function setupEventListeners() {
    DOMElements.navToggle.addEventListener('click', toggleNav);
    DOMElements.profileButton.addEventListener('click', () => navigate('profile'));
    DOMElements.navButtons.forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.navigate as string));
    });

    // Player controls
    DOMElements.playerPlayToggle.addEventListener('click', handlePlayToggle);
    DOMElements.psPlayToggleBtn.addEventListener('click', handlePlayToggle);
    DOMElements.playerTrackInfo.addEventListener('click', () => DOMElements.playerScreen.classList.add('visible'));
    DOMElements.playerScreenClose.addEventListener('click', () => DOMElements.playerScreen.classList.remove('visible'));
    DOMElements.psNextBtn.addEventListener('click', handlePlayNext);
    DOMElements.psPrevBtn.addEventListener('click', handlePlayPrev);
    DOMElements.psShuffleBtn.addEventListener('click', handleToggleShuffle);
    DOMElements.psRepeatBtn.addEventListener('click', handleToggleRepeat);
    
    // Volume and Seeking
    const volumeSliders = [DOMElements.playerVolumeSlider, DOMElements.psVolumeSlider];
    const muteButtons = [DOMElements.playerMuteToggle, DOMElements.psMuteToggle];
    // Fix: Cast event target to HTMLInputElement to access 'value'.
    volumeSliders.forEach(slider => slider.addEventListener('input', (e) => handleVolumeChange(Number((e.target as HTMLInputElement).value))));
    muteButtons.forEach(btn => btn.addEventListener('click', handleMuteToggle));
    // Fix: Cast event target to HTMLInputElement to access 'value'.
    DOMElements.psSeeker.addEventListener('input', (e) => DOMElements.audioPlayer.currentTime = Number((e.target as HTMLInputElement).value));
    
    // Audio Player events
    DOMElements.audioPlayer.addEventListener('timeupdate', updateProgress);
    DOMElements.audioPlayer.addEventListener('loadedmetadata', updateProgress);
    DOMElements.audioPlayer.addEventListener('ended', handleTrackEnd);
    DOMElements.audioPlayer.addEventListener('play', () => { state.isPlaying = true; updatePlayPauseIcons(); });
    DOMElements.audioPlayer.addEventListener('pause', () => { state.isPlaying = false; updatePlayPauseIcons(); });
    
    // File inputs
    DOMElements.avatarInput.addEventListener('change', handleAvatarChange);
    DOMElements.localTracksInput.addEventListener('change', handleUpload);
}


// --- UI Rendering & Updates ---

function renderCurrentView() {
    const { currentView } = state;
    DOMElements.viewContainer.innerHTML = ''; // Clear previous view

    DOMElements.navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.navigate === currentView);
    });

    switch (currentView) {
        case 'home': DOMElements.viewContainer.innerHTML = renderHomeView(); break;
        case 'liked': DOMElements.viewContainer.innerHTML = renderTrackListView('Liked Songs', getAllTracks().filter(t => state.likedTrackIds.has(t.id))); break;
        case 'history': DOMElements.viewContainer.innerHTML = renderTrackListView('Recently Played', state.history); break;
        case 'local': DOMElements.viewContainer.innerHTML = renderLocalFilesView(); break;
        case 'profile': DOMElements.viewContainer.innerHTML = renderProfileView(); break;
    }
    
    // After rendering, add event listeners for dynamic content
    addDynamicEventListeners();
}

function renderTrackItem(track: any, index: number, context: any) {
    const isActive = state.activeTrack?.id === track.id;
    const isLiked = state.likedTrackIds.has(track.id);
    const num = track.id.toString().slice(-2) || `<i class="fas fa-music"></i>`;
    let icon = `<span>${num}</span>`;
    if (isActive) {
        icon = state.isPlaying
            ? `<i class="fas fa-volume-up icon"></i>`
            : `<i class="fas fa-pause icon"></i>`;
    }

    return `
        <li class="track-item ${isActive ? 'active' : ''}" data-track-id="${track.id}" data-context='${JSON.stringify(context)}'>
            <div class="track-item-main">
                <div class="track-item-num">${icon}</div>
                <div class="track-item-details">
                    <h3 class="track-item-title">${track.title}</h3>
                    <p class="track-item-artist">${track.artist}</p>
                </div>
            </div>
            <div class="track-item-controls">
                <button class="like-btn ${isLiked ? 'liked' : ''}" data-like-id="${track.id}" aria-label="Like song"><i class="${isLiked ? 'fas' : 'far'} fa-heart"></i></button>
                <button class="download-btn" data-download-id="${track.id}" aria-label="Download song"><i class="fas fa-download"></i></button>
                <span class="track-item-duration">${track.duration}</span>
            </div>
        </li>
    `;
}

function renderHomeView() {
    const { album } = state;
    return `
        <div class="content-surface">
            <div class="home-view">
                <div class="album-cover-container">
                    <img src="${album.coverUrl}" alt="${album.title}" class="album-cover" />
                </div>
                <div class="album-details">
                    <div class="album-details-grow">
                        <h1 class="album-title">${album.title}</h1>
                        <h2 class="album-artist">${album.artist}</h2>
                        <button class="play-album-btn"><i class="fas fa-play"></i><span>Play Album</span></button>
                    </div>
                </div>
            </div>
            <div class="tracks-container">
                <h3 class="tracks-header">Tracks</h3>
                <ul class="track-list">${album.tracks.map((t, i) => renderTrackItem(t, i, album.tracks)).join('')}</ul>
            </div>
        </div>
    `;
}

function renderTrackListView(title: string, tracks: any[]) {
    return `
      <div class="content-surface">
        <h1 class="view-title">${title}</h1>
        ${tracks.length > 0
            ? `<ul class="track-list">${tracks.map((t, i) => renderTrackItem(t, i, tracks)).join('')}</ul>`
            : `<p>No tracks to show here yet.</p>`
        }
      </div>
    `;
}

function renderLocalFilesView() {
    return `
      <div class="content-surface">
        <h1 class="view-title">Local Files</h1>
        <button id="upload-btn" class="upload-btn"><i class="fas fa-plus"></i> Upload Tracks</button>
        ${state.localTracks.length > 0
            ? `<ul class="track-list">${state.localTracks.map((t, i) => renderTrackItem(t, i, state.localTracks)).join('')}</ul>`
            : `<p>No local files uploaded yet.</p>`
        }
      </div>
    `;
}

function renderProfileView() {
    return `
      <div class="content-surface profile-view">
        <h1 class="view-title" style="align-self: flex-start;">Profile</h1>
        <div class="avatar-container">
          <img src="${state.user.avatarUrl}" alt="${state.user.name}" id="profile-view-avatar" class="avatar-img" />
          <button id="avatar-edit-btn" class="avatar-edit-btn" aria-label="Change profile picture">
            <i class="fas fa-camera"></i>
          </button>
        </div>
        <div class="form-group">
          <label for="name-input" class="form-label">Display Name</label>
          <input type="text" id="name-input" value="${state.user.name}" class="form-input" placeholder="Enter your name" />
        </div>
        <p class="footer-text">Changes are saved automatically.</p>
      </div>
    `;
}

function addDynamicEventListeners() {
    // Track item clicks
    // Fix: Use generic querySelectorAll and cast event target to access element-specific properties.
    document.querySelectorAll<HTMLElement>('.track-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Fix: Cast e.target to HTMLElement to use closest()
            if ((e.target as HTMLElement).closest('button')) return; // Ignore clicks on buttons within the item
            const trackId = Number(item.dataset.trackId);
            const context = JSON.parse(item.dataset.context as string);
            const track = getAllTracks().find(t => t.id === trackId);
            if (track) handlePlayTrack(track, context);
        });
    });

    // Like buttons
    // Fix: Use generic querySelectorAll to get correctly typed elements.
    document.querySelectorAll<HTMLButtonElement>('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => handleToggleLike(Number(btn.dataset.likeId)));
    });
    
    // Download buttons
    // Fix: Use generic querySelectorAll to get correctly typed elements.
    document.querySelectorAll<HTMLButtonElement>('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const track = getAllTracks().find(t => t.id === Number(btn.dataset.downloadId));
            if(track) handleDownloadTrack(track);
        });
    });

    if (state.currentView === 'home') {
        document.querySelector('.play-album-btn')?.addEventListener('click', () => {
            handlePlayTrack(state.album.tracks[0], state.album.tracks);
        });
    }

    if (state.currentView === 'profile') {
        document.getElementById('avatar-edit-btn')?.addEventListener('click', () => DOMElements.avatarInput.click());
        document.getElementById('name-input')?.addEventListener('input', (e) => {
            // Fix: Cast e.target to HTMLInputElement to access 'value'.
            state.user.name = (e.target as HTMLInputElement).value;
            updateUserUI();
        });
    }

    if (state.currentView === 'local') {
        document.getElementById('upload-btn')?.addEventListener('click', () => DOMElements.localTracksInput.click());
    }
}

function updateUserUI() {
    DOMElements.profileName.textContent = state.user.name;
    DOMElements.profileAvatar.src = state.user.avatarUrl;
    // Fix: Cast the element to HTMLImageElement to safely access 'src'.
    const profileViewAvatar = document.getElementById('profile-view-avatar') as HTMLImageElement;
    if (profileViewAvatar) profileViewAvatar.src = state.user.avatarUrl;
}

function updatePlayerUI() {
    if (!state.activeTrack) {
        DOMElements.playerBar.classList.add('hidden');
        document.body.classList.remove('player-active');
        return;
    }
    DOMElements.playerBar.classList.remove('hidden');
    document.body.classList.add('player-active');

    const track = state.activeTrack;
    const album = track.url?.startsWith('blob:') ? { coverUrl: "https://picsum.photos/seed/localfile/100/100" } : state.album;

    // Bar
    DOMElements.playerTitle.textContent = track.title;
    DOMElements.playerArtist.textContent = track.artist;
    DOMElements.playerCover.src = album.coverUrl;

    // Full screen
    DOMElements.psTrackTitle.textContent = track.title;
    DOMElements.psTrackArtist.textContent = track.artist;
    DOMElements.psCoverArt.src = album.coverUrl;
    
    updatePlayPauseIcons();
    renderCurrentView(); // Re-render to update active track highlight
}

function updatePlayPauseIcons() {
    const iconClass = state.isPlaying ? 'fa-pause-circle' : 'fa-play-circle';
    DOMElements.playerPlayToggle.innerHTML = `<i class="fas ${iconClass}"></i>`;
    DOMElements.psPlayToggleBtn.innerHTML = `<i class="fas ${iconClass}"></i>`;
}

function formatTime(seconds: number) {
    if (isNaN(seconds)) return "0:00";
    return new Date(seconds * 1000).toISOString().substr(14, 5);
}

function updateProgress() {
    const { currentTime, duration } = DOMElements.audioPlayer;
    if (isNaN(duration)) return;
    
    const progressPercent = (currentTime / duration) * 100;
    DOMElements.playerProgress.style.width = `${progressPercent}%`;

    DOMElements.psSeeker.value = String(currentTime);
    DOMElements.psSeeker.max = String(duration);
    DOMElements.psCurrentTime.textContent = formatTime(currentTime);
    DOMElements.psDuration.textContent = formatTime(duration);
}


// --- App Logic & Handlers ---

function navigate(view: string) {
    state.currentView = view;
    renderCurrentView();
}

function toggleNav() {
    state.isNavOpen = !state.isNavOpen;
    DOMElements.sidenav.classList.toggle('collapsed', !state.isNavOpen);
    DOMElements.main.classList.toggle('sidenav-collapsed', !state.isNavOpen);
}

function handlePlayTrack(track: any, context: any[]) {
    if (state.activeTrack?.id === track.id) {
        handlePlayToggle();
    } else {
        state.playlist = context;
        if (state.isShuffled) generateShuffledPlaylist();
        state.activeTrack = track;
        DOMElements.audioPlayer.src = track.url || "https://aistudios-cdn.appspot.com/public/silent.mp3";
        DOMElements.audioPlayer.play();
        updatePlayerUI();
    }
    
    // Update history
    if (!state.history.find(t => t.id === track.id)) {
        state.history.unshift(track);
        if (state.history.length > 50) state.history.pop();
    }
}

function handlePlayToggle() {
    if (!state.activeTrack) return;
    if (DOMElements.audioPlayer.paused) {
        DOMElements.audioPlayer.play();
    } else {
        DOMElements.audioPlayer.pause();
    }
}

function handlePlayNext() {
    if (!state.activeTrack || state.playlist.length === 0) return;
    const currentPlaylist = state.isShuffled ? shuffledPlaylist : state.playlist;
    const currentIndex = currentPlaylist.findIndex(t => t.id === state.activeTrack.id);
    if (currentIndex === -1) return;

    if (state.repeatMode !== 'off' || state.isShuffled || currentIndex < currentPlaylist.length - 1) {
        const nextIndex = (currentIndex + 1) % currentPlaylist.length;
        handlePlayTrack(currentPlaylist[nextIndex], state.playlist);
    } else {
        DOMElements.audioPlayer.pause();
    }
}

function handlePlayPrev() {
    if (!state.activeTrack || state.playlist.length === 0) return;
    if (DOMElements.audioPlayer.currentTime > 3) {
        DOMElements.audioPlayer.currentTime = 0;
        return;
    }

    const currentPlaylist = state.isShuffled ? shuffledPlaylist : state.playlist;
    const currentIndex = currentPlaylist.findIndex(t => t.id === state.activeTrack.id);
    const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    handlePlayTrack(currentPlaylist[prevIndex], state.playlist);
}

function handleTrackEnd() {
    if (state.repeatMode === 'one') {
        DOMElements.audioPlayer.currentTime = 0;
        DOMElements.audioPlayer.play();
    } else {
        handlePlayNext();
    }
}

function handleToggleLike(trackId: number) {
    if (state.likedTrackIds.has(trackId)) {
        state.likedTrackIds.delete(trackId);
    } else {
        state.likedTrackIds.add(trackId);
    }
    renderCurrentView();
}

function handleDownloadTrack(track: any) {
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
}

// Fix: Type event and add type guard for file reader result.
function handleAvatarChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
                state.user.avatarUrl = event.target.result;
                updateUserUI();
            }
        };
        reader.readAsDataURL(file);
    }
}

// Fix: Type event and cast event target to handle file uploads correctly.
function handleUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (!files) return;
    const newTracks = Array.from(files).map((file, index) => ({
        id: Date.now() + index,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist",
        duration: "-:--",
        url: URL.createObjectURL(file)
    }));
    state.localTracks.push(...newTracks);
    renderCurrentView();
}

function handleVolumeChange(newVolume: number) {
    state.volume = newVolume;
    DOMElements.audioPlayer.volume = newVolume;
    if (newVolume > 0 && state.isMuted) {
        state.isMuted = false;
    }
    updateVolumeUI();
}

function handleMuteToggle() {
    state.isMuted = !state.isMuted;
    if (state.isMuted) {
        state.lastVolume = state.volume;
        handleVolumeChange(0);
    } else {
        handleVolumeChange(state.lastVolume);
    }
}

function updateVolumeUI() {
    const sliders = [DOMElements.playerVolumeSlider, DOMElements.psVolumeSlider];
    sliders.forEach(s => s.value = String(state.isMuted ? 0 : state.volume));
    
    let iconClass;
    if (state.isMuted || state.volume === 0) iconClass = 'fa-volume-mute';
    else if (state.volume > 0.5) iconClass = 'fa-volume-up';
    else iconClass = 'fa-volume-down';

    const muteIcons = [DOMElements.playerMuteToggle, DOMElements.psMuteToggle];
    muteIcons.forEach(btn => btn.innerHTML = `<i class="fas ${iconClass}"></i>`);
}

function handleToggleShuffle() {
    state.isShuffled = !state.isShuffled;
    DOMElements.psShuffleBtn.classList.toggle('active', state.isShuffled);
    if(state.isShuffled) generateShuffledPlaylist();
}

function generateShuffledPlaylist() {
    shuffledPlaylist = [...state.playlist].sort(() => Math.random() - 0.5);
}

function handleToggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(state.repeatMode);
    state.repeatMode = modes[(currentIndex + 1) % modes.length];

    DOMElements.psRepeatBtn.classList.toggle('active', state.repeatMode !== 'off');
    DOMElements.psRepeatOneIndicator.classList.toggle('hidden', state.repeatMode !== 'one');
}

// --- Utilities ---
function getAllTracks() {
    return [...state.album.tracks, ...state.localTracks];
}
