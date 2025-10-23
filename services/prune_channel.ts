import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export async function pruneInactiveChannels(days = 30000000): Promise<number> {
  const { default: Channel } = await import('#models/channel')

  const channels = await Channel.query()
    .select('channels.*')
    .leftJoin('channel_chats', 'channel_chats.channel_id', 'channels.id')
    .leftJoin('chats', 'chats.id', 'channel_chats.chat_id')
    .leftJoin('messages', 'messages.id', 'chats.last_message_id')
    .groupBy('channels.id')
    .havingRaw('COALESCE(MAX(messages.created_at), channels.created_at) < ?', [
      DateTime.now().minus({ days }).toSQL()!,
    ])

  for (const channel of channels) {
    await db.transaction(async (trx) => {
      await channel.useTransaction(trx).related('members').detach()

      await channel.useTransaction(trx).load('chats', (q) => q.preload('messages'))

      for (const chat of channel.chats) {
        for (const msg of chat.messages) {
          await msg.useTransaction(trx).delete()
        }
        await chat.useTransaction(trx).delete()
      }

      await channel.useTransaction(trx).related('chats').detach()

      await channel.useTransaction(trx).delete()
    })
  }

  return channels.length
}
