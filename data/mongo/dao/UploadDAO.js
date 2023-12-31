import crypto from "crypto";
import __BaseDAO__ from "./__BaseDAO__.js";
import Upload from "../models/Upload.js";

class UploadDAO {
    static getReady() {
        return __BaseDAO__.__search__(Upload, {
            cid: null,
            isReady: true,
        });
    }

    static save(upload) {
        return __BaseDAO__.__save__(upload);
    }

    static get(query) {
        return __BaseDAO__.__get__(Upload, query);
    }

    static search(query) {
        return __BaseDAO__.__search__(Upload, query, {}, { createdAt: 1 });
    }

    static init(request) {
        return new Promise((resolve, reject) => {
            const tokenId = request.tokenId;
            const symbol = request.symbol;
            const folderUUID = crypto.randomUUID();
            const files = request.files;
            const createdAt = Date.now();
            const upload = new Upload({
                symbol,
                tokenId,
                folderUUID,
                files,
                createdAt,
            });

            __BaseDAO__.__save__(upload).then((doc) => {
                resolve(upload.folderUUID);
            });
        });
    }

    static increment(folderUUID, videoCount) {
        return new Promise((resolve, reject) => {
            __BaseDAO__.__get__(Upload, { folderUUID }).then((upload) => {
                upload.isReady = upload.files.length === videoCount;
                if (upload.isReady) {
                    __BaseDAO__.__save__(upload);
                }

                resolve(upload.isReady);
            });
        });
    }
}

export default UploadDAO;
