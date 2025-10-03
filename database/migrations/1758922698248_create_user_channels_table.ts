import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_channels'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')

      table.timestamp('joined_at').notNullable().defaultTo(this.now())
      table
        .enum('role', ['member', 'owner'], {
          useNative: true,
          enumName: 'channel_member_role',
          existingType: true,
        })
        .notNullable()
        .defaultTo('member')

      table.integer('reports').unsigned().notNullable().defaultTo(0)
      table.specificType('kick_voters', 'int[]').notNullable().defaultTo('{}')
      table.boolean('banned').notNullable().defaultTo(false)

      table.unique(['user_id', 'channel_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
