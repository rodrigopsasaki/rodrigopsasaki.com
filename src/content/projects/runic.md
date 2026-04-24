---
title: "runic"
description: "Point a CLI at a folder. Drop in scripts. They become commands."
tags: ["CLI", "TypeScript", "Developer Tools", "Shell", "Polyglot"]
github: "https://github.com/rodrigopsasaki/runic"
npm: "https://www.npmjs.com/package/run-user-nested-invokable-commands"
featured: true
visible: true
order: 1
---

**Point a CLI at a folder. Drop in scripts. They become commands.**

That's the whole idea.

```bash
eval "$(runic init zsh --name ops --dir ~/scripts)"
```

Now your folder *is* a CLI:

```
~/scripts/                       $ ops lint
├── lint.sh                 →    $ ops format
├── format.sh                    $ ops dev start
├── dev/                         $ ops gen client
│   ├── start.sh                 $ ops help
│   └── seed.py
└── gen/
    ├── client.sh
    └── component.js
```

## Want a new command? Drop a file.

```bash
$ cat > ~/scripts/pr.sh <<'SCRIPT'
#!/bin/bash
# Open a PR using our team template
gh pr create --template .github/pull_request_template.md --web
SCRIPT

$ chmod +x ~/scripts/pr.sh

$ ops pr    # live. no reload, no registration, no restart.
```

No manifest. No config file. The shell function reads the filesystem on every invocation, so the CLI is always whatever's currently on disk.

Scripts can be in any language. Directories become subcommands. Filenames become command names.

## How it works

`runic` generates a shell function with the name you choose. That function does all the dispatching. No Node.js startup on every invocation, no manifest to maintain, no config files. It probes the filesystem directly, finds the file that matches your command, and runs it.

*How* it runs the file depends on what the file is:

- **Known extension** (`.sh`, `.py`, `.rb`, `.js`, `.ts`, …) invoked via the mapped interpreter.
- **Extensionless with a shebang** the shebang picks the interpreter.
- **Extensionless and executable** (opt-in via `--allow-binaries`) exec'd directly. Native binaries run at kernel speed with no interpreter in the loop.

The generated function handles everything: command dispatch, help, doctor diagnostics, tab completions. You interact with your CLI, not with `runic`.

## Install

```bash
npm install -g run-user-nested-invokable-commands
```

> Sorry, all the good names were already taken.

## Setup

Add one line to your shell config (`.zshrc`, `.bashrc`, or `config.fish`):

```bash
# zsh
eval "$(runic init zsh --name ops --dir ~/scripts)"

# bash
eval "$(runic init bash --name ops --dir ~/scripts)"

# fish
runic init fish --name ops --dir ~/scripts | source
```

That's it. You now have a CLI called `ops`.

## Supported runtimes

Most of what lands in your script dir is interpreted. runic knows the common extensions and invokes the right runner automatically:

| Extension | Runner    |
|-----------|-----------|
| `.sh`     | bash      |
| `.bash`   | bash      |
| `.zsh`    | zsh       |
| `.py`     | python3   |
| `.rb`     | ruby      |
| `.js`     | node      |
| `.ts`     | npx tsx   |
| `.php`    | php       |
| `.pl`     | perl      |

Extensionless files with a shebang line work too. So `#!/usr/bin/env python3` or `#!/usr/bin/env -S python3 -u` both resolve correctly with no extension in the filename.

Run `runic runtimes` to see which of these are installed on the current host, with versions.

## Native binaries

Off by default. Pass `--allow-binaries` at init and runic will also dispatch extensionless *executables* (Mach-O, ELF, or any other format the kernel knows how to `execve`). A Rust binary, a Go tool, a hand-compiled C util: all become commands alongside your scripts.

```bash
eval "$(runic init zsh --name ops --dir ~/scripts --allow-binaries)"
```

**Why opt-in?** Shell scripts are readable source. You can open `~/scripts/lint.sh` and see exactly what it does before running it. Binaries are opaque. You're trusting the bytes. Making it a conscious flag means you've thought about whose bytes you're running, not just which folder they live in.

## Descriptions

The first comment after the shebang becomes the command's description in `help` output:

```bash
#!/bin/bash
# Deploy the application to the target environment
```

No config files needed. Your scripts document themselves.

## Multiple directories: PATH-style overrides

Point at multiple directories. They're searched in order, like `$PATH`: **the first one to match wins.** This isn't a conflict to resolve, it's how you override.

```bash
eval "$(runic init zsh --name ops --dir ~/my-scripts --dir /shared/team-scripts)"
```

Anything in `~/my-scripts` overrides the same-named command in `/shared/team-scripts`. Same as how `~/bin:/usr/local/bin:/usr/bin` lets you shadow a system binary by dropping a script in `~/bin`.

What this enables:

- **Personal overrides on a shared repo.** Your team maintains `/shared/team-scripts/test.sh` that runs the standard test suite. You want it to also reset your local DB first. Drop your own `test.sh` in `~/my-scripts`. It shadows the team version, just for you, no fork required.
- **Try a change without a PR.** The team script has a rough edge you want to smooth out. Copy it to `~/my-scripts`, edit, use it for a week, then PR the change once you're sure.
- **Per-context behavior.** Same command name, different implementation in `~/my-scripts/work/` vs `~/my-scripts/personal/`. Switch by reordering `--dir`.
- **Layered teams.** Platform team's repo, then your squad's repo, then your personal scripts.

`runic doctor` reports every shadowed command so nothing happens behind your back.

## Whitelabeling

The `--name` flag is the CLI's identity. Create as many as you want:

```bash
eval "$(runic init zsh --name dev --dir ~/scripts/dev)"
eval "$(runic init zsh --name docs --dir ~/scripts/docs)"
eval "$(runic init zsh --name lint --dir /opt/lint-tools)"
```

Three separate CLIs. Three names. Independent.

## Tradeoffs

runic dispatches by reading the filesystem on every invocation. The consequences of that choice:

### Upsides

- **Shell-native everything.** runic `exec`s your scripts, so they inherit how Unix already works: arg quoting, pipes (`ops logs | grep ERROR`), redirection, signals, TTY detection, exit codes, process groups, job control.
- **Login state, sudo prompts, file locks, tmux sessions.** Scripts can `ssh-add`, prompt for `sudo`, hold a flock, attach to a tmux session. Anything any other shell process can do.
- **Polyglot.** bash, python, node, ruby, typescript, perl, php. Any combination in the same CLI. With `--allow-binaries`, native executables (Rust, Go, C, …) drop into the same folder and run at kernel speed.
- **No registration step.** Scripts on disk are the source of truth; there's no manifest. `ops help` and tab completions are generated from the filesystem.
- **Each script is independent.** No framework coupling between commands. Delete one, the others still work. A broken script doesn't take down the CLI.
- **Descriptions come from comments.** The first comment after the shebang is what `ops help` prints for that command.
- **Migration is filesystem-only.** Adopt by pointing `--dir` at a folder of scripts. Stop using runic by deleting the eval line. The scripts remain as files with shebangs.

### Downsides

- **A filesystem read on every invocation.** Each `ops <command>` walks the script dirs. Millisecond-scale, proportional to script-dir size.
- **No global flags.** `--verbose` doesn't transparently apply to every command. Each script handles its own arg parsing.
- **No central validation.** You can't declare "this command needs `--env=staging|prod`" once. Each script enforces its own contract.
- **Auto-help is minimal.** One-line description per command; no generated usage / options / examples. Scripts that need rich help implement their own `--help`.
- **Refactor cost is filesystem cost.** Rename `db/` to `database/` and the command name moves with it. There's no manifest layer insulating command names from file paths.
- **Distribution still requires runic.** Sharing your CLI means sharing the script folder and asking the recipient to install runic and `eval` the init line.
- **Binaries are opaque.** Source-code scripts can be inspected before they run; compiled executables can't. `--allow-binaries` puts that tradeoff in your hands rather than hiding it.

## Built-in commands

Every generated CLI has these built-in:

| Command | What it does |
|---------|-------------|
| `ops help` | List all commands with descriptions |
| `ops doctor` | Check permissions, shebangs, runners for your scripts |
| `ops runtimes` | Show which interpreters are installed on this host |
| `ops completions zsh` | Generate tab-completion script |

These delegate to the `runic` binary for the heavy lifting (directory walking, formatting). Dispatch, the thing that runs 100 times a day, stays in the shell function at zero cost.

## Command resolution

`runic` uses greedy longest-match. Given `ops test unit`:

1. Try `<dir>/test/unit.{sh,py,js,...}` if found, run it.
2. Try `<dir>/test.{sh,py,js,...}` with `unit` as an argument.

This means a script and a directory can coexist with the same name:

```
scripts/
├── test.sh             # ops test            (default: run everything)
└── test/
    └── unit.sh         # ops test unit       (just the unit tests)
```

Both work. The longer match wins when it exists.

## License

MIT. Built for engineers who'd rather ship a script than register a command.
