import asyncio
from server import Server
from settings import Settings
from controller import Controller
import ujson as json


try:
    from time import ticks_ms

    def millis():
        return ticks_ms()
except ImportError:
    from time import time

    def millis():
        return int(time() * 1000)


async def main():
    settings = Settings()
    controller = Controller()
    server = Server(controller)
    server_task = asyncio.create_task(server.start_server())

    while True:
        start = millis()

        controller.loop()

        await server.push(json.dumps(controller.info()))

        loop_time = (millis() - start) / 1000.0
        if loop_time < settings.Period:
            await asyncio.sleep(settings.Period - loop_time)
        else:
            # TODO: log error
            print(f"Warning: Control loop took too long! {loop_time} seconds")
            pass

    # cleanup before ending the application
    await server_task


def run():
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped by user.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        print("Exiting...")


if __name__ == "__main__":
    run()
