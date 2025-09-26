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
    const user_id = user['$attributes'].id
    const channels = await Channel.query()
      .select('name', 'createdAt', 'isPrivate', 'ownerId')
      .where('owner_id', user_id)
      .preload('owner', (ownerQuery) => {
        ownerQuery.select('username')
      })

    return channels
  }
}
