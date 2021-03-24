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
  description: string;
  guildOnly?: boolean;
  permissions?: Permission;
  dummy?: boolean;
  args?: ArgumentSpec[];
}

interface InheritedCommandOptions {
  guildOnly?: boolean;
  permissions?: Permission;
}

export interface CommandConstructor {
  new (client: Client, parentOptions?: InheritedCommandOptions): Command;
  options: CommandOptions;
}

export abstract class Command {
  readonly name: string;
  readonly description: string;
  readonly guildOnly: boolean;
  readonly permissions: Permission;
  readonly dummy: boolean;
  readonly arguments: ArgumentSpec[];

  constructor(private client: Client, parentOptions?: InheritedCommandOptions) {
    const cls = this.constructor as CommandConstructor;

    this.name = cls.options.name;
    this.description = cls.options.description;
    this.guildOnly = cls.options.guildOnly ?? parentOptions?.guildOnly ?? DEFAULTS.guildOnly;
    this.permissions = cls.options.permissions ?? parentOptions?.permissions ?? DEFAULTS.permissions;
    this.dummy = cls.options.dummy ?? DEFAULTS.dummy;
    this.arguments = cls.options.args ?? DEFAULTS.args;
  }

  abstract run(message: Message, args: Arguments): Promise<void>
}
