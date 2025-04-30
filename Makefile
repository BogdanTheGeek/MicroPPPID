
python ?= python3

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
	$(python) -m pip install -R requirements.txt

venv:
	@echo "Creating virtual environment..."
	@$(python) -m venv venv
	@echo "Virtual environment created."
	@echo "Run 'source venv/bin/activate' to activate the virtual environment."


