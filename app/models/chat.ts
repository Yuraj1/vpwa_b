import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Message from '#models/message'
import User from '#models/user'
import Channel from '#models/channel'

export default class Chat extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column({ columnName: 'last_message_id' })
  declare lastMessageId: number | null

  @column({ columnName: 'owner_id' })
  declare ownerId: number | null

  @belongsTo(() => Message, {
    foreignKey: 'lastMessageId',
  })
  declare lastMessage: BelongsTo<typeof Message>

  @belongsTo(() => User, {
    foreignKey: 'ownerId',
  })
  declare owner: BelongsTo<typeof User>

  @manyToMany(() => Channel, {
    pivotTable: 'channel_chats',
  })
  declare channels: ManyToMany<typeof Channel>

  @manyToMany(() => Message, {
    pivotTable: 'chat_messages',
    localKey: 'id',
    pivotForeignKey: 'chat_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'messages_id',
  })
  declare messages: ManyToMany<typeof Message>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
