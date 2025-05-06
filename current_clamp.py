import asyncio
from time import sleep

try:
    from machine import ADC, Pin
except ImportError:

    class ADC:
        def __init__(self, pin):
            self.pin = pin

        def read_u16(self):
            return 0

        def read_uv(self):
            return 0

    class Pin:
        def __init__(self, pin):
            pass


class CT:
    def __init__(
        self,
        pin: int,
        rating: float = 30,
        sample_rate: float = 1200,
        sample_count: int = 1000,
    ):
        self.rating: float = rating
        self.adc = ADC(Pin(pin))
        self.sample_rate: float = sample_rate
        self.sample_count: int = sample_count
        self.task = None
        self.offset: float = 0.0  # in mV
        self.current: float = 0.0  # in A

    def start(self):
        self.task = asyncio.create_task(self.loop())

    def stop(self):
        if self.task:
            self.task.cancel()

    async def loop(self):
        sum_squares: float = 0.0
        rms: float = 0.0
        sample: float = 0.0
        sample_index: int = 0
        period: float = 1 / self.sample_rate
        while True:
            await asyncio.sleep(period)
            if sample_index == self.sample_count:
                rms = (sum_squares / self.sample_count) ** 0.5
                self.current = rms * self.rating
                sum_squares = 0
                sample_index = 0

            sample = self.adc.read_uv() / 1_000_000 - self.offset
            sum_squares += sample * sample
            sample_index += 1

    def calibrate(self):
        sum: float = 0.0
        for i in range(100):
            sum += self.adc.read_uv() / 1_000_000
            sleep(1 / 100)
        self.offset = sum / 100
