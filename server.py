from microdot import Microdot, send_file
from microdot.websocket import with_websocket
import ujson as json
from settings import Settings
from logger import Logger
import os

log = Logger(__name__)
app = Microdot()
websocket = None
server = None
PORT = 80


class Server:
    port = PORT
    controller = None
    compression = False

    def __init__(self, controller=None, port=PORT):
        self.port = port
        self.controller = controller
        global server
        server = self

        self.command_lookup = {
            "start": self.controller.start,
            "stop": self.controller.stop,
            "pause": self.controller.pause,
            "resume": self.controller.resume,
            "reset": self.controller.reset,
        }

        try:
            open("static/index.html.gz", "r").close()
            self.compression = True
            log.info("Using gzipped index.html")
        except FileNotFoundError:
            self.compression = False
            log.info("Using uncompressed index.html")

    async def start_server(self):
        log.info(f"Server running: http://localhost:{self.port}")
        await app.start_server(port=self.port)

    async def push(self, data) -> bool:
        if websocket:
            try:
                await websocket.send(data)
                return True
            except Exception as e:
                log.error(f"Error sending data: {e}")
                return False
        return False

    def command_handler(self, command):
        if command in self.command_lookup:
            self.command_lookup[command]()
        else:
            log.error(f"Unknown command: {command}")
            return False


@app.route("/ws")
@with_websocket
async def echo(request, ws):
    log.info("WebSocket connection established")
    global websocket
    websocket = ws
    while True:
        data = await ws.receive()
        try:
            data = json.loads(data)
            if "command" in data:
                command = data["command"]
                log.info(f"Command received: {command}")
                server.command_handler(command)
                await server.push(json.dumps(server.controller.info()))

        except ValueError:
            log.error(f"Invalid JSON received: {data}")
            continue

    log.info("WebSocket connection closed")
    websocket = None


@app.route("/")
async def index(request):
    if server.compression:
        return send_file("static/index.html", compressed=True, file_extension=".gz")
    else:
        return send_file("static/index.html")


@app.route("/progs")
async def progs(request):
    progs = os.listdir("./prog")
    progs = [f for f in progs if f.endswith(".json")]
    return json.dumps(progs)


@app.route("/load/<name>")
async def load(request, name):
    server.controller.set_program(name)


@app.get("/settings")
async def get_settings(request):
    settings = Settings()
    data = settings.to_dict()
    log.debug(f"Settings sent: {data}")
    return json.dumps(data)


@app.post("/settings")
async def set_settings(request):
    log.debug(f"New settings received: {request.json}")
    data = request.json
    settings = Settings()
    settings.save(data)
    return "Settings saved", 200


@app.post("/setpoint")
async def set_setpoint(request):
    server.controller.set_program()
    data = request.json
    if "setpoint" in data:
        server.controller.setpoint = data["setpoint"]
        server.controller.start()
        log.info(f"Setpoint set to: {server.controller.setpoint}")
    else:
        log.error("No setpoint provided")
        return "No setpoint provided", 400
    return "Setpoint set", 200


@app.post("/upload")
async def upload(request):
    # obtain the filename and size from request headers
    filename = request.headers["Content-Disposition"].split("filename=")[1].strip('"')
    size = int(request.headers["Content-Length"])

    # sanitize the filename
    filename = filename.replace("/", "_")

    # write the file to the files directory in 1K chunks
    with open("prog/" + filename, "wb") as f:
        while size > 0:
            chunk = await request.stream.read(min(size, 1024))
            f.write(chunk)
            size -= len(chunk)

    log.info("Successfully saved file: " + filename)
    return "File uploaded successfully", 200


@app.get("/delete/<name>")
async def delete(request, name):
    try:
        os.remove("prog/" + name)
        log.info(f"Deleted file: {name}")
        return "File deleted successfully"
    except FileNotFoundError:
        log.error(f"File not found: {name}")
        return "File not found", 404
    except Exception as e:
        log.error(f"Error deleting file: {e}")
        return "Error deleting file", 500


@app.route("/<path:path>")
async def static(request, path):
    log.debug(f"Requested path: {path}")
    if ".." in path:
        # directory traversal is not allowed
        return "Not found", 404
    if path.endswith("/"):
        # if the path ends with a slash, serve index.html
        path += "index.html"
    try:
        return send_file("static/" + path)
    except FileNotFoundError:
        # if the file is not found, return a 404 error
        return "File Not found", 404


if __name__ == "__main__":
    try:
        server = Server()
        # Start the server
        server.start_server()
    except KeyboardInterrupt:
        log.warning("Server stopped by user.")
