import Channel from '#models/channel'
import type { HttpContext } from '@adonisjs/core/http'

export default class ChannelsController {
  async createChannel({ request, response, auth }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const user_id = user['$attributes'].id

    const { name, description, is_private } = request.only(['name', 'description', 'is_private'])

    const exists = await Channel.query().where('name', name).first()

    if (exists) {
      return response.conflict({ message: 'Channel with this name already exists' })
    }

    const channel = await Channel.create({
      name,
      description,
      isPrivate: is_private || false,
      ownerId: user_id,
    })
    await channel.related('members').attach({
      [user_id]: {
        role: 'owner',
        reports: 0,
      },
    })
    return response.created({ channel })
  }

  async getAllChannels({}: HttpContext) {
    const channels = await Channel.query().preload('owner')
    return channels
  }

  async getChannelById({ params, response }: HttpContext) {
    const channel = await Channel.query().where('id', params.id).preload('owner').first()

    if (!channel) {
      return response.notFound({ message: 'Channel not found' })
    }

    return channel
  }

  async getAllUserChannels({ auth }: HttpContext) {
    const user = await auth.use('api').authenticate()

    const channels = await user
      .related('channels')
      .query()
      .select([
        'channels.id',
        'channels.name',
        'channels.is_private',
        'channels.owner_id',
        'channels.created_at',
      ])
      .pivotColumns(['role', 'reports'])
      .preload('owner', (ownerQuery) => {
        ownerQuery.select(['id', 'username'])
      })

    return channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      isPrivate: ch.isPrivate,
      ownerId: ch.ownerId,
      createdAt: ch.createdAt,
      owner: ch.owner ? { id: ch.owner.id, username: ch.owner.username } : null,
      role: ch.$extras.pivot_role,
      reports: ch.$extras.pivot_reports,
    }))
  }

  async getChatsByChannelId({ params, response }: HttpContext) {
    const channel = await Channel.query().where('id', params.id).preload('chats')

    return channel[0].$preloaded.chats
  }
}
