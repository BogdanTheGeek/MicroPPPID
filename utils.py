try:
    from time import ticks_ms

    def millis():
        return ticks_ms()
except ImportError:
    from time import time

    start = int(time() * 1000)

    def millis():
        return int(time() * 1000) - start
