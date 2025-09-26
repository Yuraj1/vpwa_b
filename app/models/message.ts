import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Chat from './chat.js'

export default class Message extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare content: string

  @column({ columnName: 'sender_id' })
  declare senderId: number

  @column()
  declare type: string

  @belongsTo(() => User, {
    foreignKey: 'senderId',
  })
  declare sender: BelongsTo<typeof User>

  @manyToMany(() => Chat, {
    pivotTable: 'chat_messages',
    pivotForeignKey: 'messages_id', // колонка в chat_messages, указывающая на Message
    pivotRelatedForeignKey: 'chat_id', // колонка в chat_messages, указывающая на Chat
  })
  declare chats: ManyToMany<typeof Chat>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
