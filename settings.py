import ujson as json

settings = None


class Settings:
    # PID
    Kp = 0.01
    Ki = 0.001
    Kd = 0.002
    Period = 1.0
    # Pinout
    MISO = -1  # -1 means default
    SCK = -1
    CS = 10
    RELAY = 4
    # Wifi
    SSID = None
    PASSWORD = None

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
                self.Kp = data.get("Kp", self.Kp)
                self.Ki = data.get("Ki", self.Ki)
                self.Kd = data.get("Kd", self.Kd)
                self.Period = data.get("Period", self.Period)
                self.MISO = data.get("MISO", self.MISO)
                self.SCK = data.get("SCK", self.SCK)
                self.CS = data.get("CS", self.CS)
                self.RELAY = data.get("RELAY", self.RELAY)
                self.SSID = data.get("SSID", self.SSID)
                self.PASSWORD = data.get("PASSWORD", self.PASSWORD)
        except json.JSONDecodeError:
            print("Error decoding JSON from settings file")
        except FileNotFoundError:
            print("Settings file not found, using default values")
            pass

    def save(self):
        data = {
            "Kp": self.Kp,
            "Ki": self.Ki,
            "Kd": self.Kd,
            "Period": self.Period,
            "MISO": self.MISO,
            "SCK": self.SCK,
            "CS": self.CS,
            "RELAY": self.RELAY,
            "SSID": self.SSID,
            "PASSWORD": self.PASSWORD,
        }
        try:
            with open("settings.json", "w") as file:
                json.dump(data, file, indent=4)
        except Exception as e:
            print(f"Error saving settings: {e}")
        pass
