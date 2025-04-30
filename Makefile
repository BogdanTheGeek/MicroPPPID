
python ?= python3

SRC := $(wildcard *.py)
OBJ := $(patsubst %.py,build/%.mpy,$(SRC))
STATIC := $(wildcard static/*)
STATIC_OBJ := $(patsubst static/%,build/static/%,$(STATIC))
STATIC_OBJ := $(patsubst build/static/%.html,build/static/%.html.gz,$(STATIC_OBJ))
PROGS := $(wildcard prog/*.json)
PROGS := $(patsubst prog/%.json,build/prog/%.json,$(PROGS))

# Makefile for building and running the project
.PHONY: run
run:
	@echo "Running the project..."
	@source venv/bin/activate && \
	$(python) main.py

.PHONY: init
init: venv
	@echo "Installing dependencies..."
	@source venv/bin/activate && \
	$(python) -m pip install -r requirements.txt

venv:
	@echo "Creating virtual environment..."
	@$(python) -m venv venv
	@echo "Virtual environment created."
	@echo "Run 'source venv/bin/activate' to activate the virtual environment."

build/:
	@mkdir -p build

build/static: build/
	@mkdir -p build/static

build/prog: build/
	@mkdir -p build/prog

build/prog/%.json: prog/%.json build/prog
	@echo "Copying $< to $@"
	@cp $< $@

build/static/%.html.gz: static/%.html build/static
	@echo "Compressing $< to $@"
	@gzip -c $< > $@

build/static/%.css: static/%.css build/static
	@echo "Copying $< to $@"
	@cp $< $@

build/static/%.js: static/%.js build/static
	@echo "Minifying $< to $@"
	@source venv/bin/activate && \
	$(python) -m jsmin $< > $@


build/%.mpy: %.py build/
	@source venv/bin/activate && \
	mpy-cross $< -o $@


.PHONY: bundle
bundle: $(OBJ) $(STATIC_OBJ) $(PROGS)
	@echo "Project bundleed successfully."

.PHONY: clean
clean:
	@echo "Cleaning up..."
	@rm -rf build


