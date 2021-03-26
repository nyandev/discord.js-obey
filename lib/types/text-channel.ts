import { GuildChannel, Message, TextChannel } from 'discord.js';

import { ParsedArgument } from '../parser';


export async function parse(arg: string, key: string, message: Message): Promise<ParsedArgument> {
  if (!message.guild)
    return notFound(arg, key);

  const mention = arg.match(/^<#(\d+)>$/);
  if (mention) {
    const channel = await message.client.channels.fetch(mention[1]);
    if (channel instanceof TextChannel)
      return success(channel);
    return notFound(arg, key);
  }

  const channels = message.guild.channels.cache.filter(textChannelFilter(arg));
  if (channels.size === 0)
    return notFound(arg, key);
  if (channels.size === 1)
    return success(channels.first() as TextChannel);
  return {
    success: false,
    error: {
      type: 'text-channel-multiple-found',
      key,
      search: arg,
      channels: [...channels.values()] as TextChannel[]
    }
  } as const;
}

function notFound(arg: string, key: string) {
  return {
    success: false,
    error: {
      type: 'text-channel-not-found',
      key,
      search: arg
    }
  } as const;
}

function success(channel: TextChannel) {
  return { success: true, value: channel } as const;
}

function textChannelFilter(search: string) {
  return (channel: GuildChannel) => {
    if (!(channel instanceof TextChannel))
      return false;
    return channel.name.toLowerCase() === search.toLowerCase();
  };
}
