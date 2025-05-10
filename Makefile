
python ?= python3

SRC := $(wildcard *.py)
SRC := $(filter-out main.py, $(SRC)) # MicroPython cannot execute main.mpy
OBJ := $(patsubst %.py,build/%.mpy,$(SRC))

LIB_SRC := $(shell find lib -type f -name '*.py')
LIB_DIRS := $(shell find lib -type d | sed 's|lib/|build/lib/|g')
LIB_OBJ := $(shell find lib -type f -name '*.py' | sed 's|lib/|build/lib/|' | sed 's|\.py$$|\.mpy|')

STATIC := $(wildcard static/*)
STATIC_OBJ := $(patsubst static/%,build/static/%,$(STATIC))
STATIC_OBJ := $(patsubst build/static/%,build/static/%.gz,$(STATIC_OBJ))
PROGS := $(wildcard prog/*.json)
PROGS := $(patsubst prog/%.json,build/prog/%.json,$(PROGS))
BOARD := $(wildcard board/*)
BOARD_OBJ := $(patsubst board/%,build/%,$(BOARD))

ESPPORT ?= /dev/tty.usb*

# Makefile for building and running the project
.PHONY: run
run:
	@echo "Running the project..."
	@source venv/bin/activate && \
	$(python) app.py

.PHONY: init
init: venv
	@echo "Installing dependencies..."
	@source venv/bin/activate && \
	$(python) -m pip install -r requirements.txt

venv:
	@echo "Creating virtual environment..."
	@$(python) -m venv venv
	@echo "Virtual environment created."
	@echo "Run 'source venv/bin/activate' -> activate the virtual environment."

build/:
	@mkdir -p build/{prog,static,lib}
	@mkdir -p $(LIB_DIRS)

build/prog/%.json: prog/%.json build/
	@echo "Copying $< -> $@"
	@cp $< $@

build/static/%.js.gz: static/%.js build/
	@echo "Minifying $<"
	@source venv/bin/activate && \
	$(python) -m jsmin $< > $@.temp
	@echo "Compressing $< -> $@"
	@gzip -c $@.temp > $@ && \
	rm $@.temp

build/static/%.gz: static/% build/
	@echo "Compressing $< -> $@"
	@gzip -c $< > $@

build/main.py: main.py build/
	@echo "Copying $< -> $@"
	@cp $< $@

$(BOARD_OBJ): $(BOARD) build/
	@echo "Copying $< -> $@"
	@cp board/* build/

build/%.mpy: %.py build/
	@echo "Building $@"
	@source venv/bin/activate && \
	mpy-cross $< -o $@

$(LIB_OBJ): $(LIB_SRC) build/
	@echo "Building $@"
	@source venv/bin/activate && \
	mpy-cross $$(echo $@ | sed 's|build/lib/|lib/|' | sed 's|\.mpy$$|\.py|') -o $@

.PHONY: bundle
bundle: $(OBJ) $(LIB_OBJ) $(STATIC_OBJ) $(PROGS) $(BOARD_OBJ) build/main.py
	@echo "Project bundled successfully."
	@echo "Total size: $(shell du -sh build | cut -f1)"

.PHONY: flash
flash:
	@echo "Flashing the project..."
	@source venv/bin/activate && \
	rshell -p $(ESPPORT) cp -r build/* /pyboard/

.PHONY: sync
sync:
	@echo "Syncing the project..."
	@source venv/bin/activate && \
	rshell -p $(ESPPORT) rsync build/ /pyboard/

.PHONY: clean
clean:
	@echo "Cleaning up..."
	@rm -rf build


