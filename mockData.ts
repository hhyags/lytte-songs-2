import { type Album, type User } from './types';

export const sampleUser: User = {
  name: "Music Lover",
  avatarUrl: "https://picsum.photos/seed/musiclover/100/100",
};

// A sample audio file for playback and download demonstration.
const sampleTrackUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

export const sampleAlbum: Album = {
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