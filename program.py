import ujson as json


class Instruction:
    def __init__(self, temp, time):
        self.temp = temp  # degrees
        self.time = time  # seconds


class Program:
    def __init__(self, name=None):
        self.name = name
        self.instructions = None
        if name is not None:
            self.load(f"prog/{name}")

    def load(self, name):
        with open(name, "r") as file:
            data = json.load(file)
            self.name = data["name"]
            self.instructions = [Instruction(**inst) for inst in data["instructions"]]
        print(f"Loaded program {name} with {len(self.instructions)} instructions")

    def save(self, name):
        with open(name, "w") as file:
            json.dump(self, file, default=serialize, indent=0)
        print(f"Saved program {name} with {len(self.instructions)} instructions")

    def get_setpoint(self, runtime=0):
        if self.instructions is None:
            return None
        for i in range(len(self.instructions)):
            inst = self.instructions[i]
            if runtime > inst.time:
                continue
            if i == 0:
                last = Instruction(0, 0)
            else:
                last = self.instructions[i - 1]

            if last.temp == inst.temp:
                # hold
                return inst.temp
            # Linear interpolation
            delta_time = inst.time - last.time
            delta_temp = inst.temp - last.temp
            ratio = (runtime - last.time) / delta_time
            return last.temp + ratio * delta_temp

        return None


def serialize(obj):
    if isinstance(obj, Program):
        return {
            "name": obj.name,
            "instructions": [serialize(inst) for inst in obj.instructions],
        }
    return obj.__dict__
