# Toolbox Makefile

BINARY=toolbox
VERSION?=dev
LDFLAGS=-ldflags "-s -w -X main.Version=$(VERSION)"
GOFLAGS?=

.PHONY: all build install clean test

all: build

# Build the binary
build:
	@echo "Building toolbox $(VERSION)..."
	cd server && go build $(GOFLAGS) $(LDFLAGS) -o ../$(BINARY) .
	@echo "Build complete: $(BINARY)"

# Install to system paths
install: build
	@echo "Installing toolbox..."
	sudo ./scripts/install.sh

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -f $(BINARY)
	rm -f server/$(BINARY)

# Run in development mode
dev: build
	@echo "Running in development mode..."
	./$(BINARY) --config ./server.json --data . --static . --log stderr

# Run tests (placeholder)
test:
	@echo "Running tests..."
	# Add test commands here
	@echo "Tests complete"

# Help
help:
	@echo "Available targets:"
	@echo "  build    - Build the binary"
	@echo "  install  - Install to system paths"
	@echo "  clean    - Clean build artifacts"
	@echo "  dev      - Run in development mode"
	@echo "  test     - Run tests"
	@echo "  help     - Show this help"
