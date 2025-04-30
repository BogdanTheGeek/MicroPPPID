from settings import Settings
from temp_sensor import TempSensor
from relay import PWMRelay
from program import Program
import time

try:
    from PID import PID
except ImportError:
    from simple_pid import PID


class Controller:
    duty = 0.0
    temp = 0.0
    setpoint = 0.0
    running = False
    cycle_start = 0.0
    program = None
    paused = False

    def __init__(self):
        settings = Settings()

        self.pid = PID(
            settings.Kp,
            settings.Ki,
            settings.Kd,
            setpoint=25.0,
        )
        self.pid.output_limits = (0, 1.0)

        self.temp_sensor = TempSensor()
        self.relay = PWMRelay()
        self.set_program("default.json")

    def get_setpoint(self):
        if self.program is None:
            raise ValueError("No program loaded")
        setpoint = self.program.get_setpoint(self.runtime())

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

    def set_program(self, name):
        try:
            self.program = Program(name)
        except Exception as e:
            print(f"Error loading {name} program: {e}")
            self.program = None

    def start(self):
        if self.running or self.paused:
            return
        self.relay.start()
        self.pid.set_auto_mode(True, last_output=0)
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

        if not self.running:
            return

        self.setpoint = self.get_setpoint()
        self.pid.setpoint = self.setpoint
        self.duty = self.pid(self.temp)

        self.relay.set_duty(self.duty)

    def info(self):
        return {
            "temp": self.temp,
            "duty": self.duty,
            "target": self.setpoint,
            "running": self.running,
            "runtime": self.runtime(),
            "paused": self.paused,
        }
