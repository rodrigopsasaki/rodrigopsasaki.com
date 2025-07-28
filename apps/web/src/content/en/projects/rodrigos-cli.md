---
title: "rodrigos-cli"
description: "A developer-first CLI framework that makes local commands feel native — like they were always part of your environment."
tags: ["CLI", "TypeScript", "Developer Tools", "Framework", "XDG", "Extensions"]
github: "https://github.com/rodrigopsasaki/rodrigos-cli"
featured: true
order: 1
---

## What is rodrigos-cli?

A developer-first CLI framework that makes local commands feel native — like they were always part of your environment. Built with XDG compliance, theme-aware colors, and a delightful developer experience.

## Philosophy: Explicit by Design

rodrigos-cli follows a simple but powerful philosophy: **be very explicit**. Unlike magic-heavy tools that obscure what's happening, every action in rodrigos-cli is transparent and debuggable.

- **Zero Hidden State**: What you see is what you get
- **Explicit Configuration**: Every setting has a clear purpose and location  
- **Transparent Execution**: Full visibility into how commands are discovered and executed
- **XDG Compliance**: Files go where they should according to standards
- **Developer-First**: Built to make the lives of developers easier.

## Key Features

### 🎯 Zero Boilerplate
Drop a script into a folder and it works instantly. No registration, no manifests, no complex setup.

```bash
mkdir -p ~/.local/share/rc/extensions/utils
echo '#!/bin/bash\necho "Hello from $(whoami)!"' > ~/.local/share/rc/extensions/utils/hello.sh
chmod +x ~/.local/share/rc/extensions/utils/hello.sh
rc utils hello  # Works immediately
```

### 📁 Directory-Based Discovery
Commands are organized naturally using the filesystem. The directory structure becomes your command structure.

```
~/.local/share/rc/extensions/
├── gen/              # rc gen <command>
│   ├── uuid.cjs     # rc gen uuid
│   ├── objectid.sh  # rc gen objectid
│   └── secret.js    # rc gen secret
├── aws/              # rc aws <service> <command>
│   ├── s3/
│   │   └── sync.sh  # rc aws s3 sync
│   └── ec2/
│       └── list.py  # rc aws ec2 list
└── docker/           # rc docker <command>
    ├── clean.sh     # rc docker clean
    └── logs.sh      # rc docker logs
```

### 🔄 Runtime-Agnostic Execution
Support for multiple runtimes out of the box:

| Extension | Runtime | Auto-Detection |
|-----------|---------|----------------|
| `.js`     | Node.js | ✅ |
| `.ts`     | tsx     | ✅ |
| `.sh`     | bash    | ✅ |
| `.py`     | python3 | ✅ |
| `.rb`     | ruby    | ✅ |
| `.php`    | php     | ✅ |

### ⚙️ Sidecar Configuration
Optional YAML/JSON metadata for enhanced functionality:

```yaml
# gen/uuid.yaml
description: Generate a random UUID v4
runner: node
passContext: true
aliases:
  - id
  - guid
options:
  - name: count
    type: number
    description: Number of UUIDs to generate
    default: 1
```

## Quick Start

### Installation

#### One-liner (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/rodrigopsasaki/rodrigos-cli/main/install.sh | bash
```

#### Manual installation
```bash
git clone https://github.com/rodrigopsasaki/rodrigos-cli.git
cd rodrigos-cli && ./install.sh
```

### First Run
```bash
rc  # Shows configuration and available commands
```

### Interactive Setup
```bash
rc --setup  # Creates XDG directories and example extensions
```

### Shell Completion
```bash
# Add to your shell profile:
eval "$(rc completion zsh)"    # For zsh
eval "$(rc completion bash)"   # For bash
eval "$(rc completion fish)"   # For fish
```

## Smart Aliasing System

### Sidecar Aliases
Create multiple ways to call the same command through configuration:

```bash
rc gen uuid     # Main command
rc gen id       # Alias from config
rc gen guid     # Another alias
```

### Intelligent Command Wrappers
Make rc commands feel native while preserving system functionality:

```bash
# Create intelligent wrappers
rc alias gen             # Creates 'gen' wrapper for all gen commands
rc alias npm             # Creates 'npm' wrapper that extends system npm

# Set up all aliases automatically
eval "$(rc alias-init)"  # One command configures everything

# Use them naturally
gen uuid                 # Runs: rc gen uuid
npm ss                   # Custom command via rc
npm install react       # System npm (passed through)
```

## Command Wrapping & Extension

Extend existing tools while preserving their functionality:

```bash
# Create enhanced npm with custom commands
mkdir -p ~/.local/share/rc/extensions/npm
# Add your custom npm commands here (show-scripts.sh, etc.)

# Create wrapper and set up aliases
rc alias npm             # Creates intelligent npm wrapper
eval "$(rc alias-init)"  # Sets up all aliases automatically

# Now 'npm' includes both:
npm install          # Original npm command (passed through)
npm show-scripts     # Your custom command via rc
npm ss               # Aliased custom command
```

## Architecture: XDG Compliance

rodrigos-cli follows the XDG Base Directory Specification for proper file organization:

```
~/.config/rc/                 # Configuration files
├── config.yaml              # Main configuration
└── ...

~/.local/share/rc/            # Data files  
├── extensions/              # Your custom extensions
│   ├── gen/
│   ├── aws/
│   └── docker/
└── ...

~/.cache/rc/                 # Cache files
~/.local/state/rc/           # State files
```

### Why XDG?
- **Standards Compliance**: Integrates properly with Linux/Unix systems
- **User Control**: Respects environment variables for custom paths
- **Clear Separation**: Config, data, cache, and state are properly separated
- **Tool Compatibility**: Works well with other XDG-compliant tools

## Extension Development

### Basic Extension
```bash
#!/bin/bash
# ~/.local/share/rc/extensions/deploy.sh

echo "Deploying to environment: $RC_PROFILE"
echo "Command: $RC_COMMAND"
echo "Script path: $RC_SCRIPT_PATH"

# Access context as JSON if passContext is enabled
if [ ! -t 0 ]; then
  context=$(cat)
  echo "Context: $context"
fi
```

### Advanced Extension with Config
```javascript
#!/usr/bin/env node
// ~/.local/share/rc/extensions/secret.js

import { randomBytes } from 'crypto';

const length = process.env.RC_LENGTH || 32;
const format = process.env.RC_FORMAT || 'hex';

const secret = randomBytes(parseInt(length));

switch (format) {
  case 'hex':
    console.log(secret.toString('hex'));
    break;
  case 'base64':
    console.log(secret.toString('base64'));
    break;
  default:
    console.log(secret.toString('hex'));
}
```

### Environment Variables

Extensions receive rich context through environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `RC_COMMAND` | Full command path | `aws s3 sync` |
| `RC_SCRIPT_PATH` | Path to executing script | `~/.local/share/rc/extensions/aws/s3/sync.sh` |
| `RC_SCRIPT_TYPE` | Script type | `sh`, `js`, `py`, etc. |
| `RC_<OPTION>` | Command-line options | `RC_PROFILE=production` |

## Use Cases

### Personal Productivity
```bash
rc gen uuid                  # Generate UUIDs
rc gen password 16           # Generate secure passwords
rc git aliases              # Show all git aliases
rc docker clean             # Clean up Docker resources
```

### Team Workflows
```bash
# Shared team extensions
git clone company/cli-tools ~/.local/share/rc/extensions/team

# Now everyone has:
rc deploy staging            # Deploy to staging
rc db migrate               # Run database migrations
rc test e2e                 # Run end-to-end tests
```

### System Administration
```bash
rc system backup            # Backup important files
rc network scan             # Scan network for devices
rc logs tail service-name   # Tail service logs
```

## Advanced Features

### Immutable Entrypoint System
rodrigos-cli uses an innovative immutable entrypoint system:

- **Self-Updating**: The `rc` command can update itself
- **Future-Proof**: Even outdated installations can receive updates
- **Reliable**: Symlinks never break across updates

```bash
rc --update  # Updates to latest version automatically
```

### Conflict Detection & Resolution
```bash
rc doctor    # Diagnose configuration and conflicts
```

The doctor command shows:
- Configuration status
- Extension directory analysis  
- Command conflicts with resolution suggestions
- Health status overview

### Tab Completion
Full autocompletion support for all shells:

```bash
rc gen <TAB>          # Shows: uuid, objectid, secret, password
rc aws <TAB>          # Shows: s3, ec2, lambda
rc docker c<TAB>      # Completes to: clean
```

## Why rodrigos-cli?

### For Individual Developers
- **Personal Automation**: Turn repetitive tasks into simple commands
- **Learning Tool**: Experiment with different languages and runtimes
- **Productivity Boost**: Access your tools faster than ever

### For Teams
- **Standardization**: Share common workflows and tools
- **Onboarding**: New team members get productive immediately
- **Documentation**: Commands are self-documenting with help text

### For Organizations
- **Compliance**: XDG-compliant file organization
- **Security**: No hidden magic, full transparency
- **Scalability**: Works from personal scripts to enterprise tools