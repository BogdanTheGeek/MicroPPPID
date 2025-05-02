from network import WLAN
from settings import Settings
from time import sleep
from machine import Pin
from neopixel import NeoPixel
from ntptime import settime

from logger import Logger

log = Logger(__name__)


def connect():
    leds = NeoPixel(Pin(48), 1)
    leds[0] = (255, 0, 0)
    leds.write()

    wlan = WLAN()
    wlan.active(True)

    settings = Settings()

    ssid = settings.SSID
    password = settings.PASSWORD
    wlan.config(hostname="MicroPPPID")

    if ssid and password and not wlan.isconnected():
        log.info(f"Connecting to: {ssid}...")
        leds[0] = (255, 255, 0)
        leds.write()
        while True:
            try:
                wlan.connect(ssid, password)
                break
            except OSError as e:
                log.error(f"Error connecting to WiFi: {e}")
                sleep(5)
                continue

        while not wlan.isconnected():
            log.info("Waiting for connection...")
            sleep(1)

    leds[0] = (0, 255, 0)
    leds.write()
    log.info("Connected to WiFi")
    log.info(f"IP: {wlan.ipconfig('addr4')[0]}")
    settime()
