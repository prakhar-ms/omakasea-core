import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR;
const TRANSCODE_DIR = process.env.TRANSCODE_DIR;

const EXCLUDE = [".DS_Store"];

class FileSystem {
    static getUploadPath(video) {
        const { uuid, extension } = video;
        return `${UPLOAD_DIR}/${uuid}.${extension}`;
    }

    static getDownloadPath(video) {
        const { uuid, extension } = video;
        return `${DOWNLOAD_DIR}/${uuid}.${extension}`;
    }

    static getTranscodePath(video) {
        const { uuid, extension } = video;
        return `${TRANSCODE_DIR}/${uuid}.${extension}`;
    }

    static delete(fPath) {
        try {
            fs.unlinkSync(fPath);
        } catch (error) {}
    }

    static getName(fPath) {
        return fPath.split(path.sep).pop();
    }

    static isGif(fPath) {
        const ext = fPath.split(".").pop().toLowerCase();
        return ext === "gif";
    }

    static createGenerateDir(parentDir) {
        FileSystem.createDir(parentDir);
        const files = fs.readdirSync(parentDir);
        const batch = `BATCH_${files.length + 1}`;
        const generateDir = `${parentDir}/${batch}`;
        FileSystem.createDir(generateDir);
        return generateDir;
    }

    static splitPath(target) {
        const toks = target.split(path.sep);
        const file = toks[toks.length - 1];

        if (file.includes(".")) {
            const extension = file.split(".")[1];
            toks.pop();
            return {
                file,
                extension,
                path: toks.join(path.sep),
            };
        }
    }

    static createParentDir(fullPath) {
        const targetDir = path.join(
            "./",
            fullPath.substring(0, fullPath.lastIndexOf("/") + 1),
        );

        FileSystem.createDir(targetDir);
    }

    static createDir(fullPath) {
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    }

    static getFiles(dir, files = []) {
        fs.readdirSync(dir).forEach((file) => {
            if (fs.statSync(dir + path.sep + file).isDirectory()) {
                files = FileSystem.getFiles(dir + path.sep + file, files);
            } else if (!EXCLUDE.includes(file)) {
                const fPath = path.join(dir, path.sep, file);
                const fName = FileSystem.getName(fPath);
                files.push({ fName, fPath });
            }
        });

        return files;
    }

    static getGenerated(uploadId) {
        const fullPath = `${process.env.GENERATED_DIR}/${uploadId}`;
        const list = fs.readdirSync(fullPath);
        const latest = list
            .filter((f) => !EXCLUDE.includes(f))
            .sort()
            .pop();
        const baseDir = `${fullPath}/${latest}`;
        return FileSystem.getFiles(baseDir);
    }
}

export default FileSystem;
