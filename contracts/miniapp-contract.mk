# Shared Makefile logic for MiniApp contracts.
# Usage: set CONTRACT_NAME in a per-contract Makefile and include this file.

SHELL := /bin/bash

NETWORK ?= neoexpress
RPC ?=
HASH ?=
ADDRESS ?=
SIGNERS ?=
UPDATE_ARITY ?= auto
UPDATE_DATA ?=

CONTRACT_NAME ?=
ROOT_DIR := $(abspath $(CURDIR)/../..)
CONTRACT_DIR := $(CURDIR)
BUILD_DIR := $(ROOT_DIR)/contracts/build
CONFIG_DIR := $(ROOT_DIR)/deploy/config
NEOEXPRESS_CONFIG := $(CONFIG_DIR)/default.neo-express
DEPLOYED_FILE := $(CONFIG_DIR)/deployed_contracts.json
TESTNET_CONFIG := $(CONFIG_DIR)/testnet_contracts.json
TESTNET_WALLET_CONFIG := $(ROOT_DIR)/deploy/testnet/wallets/wallet-config.yaml

DEVPACK_FILES := \
	$(ROOT_DIR)/contracts/MiniApp.DevPack/ServiceInterfaces.cs \
	$(ROOT_DIR)/contracts/MiniApp.DevPack/MiniAppBase.cs \
	$(ROOT_DIR)/contracts/MiniApp.DevPack/MiniAppGameBase.cs \
	$(ROOT_DIR)/contracts/MiniApp.DevPack/MiniAppServiceBase.cs \
	$(ROOT_DIR)/contracts/MiniApp.DevPack/MiniAppTimeLockBase.cs \
	$(ROOT_DIR)/contracts/MiniApp.DevPack/MiniAppComputeBase.cs \
	$(ROOT_DIR)/contracts/MiniApp.DevPack/MiniAppGameComputeBase.cs

SRC_FILES := $(wildcard $(CONTRACT_DIR)/*.cs)
NEF_FILE := $(BUILD_DIR)/$(CONTRACT_NAME).nef
MANIFEST_FILE := $(BUILD_DIR)/$(CONTRACT_NAME).manifest.json

NCCS_BIN ?= $(shell if command -v nccs >/dev/null 2>&1; then echo nccs; elif [ -x "$$HOME/.dotnet/tools/nccs" ]; then echo "$$HOME/.dotnet/tools/nccs"; fi)
NEOXP_BIN ?= $(shell if command -v neoxp >/dev/null 2>&1; then echo neoxp; elif [ -x "$$HOME/.dotnet/tools/neoxp" ]; then echo "$$HOME/.dotnet/tools/neoxp"; fi)
NEOGO_BIN ?= $(shell command -v neo-go 2>/dev/null)
JQ_BIN ?= $(shell command -v jq 2>/dev/null)
CURL_BIN ?= $(shell command -v curl 2>/dev/null)

.PHONY: help setup compile build deploy update clean

help:
	@echo "MiniApp contract: $(CONTRACT_NAME)"
	@echo ""
	@echo "Usage: make [target] [NETWORK=neoexpress|testnet] [RPC=<rpc>] [HASH=<hash>]"
	@echo "       Optional: ADDRESS=<signer> SIGNERS=<addr[:scope],...> UPDATE_ARITY=auto|2|3 UPDATE_DATA=<data>"
	@echo ""
	@echo "Targets:"
	@echo "  setup   - Check dependencies and prepare build directory"
	@echo "  compile - Compile contract to contracts/build"
	@echo "  build   - Alias for compile"
	@echo "  deploy  - Deploy contract to NETWORK"
	@echo "  update  - Update existing contract on NETWORK"
	@echo "  clean   - Remove build artifacts for this contract"
	@echo ""
	@echo "Examples:"
	@echo "  make compile"
	@echo "  make deploy NETWORK=neoexpress"
	@echo "  make update NETWORK=testnet HASH=0x..."

setup:
	@set -e; \
	if [ -z "$(CONTRACT_NAME)" ]; then \
		echo "Error: CONTRACT_NAME is not set."; exit 1; \
	fi; \
	if [ -z "$(NCCS_BIN)" ]; then \
		echo "Error: nccs not found. Install with: dotnet tool install -g Neo.Compiler.CSharp"; exit 1; \
	fi; \
	if [ "$(NETWORK)" = "neoexpress" ]; then \
		if [ -z "$(NEOXP_BIN)" ]; then \
			echo "Error: neoxp not found. Install with: dotnet tool install -g Neo.Express"; exit 1; \
		fi; \
	else \
		if [ -z "$(NEOGO_BIN)" ]; then \
			echo "Error: neo-go not found. Install with: go install github.com/nspcc-dev/neo-go/cli/neo-go@latest"; exit 1; \
		fi; \
	fi; \
	if [ -z "$(JQ_BIN)" ]; then \
		echo "Warning: jq not found; deploy/update hash bookkeeping may be limited."; \
	fi; \
	mkdir -p "$(BUILD_DIR)"

compile: setup
	@set -e; \
	if [ -z "$(SRC_FILES)" ]; then \
		echo "Error: no .cs files found in $(CONTRACT_DIR)"; exit 1; \
	fi; \
	TMP_DIR="$(BUILD_DIR)/.tmp-$(CONTRACT_NAME)"; \
	rm -rf "$$TMP_DIR"; mkdir -p "$$TMP_DIR"; \
	"$(NCCS_BIN)" $(DEVPACK_FILES) $(SRC_FILES) -o "$$TMP_DIR"; \
	if ! ls "$$TMP_DIR"/*.nef >/dev/null 2>&1; then \
		echo "Error: compilation failed (no .nef output)"; exit 1; \
	fi; \
	mv "$$TMP_DIR"/*.nef "$(BUILD_DIR)/"; \
	if ls "$$TMP_DIR"/*.manifest.json >/dev/null 2>&1; then \
		mv "$$TMP_DIR"/*.manifest.json "$(BUILD_DIR)/"; \
	fi; \
	rm -rf "$$TMP_DIR"; \
	echo "Built $(NEF_FILE)"

build: compile

deploy: compile
	@set -e; \
	if [ ! -f "$(NEF_FILE)" ]; then \
		echo "Error: missing $(NEF_FILE). Run make compile first."; exit 1; \
	fi; \
	if [ "$(NETWORK)" = "neoexpress" ]; then \
		if [ ! -f "$(NEOEXPRESS_CONFIG)" ]; then \
			echo "Error: Neo Express config not found: $(NEOEXPRESS_CONFIG)"; exit 1; \
		fi; \
		out=$$($(NEOXP_BIN) contract deploy "$(NEF_FILE)" owner -i "$(NEOEXPRESS_CONFIG)" 2>&1 || true); \
		hash=$$(echo "$$out" | grep -oE '0x[a-fA-F0-9]{40}' | head -1 || true); \
		if [ -n "$$hash" ]; then \
			echo "Deployed: $$hash"; \
			if [ -n "$(JQ_BIN)" ]; then \
				mkdir -p "$(CONFIG_DIR)"; \
				if [ ! -f "$(DEPLOYED_FILE)" ]; then echo "{}" > "$(DEPLOYED_FILE)"; fi; \
				$(JQ_BIN) --arg name "$(CONTRACT_NAME)" --arg hash "$$hash" '.[$$name]=$$hash' "$(DEPLOYED_FILE)" > "$(DEPLOYED_FILE).tmp" && mv "$(DEPLOYED_FILE).tmp" "$(DEPLOYED_FILE)"; \
			fi; \
		else \
			echo "Deploy output:"; echo "$$out"; \
			exit 1; \
		fi; \
	else \
		if [ ! -f "$(MANIFEST_FILE)" ]; then \
			echo "Error: missing $(MANIFEST_FILE). Run make compile first."; exit 1; \
		fi; \
		if [ ! -f "$(TESTNET_WALLET_CONFIG)" ]; then \
			echo "Error: wallet config not found: $(TESTNET_WALLET_CONFIG)"; exit 1; \
		fi; \
		rpc="$(RPC)"; \
		if [ -z "$$rpc" ]; then \
			if [ -n "$(JQ_BIN)" ] && [ -f "$(TESTNET_CONFIG)" ]; then \
				rpc=$$($(JQ_BIN) -r '.rpc_endpoints[0] // empty' "$(TESTNET_CONFIG)"); \
			fi; \
		fi; \
		if [ -z "$$rpc" ]; then rpc="https://testnet1.neo.coz.io:443"; fi; \
		$(NEOGO_BIN) contract deploy --in "$(NEF_FILE)" --manifest "$(MANIFEST_FILE)" --wallet-config "$(TESTNET_WALLET_CONFIG)" -r "$$rpc" --force --await; \
	fi

update: compile
	@set -e; \
	if [ ! -f "$(NEF_FILE)" ]; then \
		echo "Error: missing $(NEF_FILE). Run make compile first."; exit 1; \
	fi; \
	hash="$(HASH)"; \
	if [ -z "$$hash" ]; then \
		if [ "$(NETWORK)" = "neoexpress" ]; then \
			if [ -z "$(JQ_BIN)" ] || [ ! -f "$(DEPLOYED_FILE)" ]; then \
				echo "Error: missing jq or deployed_contracts.json; set HASH=0x..."; exit 1; \
			fi; \
			hash=$$($(JQ_BIN) -r --arg name "$(CONTRACT_NAME)" '.[$$name] // empty' "$(DEPLOYED_FILE)"); \
		else \
			if [ -z "$(JQ_BIN)" ] || [ ! -f "$(TESTNET_CONFIG)" ]; then \
				echo "Error: missing jq or testnet_contracts.json; set HASH=0x..."; exit 1; \
			fi; \
			hash=$$($(JQ_BIN) -r --arg name "$(CONTRACT_NAME)" '.miniapp_contracts[$$name].address // empty' "$(TESTNET_CONFIG)"); \
		fi; \
	fi; \
	if [ -z "$$hash" ]; then \
		echo "Error: contract hash not found; set HASH=0x..."; exit 1; \
	fi; \
	if [ "$(NETWORK)" = "neoexpress" ]; then \
		if [ ! -f "$(NEOEXPRESS_CONFIG)" ]; then \
			echo "Error: Neo Express config not found: $(NEOEXPRESS_CONFIG)"; exit 1; \
		fi; \
		if $(NEOXP_BIN) contract update "$(NEF_FILE)" owner -i "$(NEOEXPRESS_CONFIG)" --hash "$$hash" >/dev/null 2>&1; then \
			echo "Updated $$hash"; \
		elif $(NEOXP_BIN) contract update "$(NEF_FILE)" owner "$$hash" -i "$(NEOEXPRESS_CONFIG)" >/dev/null 2>&1; then \
			echo "Updated $$hash"; \
		else \
			echo "Error: update failed for $$hash"; exit 1; \
		fi; \
	else \
		if [ ! -f "$(MANIFEST_FILE)" ]; then \
			echo "Error: missing $(MANIFEST_FILE). Run make compile first."; exit 1; \
		fi; \
		if [ ! -f "$(TESTNET_WALLET_CONFIG)" ]; then \
			echo "Error: wallet config not found: $(TESTNET_WALLET_CONFIG)"; exit 1; \
		fi; \
		rpc="$(RPC)"; \
		if [ -z "$$rpc" ]; then \
			if [ -n "$(JQ_BIN)" ] && [ -f "$(TESTNET_CONFIG)" ]; then \
				rpc=$$($(JQ_BIN) -r '.rpc_endpoints[0] // empty' "$(TESTNET_CONFIG)"); \
			fi; \
		fi; \
		if [ -z "$$rpc" ]; then rpc="https://testnet1.neo.coz.io:443"; fi; \
		address_flag=""; \
		if [ -n "$(ADDRESS)" ]; then address_flag="--address $(ADDRESS)"; fi; \
		signer_args=""; \
		if [ -n "$(SIGNERS)" ]; then signer_args="-- $(SIGNERS)"; \
		elif [ -n "$(ADDRESS)" ]; then signer_args="-- $(ADDRESS):Global"; fi; \
		update_arity="$(UPDATE_ARITY)"; \
		if [ "$$update_arity" = "auto" ] && [ -n "$(JQ_BIN)" ] && [ -n "$(CURL_BIN)" ]; then \
			update_arity=$$($(CURL_BIN) -s -X POST -H 'Content-Type: application/json' \
				--data '{"jsonrpc":"2.0","id":1,"method":"getcontractstate","params":["'"$$hash"'"]}' \
				"$$rpc" | $(JQ_BIN) -r '.result.manifest.abi.methods[] | select(.name=="update") | .parameters | length' 2>/dev/null | head -1); \
		fi; \
		if [ "$$update_arity" = "2" ]; then \
			manifest_json=$$(cat "$(MANIFEST_FILE)"); \
			$(NEOGO_BIN) contract invokefunction -r "$$rpc" --wallet-config "$(TESTNET_WALLET_CONFIG)" $$address_flag --force --await "$$hash" update filebytes:"$(NEF_FILE)" string:"$$manifest_json" $$signer_args; \
		else \
			$(NEOGO_BIN) contract update --in "$(NEF_FILE)" --manifest "$(MANIFEST_FILE)" --wallet-config "$(TESTNET_WALLET_CONFIG)" -r "$$rpc" $$address_flag --force --await "$$hash" $(UPDATE_DATA) $$signer_args; \
		fi; \
	fi

clean:
	@rm -f "$(NEF_FILE)" "$(MANIFEST_FILE)"
