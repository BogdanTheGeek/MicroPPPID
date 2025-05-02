from settings import Settings

try:
    from max31855 import MAX31855
    from machine import SPI, Pin
except ImportError:
    # For testing on a non-MicroPython environment
    class MAX31855:
        def __init__(self, spi, cs):
            pass

        @property
        def temp(self) -> float:
            return 25.0

    class Pin:
        OUT = 0
        IN = 1

        def __init__(self, pin, mode):
            pass

    class SPI:
        def __init__(self, sck=None, miso=None):
            pass


class TempSensor:
    connected = False

    def __init__(self):
        settings = Settings()
        sck = None
        if settings.SCK != -1:
            sck = Pin(settings.SCK, Pin.OUT)

        miso = None
        if settings.MISO != -1:
            miso = Pin(settings.MISO, Pin.IN)

        spi = SPI(1, sck=sck, miso=miso, mosi=None)
        cs = Pin(settings.CS, Pin.OUT)
        try:
            self.sensor = MAX31855(spi, cs)
            print("Temperature sensor initialized")
            self.connected = True
        except RuntimeError as e:
            print(f"Error initializing temperature sensor: {e}")
            self.connected = False

    def read(self) -> float:
        if not self.connected:
            return 0.0
        return self.sensor.temp
