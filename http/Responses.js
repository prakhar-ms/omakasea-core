import express from "express";

class Responses {
    constructor(name, port) {
        this.app = express();
        this.app.use(express.json());
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
}

export default Responses;
