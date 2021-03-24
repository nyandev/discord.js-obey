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

interface CommandOptions {
  name: string;
  description?: string;
  group?: string;
  guildOnly?: boolean;
  permissions?: Permission;
  dummy?: boolean;
  args?: ArgumentSpec[];
}

interface InheritedCommandOptions {
  group?: string;
  guildOnly: boolean;
  permissions: Permission;
}

export interface CommandConstructor {
  new (client: Client, parentOptions?: InheritedCommandOptions): Command;
  options: CommandOptions;
}

export abstract class Command {
  readonly name: string;
  readonly description?: string;
  readonly group?: string;
  readonly guildOnly: boolean;
  readonly permissions: Permission;
  readonly dummy: boolean;
  readonly arguments: ArgumentSpec[];

  constructor(private client: Client, parentOptions?: InheritedCommandOptions) {
    const cls = this.constructor as CommandConstructor;

    if (!cls.options.name)
      throw new Error("Command name cannot be empty.");
    if (cls.options.group === '')
      throw new Error("Command group cannot be empty.");
    if (parentOptions && cls.options.group !== undefined)
      throw new Error("Command group can only be specified for base commands.");

    this.name = cls.options.name;
    this.description = cls.options.description;
    this.group = cls.options.group || parentOptions?.group;
    this.guildOnly = cls.options.guildOnly ?? parentOptions?.guildOnly ?? DEFAULTS.guildOnly;
    this.permissions = cls.options.permissions ?? parentOptions?.permissions ?? DEFAULTS.permissions;
    this.dummy = cls.options.dummy ?? DEFAULTS.dummy;
    this.arguments = cls.options.args ?? DEFAULTS.args;
  }

  async run(message: Message, args: Arguments): Promise<void> {
    // Not abstract so that dummy commands need not define this
  }
}
