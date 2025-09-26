import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('title').notNullable()
      table
        .integer('last_message_id')
        .unsigned()
        .references('id')
        .inTable('messages')
        .nullable()
        .onDelete('SET NULL')
      table.integer('owner_id').unsigned().references('id').inTable('users').onDelete('SET NULL')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
