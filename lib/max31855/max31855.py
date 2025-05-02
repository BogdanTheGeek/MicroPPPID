import math
import struct
from machine import SPI, Pin


class MAX31855:
    """
    Driver for the MAX31855 thermocouple amplifier.
    This is an adaptation from Adafruit's CircuitPython library. Many thanks to them!
    The main difference between this and the Adafruit library is that this one uses
    the machine.SPI class instead of the busio.SPI class.
    """

    def __init__(self, spi: SPI, cs: Pin) -> None:
        self.spi = spi
        self.cs = cs
        self.data = bytearray(4)

    def _read(self, internal: bool = False) -> int:
        self.cs.value(0)
        try:
            self.spi.readinto(self.data)
        finally:
            self.cs.value(1)
        if self.data[3] & 0x01:
            raise RuntimeError("thermocouple not connected")
        if self.data[3] & 0x02:
            raise RuntimeError("short circuit to ground")
        if self.data[3] & 0x04:
            raise RuntimeError("short circuit to power")
        if self.data[1] & 0x01:
            raise RuntimeError("faulty reading")
        temp, refer = struct.unpack(">hh", self.data)
        refer >>= 4
        temp >>= 2
        if internal:
            return refer
        return temp

    @property
    def raw(self) -> bytearray:
        return self.data

    @property
    def temp(self) -> float:
        return self.temp_NIST

    @property
    def temp_f(self) -> float:
        return self.temp_NIST * (9 / 5) + 32

    @property
    def temp_c_fast(self) -> float:
        """Thermocouple temperature in degrees Celsius."""
        return self._read() * 0.25

    @property
    def temp_f_fast(self) -> float:
        """Thermocouple temperature in degrees Celsius/F."""
        return self._read() * 0.25 * (9 / 5) + 32

    @property
    def ref_temp(self) -> float:
        """Internal reference temperature in degrees Celsius."""
        return self._read(True) * 0.0625

    @property
    def temp_NIST(self) -> float:
        """
        Thermocouple temperature in degrees Celsius, computed using
        raw voltages and NIST approximation for Type K, see:
        https://srdata.nist.gov/its90/download/type_k.tab
        """
        # pylint: disable=invalid-name
        # temperature of remote thermocouple junction
        TR = self.temp_c_fast
        # temperature of device (cold junction)
        TAMB = self.ref_temp
        # thermocouple voltage based on MAX31855's uV/degC for type K (table 1)
        VOUT = 0.041276 * (TR - TAMB)
        # cold junction equivalent thermocouple voltage
        if TAMB >= 0:
            VREF = (
                -0.176004136860e-01
                + 0.389212049750e-01 * TAMB
                + 0.185587700320e-04 * math.pow(TAMB, 2)
                + -0.994575928740e-07 * math.pow(TAMB, 3)
                + 0.318409457190e-09 * math.pow(TAMB, 4)
                + -0.560728448890e-12 * math.pow(TAMB, 5)
                + 0.560750590590e-15 * math.pow(TAMB, 6)
                + -0.320207200030e-18 * math.pow(TAMB, 7)
                + 0.971511471520e-22 * math.pow(TAMB, 8)
                + -0.121047212750e-25 * math.pow(TAMB, 9)
                + 0.1185976
                * math.exp(-0.1183432e-03 * math.pow(TAMB - 0.1269686e03, 2))
            )
        else:
            VREF = (
                0.394501280250e-01 * TAMB
                + 0.236223735980e-04 * math.pow(TAMB, 2)
                + -0.328589067840e-06 * math.pow(TAMB, 3)
                + -0.499048287770e-08 * math.pow(TAMB, 4)
                + -0.675090591730e-10 * math.pow(TAMB, 5)
                + -0.574103274280e-12 * math.pow(TAMB, 6)
                + -0.310888728940e-14 * math.pow(TAMB, 7)
                + -0.104516093650e-16 * math.pow(TAMB, 8)
                + -0.198892668780e-19 * math.pow(TAMB, 9)
                + -0.163226974860e-22 * math.pow(TAMB, 10)
            )
        # total thermoelectric voltage
        VTOTAL = VOUT + VREF
        # determine coefficients
        # https://srdata.nist.gov/its90/type_k/kcoefficients_inverse.html
        if -5.891 <= VTOTAL <= 0:
            DCOEF = (
                0.0000000e00,
                2.5173462e01,
                -1.1662878e00,
                -1.0833638e00,
                -8.9773540e-01,
                -3.7342377e-01,
                -8.6632643e-02,
                -1.0450598e-02,
                -5.1920577e-04,
            )
        elif 0 < VTOTAL <= 20.644:
            DCOEF = (
                0.000000e00,
                2.508355e01,
                7.860106e-02,
                -2.503131e-01,
                8.315270e-02,
                -1.228034e-02,
                9.804036e-04,
                -4.413030e-05,
                1.057734e-06,
                -1.052755e-08,
            )
        elif 20.644 < VTOTAL <= 54.886:
            DCOEF = (
                -1.318058e02,
                4.830222e01,
                -1.646031e00,
                5.464731e-02,
                -9.650715e-04,
                8.802193e-06,
                -3.110810e-08,
            )
        else:
            raise RuntimeError(f"Total thermoelectric voltage out of range:{VTOTAL}")
        # compute temperature
        TEMPERATURE = 0
        for n, c in enumerate(DCOEF):
            TEMPERATURE += c * math.pow(VTOTAL, n)
        return TEMPERATURE
