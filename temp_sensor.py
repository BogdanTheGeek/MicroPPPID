from settings import Settings
from logger import Logger

log = Logger(__name__)

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

        @property
        def temp_c_fast(self) -> float:
            return 25.0

    class Pin:
        OUT = 0
        IN = 1

        def __init__(self, pin, mode):
            pass

    class SPI:
        def __init__(*kargs, **kwargs):
            pass


class TempSensor:
    connected = True

    def __init__(self):
        settings = Settings()
        sck = None
        if settings.pinout.SCK != -1:
            sck = Pin(settings.pinout.SCK, Pin.OUT)

        miso = None
        if settings.pinout.MISO != -1:
            miso = Pin(settings.pinout.MISO, Pin.IN)

        spi = SPI(1, sck=sck, miso=miso, mosi=None)
        cs = Pin(settings.pinout.CS, Pin.OUT)
        self.sensor = MAX31855(spi, cs)
        log.info("Temperature sensor initialized")

    def read(self) -> float | None:
        # if not self.connected:
        #     return None

        try:
            temp = self.sensor.temp
            self.connected = True
            return temp
        except RuntimeError as e:
            log.error(f"Error reading temperature sensor: {e}")
            self.connected = False
        return None
