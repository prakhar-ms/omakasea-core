import Busboy from "busboy";
import fs from "fs";

import FileSystem from "./FileSystem.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR;

function reply(req, status, message) {
    console.error(message);
    return {
        status,
        message,
        credentials: req.query,
    };
}

function transformName(uuid, fileName) {
    return `${uuid}.${FileSystem.getExtension(fileName)}`;
}

class UploadManager {
    static parseVideoUpload(req) {
        return new Promise((resolve, reject) => {
            const contentRange = req.headers["content-range"];
            const uploadId = req.headers["x-file-id"];
            const uuid = req.headers["x-file-uuid"];
            const sig = req.headers["signature"];

            if (!contentRange) {
                console.error("Missing Content-Range");
                reject(reply(req, 400, 'Missing "Content-Range" header'));
            }

            if (!uploadId) {
                console.error("Missing File Id");
                reject(reply(req, 400, 'Missing "X-File-Id" header'));
            }

            const match = contentRange.match(/bytes=(\d+)-(\d+)\/(\d+)/);

            if (!match) {
                console.error("Invalid Content-Range Format");
                reject(reply(req, 400, 'Invalid "Content-Range" Format'));
            }

            const rangeStart = Number(match[1]);
            const rangeEnd = Number(match[2]);
            const fileSize = Number(match[3]);

            if (
                rangeStart >= fileSize ||
                rangeStart >= rangeEnd ||
                rangeEnd > fileSize
            ) {
                reject(reply(req, 400, 'Invalid "Content-Range" provided'));
            }

            resolve({
                sig,
                uuid,
                uploadId,
                rangeStart,
            });
        });
    }

    static upload(req, details) {
        return new Promise((resolve, reject) => {
            const busboy = Busboy({ headers: req.headers });
            const { uploadId, rangeStart, uuid } = details;

            busboy.on("file", (fileName, file) => {
                const filePath = transformName(uuid, fileName);
                const uploadPath = `${UPLOAD_DIR}/${uploadId}/${filePath}`;
                FileSystem.createParentDir(uploadPath);

                const __FILE_SUCCESS__ = (stats) => {
                    if (stats.totalChunkUploaded !== rangeStart) {
                        reject(reply(req, 400, 'Bad "chunk" provided'));
                    }

                    file.pipe(
                        fs.createWriteStream(uploadPath, { flags: "a" }),
                    ).on("error", (e) => {
                        console.error("failed upload", e);
                        reply(req, 500, "Failed Upload");
                    });
                };

                const __FILE_ERROR__ = (error) => {
                    console.error("No File Match", error);
                    reject(reply(req, 400, "No File Match"));
                };

                if (!uploadId) {
                    req.pause();
                }

                this.__getFileDetails__(uploadPath)
                    .then(__FILE_SUCCESS__)
                    .catch(__FILE_ERROR__);
            });

            busboy.on("error", (e) => {
                console.error("File Upload Error", e);
                reject(reply(req, 500, "File Upload Error"));
            });

            busboy.on("finish", () => {
                resolve(reply(req, 200, "Upload complete"));
            });

            req.pipe(busboy);
        });
    }

    static canStart(req) {
        return req.body && req.body.fileName && req.body.uuid;
    }

    static startUpload(req) {
        return new Promise((resolve, reject) => {
            if (this.canStart(req)) {
                const uploadId = req.body.uploadId;
                const fileName = req.body.fileName;
                const uuid = req.body.uuid;
                const filePath = transformName(uuid, fileName);

                const uploadPath = `${UPLOAD_DIR}/${uploadId}/${filePath}`;

                FileSystem.createParentDir(uploadPath);
                fs.createWriteStream(uploadPath, {
                    flags: "w",
                });
                resolve({ uploadId });
            } else {
                reject({ message: 'Missing "fileName"' });
            }
        });
    }

    static canResume(req) {
        return (
            req.query &&
            req.query.fileName &&
            req.query.uploadId &&
            req.query.uuid
        );
    }

    static resumeUpload(req) {
        const uploadId = req.query.uploadId;
        const fileName = req.query.fileName;
        const uuid = req.query.uuid;

        const filePath = transformName(uuid, fileName);
        const uploadPath = `${UPLOAD_DIR}/${uploadId}/${filePath}`;
        FileSystem.createParentDir(uploadPath);

        return new Promise((resolve, reject) => {
            if (UploadManager.canResume(req)) {
                this.__getFileDetails__(uploadPath)
                    .then((result) => resolve(result))
                    .catch((error) => {
                        reject(reply(req, 400, "File not found"));
                    });
            } else {
                reject(reply(req, 400, "File not found"));
            }
        });
    }

    static __getFileDetails__(uploadPath) {
        return new Promise((resolve, reject) => {
            fs.stat(uploadPath, (error, stats) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ totalChunkUploaded: stats.size });
                }
            });
        });
    }
}

export default UploadManager;
