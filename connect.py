from network import WLAN
from settings import Settings
from time import sleep
from machine import Pin
from neopixel import NeoPixel


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
        print("Connecting to:", ssid)
        leds[0] = (255, 255, 0)
        leds.write()
        wlan.connect(ssid, password)
        while not wlan.isconnected():
            print("Waiting for connection...")
            sleep(1)

    leds[0] = (0, 255, 0)
    leds.write()
    print("Connected to WiFi")
    print("IP:", wlan.ipconfig("addr4"))
