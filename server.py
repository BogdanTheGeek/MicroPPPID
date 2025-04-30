from microdot import Microdot, send_file
from microdot.websocket import with_websocket
import ujson as json
import os

app = Microdot()
PORT = 80

websocket = None

server = None


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
        }

        if os.path.exists("static/index.html.gz"):
            self.compression = True
            print("Using gzipped index.html")

    async def start_server(self):
        print(f"Server running: http://localhost:{self.port}")
        await app.start_server(port=self.port)

    async def push(self, data) -> bool:
        if websocket:
            try:
                await websocket.send(data)
                return True
            except Exception as e:
                print(f"Error sending data: {e}")
                return False
        return False

    def command_handler(self, command):
        if command in self.command_lookup:
            self.command_lookup[command]()
        else:
            print(f"Unknown command: {command}")
            return False


@app.route("/ws")
@with_websocket
async def echo(request, ws):
    print("WebSocket connection established")
    global websocket
    websocket = ws
    while True:
        data = await ws.receive()
        try:
            data = json.loads(data)
            if "command" in data:
                command = data["command"]
                print(f"Command received: {command}")
                server.command_handler(command)
                await server.push(json.dumps(server.controller.info()))

        except ValueError:
            print(f"Invalid JSON received: {data}")
            continue

    print("WebSocket connection closed")
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

    print("Successfully saved file: " + filename)
    return "File uploaded successfully", 200


@app.get("/delete/<name>")
async def delete(request, name):
    try:
        os.remove("prog/" + name)
        print(f"Deleted file: {name}")
        return "File deleted successfully"
    except FileNotFoundError:
        print(f"File not found: {name}")
        return "File not found", 404
    except Exception as e:
        print(f"Error deleting file: {e}")
        return "Error deleting file", 500


@app.route("/<path:path>")
async def static(request, path):
    print(f"Requested path: {path}")
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
        print("Server stopped by user.")
