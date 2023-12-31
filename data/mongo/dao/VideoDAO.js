import __BaseDAO__ from "./__BaseDAO__.js";
import Video from "../models/Video.js";
import VideoSchema from "../schemas/VideoSchema.js";

class VideoDAO {
    static updateIPFS(data) {
        return new Promise((resolve, reject) => {
            __BaseDAO__.__get__(Video, { uuid: data.uuid }).then((video) => {
                video.cid = data.cid;
                __BaseDAO__.__save__(video).then(resolve).catch(reject);
            });
        });
    }

    static get(query) {
        return __BaseDAO__.__get__(Video, query);
    }

    static search(query = {}) {
        return __BaseDAO__.__search__(Video, query, {}, { createdAt: 1 });
    }

    static create(upload) {
        return new Promise((resolve, reject) => {
            const video = new Video({
                ...upload,
                createdAt: Date.now(),
            });
            __BaseDAO__
                .__save__(video)
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    static save(document) {
        return __BaseDAO__.__save__(document);
    }

    static uploadComplete(details) {
        return new Promise((resolve, reject) => {
            const query = {
                uuid: details.uuid,
                folderUUID: details.folderUUID,
            };
            __BaseDAO__.__get__(Video, query).then((doc) => {
                doc.isUploaded = true;
                doc.tokenId = details.tokenId;
                __BaseDAO__.__save__(doc).then(resolve);
            });
        });
    }

    static forTokenServer(tokenId) {
        return new Promise((resolve, reject) => {
            const query = {
                tokenId,
                isUploaded: true,
                isIPFS: false,
            };
            __BaseDAO__
                .__search__(Video, query)
                .then((results) => {
                    const videos = [];
                    for (const row of results) {
                        videos.push({
                            isValid: row.isValid,
                            filename: row.filename,
                        });
                    }

                    resolve(videos);
                })
                .catch(reject);
        });
    }

    static forTokenIPFS(tokenId) {
        return new Promise((resolve, reject) => {
            const query = {
                tokenId,

                isIPFS: true,
            };
            __BaseDAO__
                .__search__(Video, query)
                .then((results) => {
                    const videos = [];
                    for (const row of results) {
                        videos.push({
                            isValid: row.isValid,
                            filename: row.filename,
                        });
                    }

                    resolve(videos);
                })
                .catch(reject);
        });
    }
}

export default VideoDAO;
