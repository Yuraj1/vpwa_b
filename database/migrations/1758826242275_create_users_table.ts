import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable()
      table.string('surname').notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.string('username').notNullable().unique()
      table.string('color').notNullable().defaultTo('#E0CA3C')
      table.boolean('notification').notNullable().defaultTo(true)
      // table.string('status').defaultTo('online')
      table
        .enum('status', ['online', 'offline', 'dnd'], {
          useNative: true,
          enumName: 'user_status',
          existingType: true,
        })
        .defaultTo('online')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
