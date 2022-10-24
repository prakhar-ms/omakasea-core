import dotenv from "dotenv";
dotenv.config();

import IPFS from "../data/net/IPFS.js";
import VideoDAO from "../data/mongo/dao/VideoDAO.js";
import PlaylistDAO from "../data/mongo/dao/PlaylistDAO.js";
import FileSystem from "../util/FileSystem.js";
import Client from "../http/Client.js";
import Server from "../http/Server.js";
import FFMPEG from "../video/FFMPEG.js";

const STREAMER_URL = "http://192.168.86.102:4082";

const HOURS = 3;
const TIME_BUFFER = HOURS * 3600;

const ERROR_BUFFER_MAX = 3;

const THIS_PORT = 4081;
const THIS_NAME = "PLAYER";

class Playlist {
    constructor(address) {
        this.address = address;
        this.isLoaded = false;

        this.server = new Server(THIS_NAME, THIS_PORT);
        this.server.post("/", (req, res) => {
            res.json({ status: 200 });
            const last = {
                cid: req.body.cid,
                createdAt: req.body.uploadedAt,
            };

            this.BROADCAST().then(() => {
                VideoDAO.search(last).then((videos) => {
                    for (const video of videos) {
                        FileSystem.delete(FileSystem.getTranscodePath(video));
                    }
                });
            });
        });
    }

    toSeconds(metadata) {
        return (
            metadata.duration.hours * 3600 +
            metadata.duration.minutes * 60 +
            metadata.duration.seconds
        );
    }

    __next__(playlist) {
        let i = 0;
        let isFound = false;
        for (const video of playlist.listing) {
            if (this.__isPlaying__(video, playlist.playing)) {
                isFound = true;
            }

            if (!isFound) {
                i++;
            }
        }

        if (i + 1 < playlist.listing.length) {
            playlist.playing = playlist.listing[i + 1];
        } else {
            playlist.playing = playlist.listing[0];
        }

        return i;
    }

    load() {
        return new Promise((resolve, reject) => {
            PlaylistDAO.get({ address: this.address }).then((playlist) => {
                let index = 0;
                if (playlist.playing !== null) {
                    index = this.__next__(playlist);
                }
                this.__load__(resolve, playlist, index);
            });
        });
    }

    __load__(resolve, playlist, index = 0, runningTime = 0, listing = []) {
        if (index === playlist.listing.length) {
            index = 0;
        }

        if (runningTime < TIME_BUFFER) {
            const current = playlist.listing[index];
            VideoDAO.search({ cid: current.cid }).then((videos) => {
                runningTime += this.toSeconds(videos[0].metadata);

                listing.push(videos[0]);
                this.__load__(
                    resolve,
                    playlist,
                    index + 1,
                    runningTime,
                    listing,
                );
            });
        } else {
            resolve(listing);
        }
    }

    download(listing) {
        return new Promise((resolve, reject) => {
            const FILES = {
                downloads: [],
                transcoded: [],
            };
            this.__download__(resolve, listing, FILES);
        });
    }

    __download__(resolve, listing, files) {
        if (listing.length > 0) {
            const video = listing.shift();

            const dPath = FileSystem.getDownloadPath(video);
            const tPath = FileSystem.getTranscodePath(video);

            if (!this.isLoaded && listing.length < ERROR_BUFFER_MAX) {
                FileSystem.delete(dPath);
                FileSystem.delete(tPath);
            }

            const isDownloaded = FileSystem.exists(dPath);
            const isTranscoded = FileSystem.exists(tPath);

            if (!isDownloaded && !isTranscoded) {
                IPFS.download(video).then(() => {
                    files.downloads.push(dPath);
                    console.log(`\nCONVERTING\n${video.filename}`);
                    console.log(`${video.uuid}\n`);
                    FFMPEG.convert(video).then(() => {
                        files.transcoded.push(tPath);
                        FileSystem.delete(dPath);
                        this.__download__(resolve, listing, files);
                    });
                });
            } else if (!isTranscoded) {
                FFMPEG.convert(video).then(() => {
                    if (isDownloaded) {
                        FileSystem.delete(dPath);
                    }

                    files.transcoded.push(tPath);
                    this.__download__(resolve, listing, files);
                });
            } else {
                if (isDownloaded) {
                    FileSystem.delete(dPath);
                }

                files.transcoded.push(tPath);
                FileSystem.delete(dPath);
                this.__download__(resolve, listing, files);
            }
        } else {
            resolve(files);
        }
    }

    clear(files) {
        return new Promise((resolve, reject) => {
            this.__delete__(resolve, files);
        });
    }

    __delete__(resolve, files) {
        if (files.length > 0) {
            const current = files.shift();
            if (FileSystem.exists(current)) {
                FileSystem.delete(current);
            }

            this.__delete__(resolve, files);
        } else {
            resolve();
        }
    }

    __isPlaying__(video, playing) {
        return (
            video.cid === playing.cid && video.uploadedAt === playing.uploadedAt
        );
    }

    increment() {
        return new Promise((resolve, reject) => {
            PlaylistDAO.get({ address: this.address }).then((playlist) => {
                if (playlist.playing === null) {
                    playlist.playing = playlist.listing[0];
                } else {
                    this.__next__(playlist);
                }

                PlaylistDAO.save(playlist).then(() => {
                    resolve(playlist);
                });
            });
        });
    }

    BROADCAST() {
        return new Promise((resolve, reject) => {
            this.increment().then((playlist) => {
                const payload = { data: playlist.playing };
                Client.post(STREAMER_URL, payload);
                this.load().then((listing) => {
                    this.download(listing).then((files) => {
                        resolve(files);
                    });
                });
            });
        });
    }

    START() {
        this.server.start();
        this.load().then((listing) => {
            this.download(listing).then(() => {
                this.isLoaded = true;
                PlaylistDAO.get({ address: this.address }).then((playlist) => {
                    const payload = { data: playlist.playing };
                    Client.post(STREAMER_URL, payload);
                });
            });
        });
    }
}

export default Playlist;
