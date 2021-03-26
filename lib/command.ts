import { Message } from 'discord.js';

import { Client, Permission } from './client';
import { Arguments } from './parser';


const DEFAULTS = {
  guildOnly: false,
  permissions: Permission.User,
  dummy: false,
  args: []
};

export interface ArgumentSpec {
  key: string;
  type: string;
  optional?: boolean;
  catchAll?: boolean;
}

interface Subcommands {
  [name: string]: CommandConstructor;
}

export interface CommandOptions {
  name: string;
  alias?: string;
  description?: string;
  group?: string;
  guildOnly?: boolean;
  permissions?: Permission;
  dummy?: boolean;
  args?: ArgumentSpec[];
  subcommands?: Subcommands;
}

export interface CommandConstructor {
  new(...args: any[]): Command;
  options: CommandOptions;
}

export type CommandFactory = (ctor: CommandConstructor, client: Client, options: CommandConstructorOptions) => Command;

export interface CommandConstructorOptions {
  parent?: Command;
  factory?: CommandFactory;
}

export abstract class Command {
  readonly name: string;
  readonly alias?: string;
  readonly description?: string;
  readonly group?: string;
  readonly guildOnly: boolean;
  readonly permissions: Permission;
  readonly dummy: boolean;
  readonly args: ArgumentSpec[];
  readonly subcommands: Map<string, Command> = new Map();
  readonly parent?: Command;

  constructor(protected readonly client: Client, options?: CommandConstructorOptions) {
    const cls = this.constructor as CommandConstructor;

    if (!cls.options.name)
      throw new Error("Command name cannot be empty");
    if (/\s/.test(cls.options.name))
      throw new Error("Command name cannot contain whitespace");
    if (cls.options.alias === '')
      throw new Error("Command alias cannot be empty");
    if (cls.options.alias && /\s/.test(cls.options.alias))
      throw new Error("Command alias cannot contain whitespace");
    if (cls.options.group === '')
      throw new Error("Command group cannot be empty");
    if (options?.parent && cls.options.group !== undefined)
      throw new Error("Command group can only be specified for base commands");

    this.name = options?.parent ? `${options.parent.name} ${cls.options.name}` : cls.options.name;
    this.alias = cls.options.alias;
    this.description = cls.options.description;
    this.group = cls.options.group || options?.parent?.group;
    this.guildOnly = cls.options.guildOnly ?? options?.parent?.guildOnly ?? DEFAULTS.guildOnly;
    this.permissions = cls.options.permissions ?? options?.parent?.permissions ?? DEFAULTS.permissions;
    this.dummy = cls.options.dummy ?? DEFAULTS.dummy;
    this.args = cls.options.args ?? DEFAULTS.args;
    this.parent = options?.parent;

    validateArguments(this.args, cls.name);
    this.buildSubcommands(options?.factory);
  }

  async run(message: Message, args: Arguments): Promise<void> {
    // Not abstract so that dummy commands need not define this
  }

  private buildSubcommands(factory?: CommandFactory): void {
    const cls = this.constructor as CommandConstructor;
    if (cls.options.subcommands) {
      for (const [name, ctor] of Object.entries(cls.options.subcommands)) {
        const command = factory
          ? factory(ctor, this.client, { factory, parent: this })
          : new ctor(this.client, { parent: this });
        this.subcommands.set(name, command);
      }
    }
  }
}

function validateArguments(specs: ArgumentSpec[], commandName: string): void {
  const error = (msg: string) => { throw new Error(`[${commandName}] ${msg}`); };
  const keys = new Set();
  let optionalArgsFound = false;

  for (const [i, spec] of specs.entries()) {
    if (spec.catchAll) {
      if (i < specs.length - 1)
        error("Only the last argument can be specified as catch-all");
      if (spec.optional)
        error("A catch-all argument cannot be specified as optional");
    }

    if (keys.has(spec.key))
      error(`Duplicate argument key: ${spec.key}`);
    keys.add(spec.key);

    if (optionalArgsFound && !spec.optional && !spec.catchAll)
      error("Required arguments must precede optional arguments");
    if (spec.optional)
      optionalArgsFound = true;
  }
}
