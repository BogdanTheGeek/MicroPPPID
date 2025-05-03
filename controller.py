from settings import Settings
from temp_sensor import TempSensor
from relay import PWMRelay
from program import Program
from simple_pid import PID
from logger import Logger
from current_clamp import CT
import time

log = Logger(__name__)

try:
    from machine import WDT
except ImportError:

    class WDT:
        def __init__(self, timeout):
            pass

        def feed(self):
            pass


class Controller:
    duty = 0.0
    temp = 0.0
    setpoint = 0.0
    running = False
    cycle_start = 0.0
    program = None
    paused = False

    def __init__(self):
        self.settings = Settings()

        self.wdt = WDT(timeout=int(1 + self.settings.controller.Period) * 1000 * 3)

        self.pid = PID(
            self.settings.controller.Kp,
            self.settings.controller.Ki,
            self.settings.controller.Kd,
            setpoint=25.0,
            sample_time=self.settings.controller.Period,
            proportional_on_measurement=self.settings.controller.PoM,
        )
        self.pid.output_limits = (0, 1.0)

        self.temp_sensor = TempSensor()
        self.relay = PWMRelay()
        self.set_program("default.json")
        self.ct = CT(
            self.settings.pinout.CT,
            rating=self.settings.ct.CTRating,
            sample_rate=self.settings.ct.CTSampleRate,
            sample_count=self.settings.ct.CTSampleCount,
        )
        self.ct.calibrate()
        self.ct.start()

    def reset(self):
        self.stop()
        self.pid = PID(
            self.settings.controller.Kp,
            self.settings.controller.Ki,
            self.settings.controller.Kd,
            setpoint=25.0,
            sample_time=self.settings.controller.Period,
            proportional_on_measurement=self.settings.controller.PoM,
        )
        self.pid.output_limits = (0, 1.0)

    def get_setpoint(self):
        if self.program:
            setpoint = self.program.get_setpoint(self.runtime())
        else:
            setpoint = self.setpoint

        if setpoint is None:
            self.stop()
        else:
            return setpoint

    def runtime(self):
        if not self.running:
            return 0.0
        if self.paused:
            return self.paused_time - self.cycle_start
        return time.time() - self.cycle_start

    def set_program(self, name: str = None):
        if name is None:
            self.program = None
            return
        try:
            self.program = Program(name)
        except Exception as e:
            log.error(f"Error loading {name} program: {e}")
            self.program = None

    def start(self):
        if self.running or self.paused:
            return
        self.relay.start()
        self.pid.set_auto_mode(True, last_output=self.duty)
        self.cycle_start = time.time()
        self.running = True

    def pause(self):
        if self.paused or not self.running:
            return
        self.paused = True
        self.paused_time = time.time()

    def resume(self):
        if not self.paused or not self.running:
            return
        self.cycle_start += time.time() - self.paused_time
        self.paused_time = 0
        self.paused = False

    def stop(self):
        if not self.running:
            return
        self.running = False
        self.setpoint = 0.0
        self.duty = 0.0
        self.paused = False
        self.paused_time = 0
        self.relay.stop()
        self.pid.set_auto_mode(False)

    def loop(self):
        self.temp = self.temp_sensor.read()
        self.wdt.feed()

        if not self.running:
            return

        if self.temp is None:
            log.error("Temperature sensor not connected")
            self.stop()
            return

        self.setpoint = self.get_setpoint()
        self.pid.setpoint = self.setpoint
        self.duty = self.pid(self.temp)

        self.relay.set_duty(self.duty)

    def info(self):
        p, i, d = self.pid.components
        return {
            "temp": self.temp,
            "duty": self.duty,
            "target": self.setpoint,
            "running": self.running,
            "runtime": self.runtime(),
            "paused": self.paused,
            "current": self.ct.current,
            "p": p,
            "i": i,
            "d": d,
        }
