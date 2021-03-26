import { TextChannel } from 'discord.js';

import { Permission } from './client';
import { Command } from './command';


interface DummyCommand {
  type: 'dummy-command';
  command: Command;
}

interface GuildOnly {
  type: 'guild-only-command';
  command: Command;
}

interface InternalError {
  type: 'internal-error',
  error: Error
}

interface InvalidArguments {
  type: 'invalid-arguments';
  command: Command;
  error: ArgumentError;
}

interface MissingPermissions {
  type: 'missing-permissions';
  command: Command;
  userPermissions: Permission;
}

interface RunError {
  type: 'run-error';
  error: any;
}

interface UnknownCommand {
  type: 'unknown-command';
  commandName: string | null;
}

export type CommandError =
    DummyCommand
  | GuildOnly
  | InternalError
  | InvalidArguments
  | MissingPermissions
  | RunError
  | UnknownCommand;

interface ExtraArguments {
  type: 'extra-arguments';
  maxArgs: number;
}

interface MissingArguments {
  type: 'missing-arguments';
  keys: string[];
}

interface TextChannelMultipleFound {
  type: 'text-channel-multiple-found';
  key: string;
  search: string;
  channels: TextChannel[];
}

interface TextChannelNotFound {
  type: 'text-channel-not-found';
  key: string;
  search: string;
}

interface WrongArgumentType {
  type: 'wrong-argument-type';
  key: string;
  value: string;
  expectedType: string;
}

export type ArgumentError =
    ExtraArguments
  | MissingArguments
  | TextChannelMultipleFound
  | TextChannelNotFound
  | WrongArgumentType;
