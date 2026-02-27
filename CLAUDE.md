# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenMeasureViewer is a frontend-only web platform for researchers to visualize and explore data exported from industry/lab measurement devices. All data processing runs locally in the browser — no data is transmitted to a server.

## Tech Stack

- React + Vite

## Architecture

- **Plugin-based**: Each measurement device type is supported by an independent plugin. The core platform should remain decoupled from device-specific parsing/rendering logic.
- **Client-side only**: All data parsing and visualization happens in the browser to preserve data privacy.
- **Multi-format ingestion**: Supports CSV, JSON, Excel, and other formats depending on the plugin/device.

## Project Status

This project is in initial setup. Build commands, test framework, and project structure have not yet been established.

## Git Conventions

- Never include `Co-Authored-By` lines in commit messages.
