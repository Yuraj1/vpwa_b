import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chat_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('messages_id')
        .unsigned()
        .references('id')
        .inTable('messages')
        .onDelete('CASCADE')
      table.integer('chat_id').unsigned().references('id').inTable('chats').onDelete('CASCADE')
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.unique(['messages_id', 'chat_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
