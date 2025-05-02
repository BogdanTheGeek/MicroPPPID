import ujson as json

settings = None


class Settings:
    def __new__(cls):
        global settings
        if settings is None:
            settings = super(Settings, cls).__new__(cls)
            # PID
            settings.Kp: float = 0.01
            settings.Ki: float = 0.001
            settings.Kd: float = 0.002
            settings.Period: float = 1.0
            # Pinout
            settings.MISO: int = -1  # -1 means default
            settings.SCK: int = -1
            settings.CS: int = 10
            settings.RELAY: int = 4
            # Wifi
            settings.SSID: str = ""
            settings.PASSWORD: str = ""
            settings.load()
        return settings

    def load(self):
        try:
            with open("settings.json", "r") as file:
                data = json.load(file)
                self.update(data)
        except json.JSONDecodeError:
            print("Error decoding JSON from settings file")
        except FileNotFoundError:
            print("Settings file not found, using default values")
            pass

    def update(self, data):
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)

    def save(self, data=None):
        if data:
            self.update(data)
        try:
            with open("settings.json", "w") as file:
                json.dump(self.__dict__, file, indent=4)
        except Exception as e:
            print(f"Error saving settings: {e}")
        pass
