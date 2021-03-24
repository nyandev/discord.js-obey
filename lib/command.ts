import { Message } from 'discord.js';

import { Client, Permission } from './client';


const DEFAULTS = {
  guildOnly: false,
  permissions: Permission.User,
  dummy: false,
  args: []
};

interface ArgumentSpec {
  key: string;
  type: string;
  optional?: boolean;
  catchAll?: boolean;
}

export type Arguments = Record<string, any>;

interface Subcommands {
  [name: string]: CommandConstructor;
}

export interface CommandOptions {
  name: string;
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
  readonly description?: string;
  readonly group?: string;
  readonly guildOnly: boolean;
  readonly permissions: Permission;
  readonly dummy: boolean;
  readonly arguments: ArgumentSpec[];
  readonly subcommands: Map<string, Command> = new Map();

  constructor(protected readonly client: Client, options?: CommandConstructorOptions) {
    const cls = this.constructor as CommandConstructor;

    if (!cls.options.name)
      throw new Error("Command name cannot be empty.");
    if (cls.options.group === '')
      throw new Error("Command group cannot be empty.");
    if (options?.parent && cls.options.group !== undefined)
      throw new Error("Command group can only be specified for base commands.");

    this.name = cls.options.name;
    this.description = cls.options.description;
    this.group = cls.options.group || options?.parent?.group;
    this.guildOnly = cls.options.guildOnly ?? options?.parent?.guildOnly ?? DEFAULTS.guildOnly;
    this.permissions = cls.options.permissions ?? options?.parent?.permissions ?? DEFAULTS.permissions;
    this.dummy = cls.options.dummy ?? DEFAULTS.dummy;
    this.arguments = cls.options.args ?? DEFAULTS.args;

    this.buildSubcommands(options?.factory);
  }

  async run(message: Message, args: Arguments): Promise<void> {
    // Not abstract so that dummy commands need not define this
  }

  protected buildSubcommands(factory?: CommandFactory): void {
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
