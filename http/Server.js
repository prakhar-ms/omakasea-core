import express from "express";
import logger from "morgan";

class Responses {
    constructor(name, port) {
        this.app = express();
        this.app.use(express.json());
        this.app.use(logger("dev"));
        this.name = name;
        this.port = port;
    }

    get(path, action) {
        this.app.get(path, action);
    }

    post(path, action) {
        this.app.post(path, action);
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`${this.name} :: ${this.port}`);
        });
    }

    setViews(engine, dir) {
        this.app.set("view engine", engine);
        this.app.set("views", dir);
    }

    setPublic(dir) {
        this.app.use(express.static(dir));
    }
}

export default Responses;
