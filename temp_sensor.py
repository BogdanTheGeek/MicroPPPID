from settings import Settings

try:
    from max31855 import MAX31855
    from machine import SPI, Pin
except ImportError:
    # For testing on a non-MicroPython environment
    class MAX31855:
        def __init__(self, spi, cs):
            pass

        def read_temperature(self):
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
    def __init__(self):
        settings = Settings()
        sck = None
        if settings.SCK != -1:
            sck = Pin(settings.SCK, Pin.OUT)

        miso = None
        if settings.MISO != -1:
            miso = Pin(settings.MISO, Pin.IN)

        spi = SPI(sck=sck, miso=miso)
        cs = Pin(settings.CS, Pin.OUT)
        self.sensor = MAX31855(spi, cs)

    def read(self):
        return self.sensor.read_temperature()
