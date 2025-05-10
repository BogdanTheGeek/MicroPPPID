import asyncio
from utils import millis
from collections import deque


class Level:
    NONE = 0
    ERROR = 1
    WARNING = 2
    INFO = 3
    DEBUG = 4


level_map = {
    Level.ERROR: "ERROR",
    Level.WARNING: "WARNING",
    Level.INFO: "INFO",
    Level.DEBUG: "DEBUG",
}


def RED(string):
    return "\033[31m" + string + "\033[0m"


def GREEN(string):
    return "\033[32m" + string + "\033[0m"


def YELLOW(string):
    return "\033[33m" + string + "\033[0m"


def WHITE(string):
    return string


colour_map = {
    Level.ERROR: RED,
    Level.WARNING: YELLOW,
    Level.INFO: GREEN,
    Level.DEBUG: WHITE,
}

global_task = None
global_deque = deque([], 30)


async def publish_task(ws):
    global global_deque
    while True:
        if len(global_deque) > 0:
            message = global_deque.popleft()
            try:
                await ws.send(message)
            except:  # noqa: E722
                pass
        await asyncio.sleep(0.5)


def publish_log(s: str):
    if global_task is None:
        return

    global global_deque
    global_deque.append(s)


class Logger:
    level = Level.INFO
    cb = None

    def __init__(self, tag, level: int = Level.INFO):
        self.tag = tag
        self.level = level

    def set_level(self, new_level: int = Level.INFO):
        self.level = new_level

    def log(self, level: int, message: str):
        if level > self.level:
            return
        s = f"{level_map[level]} ({millis()}) {self.tag}: {message}"
        print(colour_map[level](s))
        publish_log(s)

    def set_websocket(self, websocket):
        global global_task
        if global_task is not None:
            global_task.cancel()

        if websocket is None:
            global_task = None
        else:
            global_task = asyncio.create_task(publish_task(websocket))

    def error(self, message: str):
        self.log(Level.ERROR, message)

    def info(self, message: str):
        self.log(Level.INFO, message)

    def debug(self, message: str):
        self.log(Level.DEBUG, message)

    def warning(self, message: str):
        self.log(Level.WARNING, message)
