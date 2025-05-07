## Why
I have many hobbies, the best of which (by far) is pottery. I needed a programmable kiln controller because the one I had was $#!t and most of the open-source ones are even worse. Therefore, in the words of the world's most popular fascist:
> Fine, I'll do it myself!
> -- Thanos

## Design
 - Safe, I don't want meltdowns.
 - Portable, should run on CPython as well as MicroPython(CircuitPython is WIP)
 - Efficient, don't waste space or resources
 - Long Lasting, you should be able to still use this long after I get bored with this project

## Getting Started
Everything can be done though the Makefile provided.
Fist, create the virtual environment and download requirements:
```sh
make init
```

All Makefile commands run in the venv, so you don't need it active, but if you do want to activate it, run:
```sh
. venv/bin/activate
```

To run locally:
```sh
make run
```

To build a bundle for your microcontroller
```sh
make bundle
```

To flash the microcontroller (via rshell):
> [!WARN]
> You only need to do this once
```sh
export ESPPORT=/dev/tty*
make flash
```

To sync changes (via rshell):
```sh
make sync
```

## References
 - [microdot](https://microdot.readthedocs.io/en/latest/#)
 - [simple-pid](https://micropython-simple-pid.readthedocs.io/en/latest/index.html)
 - [max31855 library](https://github.com/nostoslabs/max31855_micro_python/)
