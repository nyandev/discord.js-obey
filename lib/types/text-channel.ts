import { GuildChannel, Message, TextChannel } from 'discord.js';


export async function parse(arg: string, message: Message): Promise<TextChannel | string | null> {
  if (!message.guild)
    return null;

  const mention = arg.match(/^<#(\d+)$/);
  if (mention) {
    const channel = await message.client.channels.fetch(mention[1]);
    return (channel instanceof TextChannel) ? channel : null;
  }

  const channels = message.guild.channels.cache.filter(textChannelFilter(arg));
  if (channels.size === 0)
    return null;
  if (channels.size === 1)
    return channels.first() as TextChannel;
  return 'multiple-channels-same-name';
}

function textChannelFilter(search: string) {
  return (channel: GuildChannel) => {
    if (!(channel instanceof TextChannel))
      return false;
    return channel.name.toLowerCase() === search.toLowerCase();
  };
}
