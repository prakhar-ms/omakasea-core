import { createConnection, mongo } from "mongoose";
import Grid from "gridfs-stream";

let GRID_FS = null;
let GRID_FS_BUCKET = null;

class GridFS {
    static connect(url) {
        return new Promise((resolve, reject) => {
            const conn = createConnection(url);
            conn.once("open", () => {
                if (GRID_FS === null) {
                    console.log("GRID FS INIT");
                    GRID_FS = Grid(conn.db, mongo);
                    GRID_FS.collection(process.env.BUCKET_NAME);
                    GRID_FS_BUCKET = new mongo.GridFSBucket(conn.db, {
                        bucketName: process.env.BUCKET_NAME,
                    });

                    Object.freeze(GRID_FS);
                    Object.freeze(GRID_FS_BUCKET);
                }

                resolve({ GRID_FS, GRID_FS_BUCKET });
            });
        });
    }

    static getChunks(imageKey) {
        return new Promise((resolve, reject) => {
            GridFS.getStream(imageKey)
                .then((data) => {
                    const chunks = [];
                    data.stream.on("data", (chunk) => {
                        chunks.push(chunk);
                    });

                    data.stream.on("end", () => {
                        const isGif = data.isGif;
                        const input = Buffer.concat(chunks);
                        resolve({ input, isGif });
                    });
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    static getStream(imageKey) {
        return new Promise((resolve, reject) => {
            GRID_FS.files.findOne({ filename: imageKey }, (err, file) => {
                // Check if file
                if (!file || file.length === 0) {
                    reject({
                        err: "No file exists",
                    });
                } else if (
                    file.contentType === "image/jpeg" ||
                    file.contentType === "image/png" ||
                    file.contentType === "image/gif"
                ) {
                    const isGif = file.contentType === "image/gif";
                    const stream = GRID_FS_BUCKET.openDownloadStream(file._id);
                    resolve({ stream, isGif });
                } else {
                    reject({
                        err: "Not an image",
                    });
                }
            });
        });
    }
}

export default GridFS;
