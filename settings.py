import ujson as json

settings = None


class Settings:
    # PID
    Kp: float = 0.01
    Ki: float = 0.001
    Kd: float = 0.002
    Period: float = 1.0
    # Pinout
    MISO: int = -1  # -1 means default
    SCK: int = -1
    CS: int = 10
    RELAY: int = 4
    # Wifi
    SSID: str = ""
    PASSWORD: str = ""

    def __new__(cls):
        global settings
        if settings is None:
            settings = super(Settings, cls).__new__(cls)
            settings.load()
        return settings

    def load(self):
        try:
            with open("settings.json", "r") as file:
                data = json.load(file)
                for key, value in data.items():
                    if hasattr(self, key):
                        setattr(self, key, value)
        except json.JSONDecodeError:
            print("Error decoding JSON from settings file")
        except FileNotFoundError:
            print("Settings file not found, using default values")
            pass

    def save(self):
        data = self.__dict__
        try:
            with open("settings.json", "w") as file:
                json.dump(data, file, indent=4)
        except Exception as e:
            print(f"Error saving settings: {e}")
        pass
