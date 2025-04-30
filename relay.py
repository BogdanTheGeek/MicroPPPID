from settings import Settings
import asyncio

try:
    from machine import Pin
except ImportError:
    # For testing on a non-MicroPython environment
    class Pin:
        OUT = 0
        IN = 1
        val = 0

        def __init__(self, pin, mode):
            self.pin = pin
            pass

        def value(self, val=None):
            if val is None:
                return self.val
            else:
                self.val = val
                print(f"Pin {self.pin} set to {val}")


class Relay:
    def __init__(self):
        settings = Settings()
        self.relay = Pin(settings.RELAY, Pin.OUT)
        self.relay.value(0)  # Turn off the relay initially

    def on(self, new_state=None):
        return self.relay.value(new_state)


class PWMRelay:
    MIN_ON_TIME = 0.5  # Minimum on time in seconds
    MAX_DUTY = 1.0  # Maximum duty cycle

    def __init__(self):
        settings = Settings()
        self.relay = Pin(settings.RELAY, Pin.OUT)
        self.relay.value(0)  # Turn off the relay initially
        self.duty = 0
        self.period = settings.Period

    def set_duty(self, duty):
        if duty < 0:
            duty = 0
        elif duty > self.MAX_DUTY:
            duty = self.MAX_DUTY

        self.duty = duty

    def start(self):
        self.task = asyncio.create_task(self.run())

    def stop(self):
        self.task.cancel()
        self.relay.value(0)

    async def run(self):
        while True:
            if self.duty == 0 or self.duty == 1.0:
                self.relay.value(self.duty)
                await asyncio.sleep(self.period)
                continue

            under_min = self.duty * self.period < self.MIN_ON_TIME
            if under_min:
                self.relay.value(0)
                await asyncio.sleep(self.period)
                continue

            self.relay.value(1)
            await asyncio.sleep(self.duty * self.period)
            self.relay.value(0)
            await asyncio.sleep((1 - self.duty) * self.period)
