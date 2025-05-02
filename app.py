import asyncio
from server import Server
from settings import Settings
from controller import Controller
import ujson as json
from logger import Logger
from utils import millis
import sys

log = Logger(__name__)


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
            log.error(f"Warning: Control loop took too long! {loop_time} seconds")
            pass

    # cleanup before ending the application
    await server_task


def run():
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Server stopped by user.")
    except Exception as e:
        log.error(f"Error: {e}")
        sys.print_exception(e)
    finally:
        log.info("Exiting...")


if __name__ == "__main__":
    run()
