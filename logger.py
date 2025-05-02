from utils import millis


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


class Logger:
    level = Level.INFO
    cb = None

    def __init__(self, tag, level: int = Level.INFO, cb=None):
        self.tag = tag
        self.level = level
        self.cb = cb

    def set_level(self, new_level: int = Level.INFO):
        self.level = new_level

    def log(self, level: int, message: str):
        if level > self.level:
            return
        s = colour_map[level](f"{level_map[level]} ({millis()}) {self.tag}: {message}")
        print(s)
        if self.cb:
            self.cb(s)

    def set_callback(self, cb):
        self.cb = cb

    def error(self, message: str):
        self.log(Level.ERROR, message)

    def info(self, message: str):
        self.log(Level.INFO, message)

    def debug(self, message: str):
        self.log(Level.DEBUG, message)

    def warning(self, message, str):
        self.log(Level.WARNING, message)
