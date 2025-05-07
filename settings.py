import ujson as json
from logger import Logger

log = Logger(__name__)
settings = None


class Settings:
    class Controller:
        def __init__(self):
            self.Kp: float = 0.01
            self.Ki: float = 0.001
            self.Kd: float = 0.002
            self.Period: float = 1.0
            self.PoM: bool = True
            self.MinOnTime: float = 0.05
            self.MaxDuty: float = 0.75

    class Pinout:
        def __init__(self):
            self.MISO: int = -1
            self.SCK: int = -1
            self.CS: int = 10
            self.RELAY: int = 4
            self.CT: int = -1

    class Wifi:
        def __init__(self):
            self.SSID: str = ""
            self.PASSWORD: str = ""

    class CT:
        def __init__(self):
            self.CTRating: float = 30
            self.CTSampleRate: float = 1200
            self.CTSampleCount: int = 1000

    class UI:
        def __init__(self):
            self.Refresh: float = 1.0
            self.MaxContentLengthInKB = 1024

    def __new__(cls):
        global settings
        if settings is None:
            settings = super(Settings, cls).__new__(cls)
            settings.controller = cls.Controller()
            settings.pinout = cls.Pinout()
            settings.wifi = cls.Wifi()
            settings.ct = cls.CT()
            settings.ui = cls.UI()
            settings.load()
        return settings

    def load(self):
        try:
            with open("settings.json", "r") as file:
                data = json.load(file)
                self.update(data)
        except ValueError:
            log.error("Error decoding JSON from settings file")
        except FileNotFoundError:
            log.warning("Settings file not found, using default values")
            pass

    def update(self, data):
        for module, settings in data.items():
            if not isinstance(settings, dict):
                log.error(f"Invalid settings format for {module}")
                continue
            if hasattr(self, module):
                for key, value in settings.items():
                    if hasattr(getattr(self, module), key):
                        setattr(getattr(self, module), key, value)
                    else:
                        log.error(f"Invalid setting {key} in {module}")
            else:
                log.error(f"Invalid module {module}")

    def to_dict(self):
        data = {}
        for module in self.__dict__:
            if isinstance(getattr(self, module), dict):
                data[module] = getattr(self, module)
            else:
                data[module] = getattr(self, module).__dict__
        return data

    def save(self, data=None):
        if data:
            self.update(data)
        try:
            with open("settings.json", "w") as file:
                json.dump(self.to_dict(), file)
        except Exception as e:
            log.error(f"Error saving settings: {e}")
        pass
