import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'channel_chats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('channel_id')
        .unsigned()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')
      table.integer('chat_id').unsigned().references('id').inTable('chats').onDelete('CASCADE')
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.unique(['channel_id', 'chat_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
